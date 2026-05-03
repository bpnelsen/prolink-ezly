import { supabase } from '../config/supabase';
import { Invoice, InvoiceLineItem, Payment, PaginatedResponse } from '../types';

export interface LineItemInput {
  description: string;
  quantity?: number;
  unit_price: number;
  sort_order?: number;
}

export interface CreateInvoiceInput {
  client_id?: string;
  job_id?: string;
  issue_date?: string;
  due_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  line_items: LineItemInput[];
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
}

export interface AddPaymentInput {
  amount: number;
  payment_method?: string;
  stripe_payment_id?: string;
  reference_number?: string;
  notes?: string;
  paid_at?: string;
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

function computeTotals(
  lineItems: LineItemInput[],
  taxRate: number,
  discountAmount: number
): { subtotal: number; tax_amount: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = item.quantity ?? 1;
    return sum + qty * item.unit_price;
  }, 0);
  const tax_amount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax_amount - discountAmount) * 100) / 100;
  return { subtotal, tax_amount, total };
}

export const invoiceService = {
  /**
   * Generates the next invoice number in PRO-{YEAR}-{SEQUENCE} format.
   */
  async generateInvoiceNumber(contractorId: string): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)
      .like('invoice_number', `PRO-${year}-%`);

    const sequence = String((count ?? 0) + 1).padStart(5, '0');
    return `PRO-${year}-${sequence}`;
  },

  /**
   * Returns paginated invoices with optional filters.
   */
  async list(contractorId: string, params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.status) query = query.eq('status', params.status);
    if (params.client_id) query = query.eq('client_id', params.client_id);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      data: (data ?? []) as Invoice[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Creates an invoice and its line items in a single operation.
   * Invoice number is auto-generated.
   */
  async create(contractorId: string, input: CreateInvoiceInput): Promise<InvoiceWithLineItems> {
    const { line_items, tax_rate = 0, discount_amount = 0, ...rest } = input;
    const invoiceNumber = await this.generateInvoiceNumber(contractorId);
    const { subtotal, tax_amount, total } = computeTotals(line_items, tax_rate, discount_amount);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...rest,
        contractor_id: contractorId,
        invoice_number: invoiceNumber,
        tax_rate,
        tax_amount,
        discount_amount,
        subtotal,
        total,
        amount_paid: 0,
        balance_due: total,
      })
      .select()
      .single();

    if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? 'Failed to create invoice');

    const lineItemRows = line_items.map((item, idx) => ({
      invoice_id: invoice.id,
      contractor_id: contractorId,
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price,
      total: (item.quantity ?? 1) * item.unit_price,
      sort_order: item.sort_order ?? idx,
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemRows)
      .select();

    if (itemsError) throw new Error(itemsError.message);

    return { ...(invoice as Invoice), line_items: (createdItems ?? []) as InvoiceLineItem[] };
  },

  /**
   * Fetches a single invoice with its line items.
   */
  async getById(contractorId: string, invoiceId: string): Promise<InvoiceWithLineItems> {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !invoice) throw new Error('Invoice not found');

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order');

    return { ...(invoice as Invoice), line_items: (lineItems ?? []) as InvoiceLineItem[] };
  },

  /**
   * Updates invoice metadata (not line items; replace by delete/recreate if needed).
   */
  async update(
    contractorId: string,
    invoiceId: string,
    input: Partial<Omit<CreateInvoiceInput, 'line_items'>> & { status?: Invoice['status'] }
  ): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Invoice not found');
    return data as Invoice;
  },

  /**
   * Deletes a draft invoice. Non-draft invoices must be cancelled first.
   */
  async delete(contractorId: string, invoiceId: string): Promise<void> {
    const invoice = await this.getById(contractorId, invoiceId);
    if (!['draft', 'cancelled'].includes(invoice.status)) {
      throw new Error('Only draft or cancelled invoices can be deleted');
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /**
   * Marks an invoice as sent and records the timestamp.
   */
  async send(contractorId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.getById(contractorId, invoiceId);
    if (!['draft', 'sent'].includes(invoice.status)) {
      throw new Error('Only draft invoices can be sent');
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to send invoice');
    return data as Invoice;
  },

  /**
   * Records a payment against an invoice and recalculates balance/status.
   */
  async addPayment(contractorId: string, invoiceId: string, input: AddPaymentInput): Promise<Payment> {
    const invoice = await this.getById(contractorId, invoiceId);

    if (['paid', 'cancelled'].includes(invoice.status)) {
      throw new Error('Cannot add payment to a paid or cancelled invoice');
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        ...input,
        invoice_id: invoiceId,
        contractor_id: contractorId,
        paid_at: input.paid_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError || !payment) throw new Error(paymentError?.message ?? 'Failed to record payment');

    const newAmountPaid = invoice.amount_paid + input.amount;
    const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
    let newStatus: Invoice['status'] = 'partially_paid';
    if (newBalanceDue === 0) {
      newStatus = 'paid';
    } else if (invoice.status === 'sent' || invoice.status === 'viewed') {
      newStatus = 'partially_paid';
    }

    await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return payment as Payment;
  },

  /**
   * Returns all payments for an invoice.
   */
  async getPayments(contractorId: string, invoiceId: string): Promise<Payment[]> {
    await this.getById(contractorId, invoiceId);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('contractor_id', contractorId)
      .order('paid_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Payment[];
  },
};
