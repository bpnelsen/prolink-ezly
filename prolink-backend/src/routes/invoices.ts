import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { invoiceService } from '../services/invoice.service';
import { requireAuth, requireContractor } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth, requireContractor);

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit_price: z.number().min(0),
  sort_order: z.number().int().optional(),
});

const createInvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

const updateInvoiceSchema = z.object({
  client_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string().optional(),
  stripe_payment_id: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  paid_at: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await invoiceService.list(req.user!.contractor_id!, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: req.query.status as string | undefined,
      client_id: req.query.client_id as string | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch invoices' });
  }
});

router.post('/', validate(createInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.create(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: invoice, message: 'Invoice created' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create invoice' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.getById(req.user!.contractor_id!, req.params.id);
    res.json({ data: invoice });
  } catch (err) {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

router.put('/:id', validate(updateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.update(req.user!.contractor_id!, req.params.id, req.body);
    res.json({ data: invoice, message: 'Invoice updated' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update invoice' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await invoiceService.delete(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete invoice' });
  }
});

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.send(req.user!.contractor_id!, req.params.id);
    res.json({ data: invoice, message: 'Invoice sent' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to send invoice' });
  }
});

router.post('/:id/payments', validate(paymentSchema), async (req: Request, res: Response) => {
  try {
    const payment = await invoiceService.addPayment(req.user!.contractor_id!, req.params.id, req.body);
    res.status(201).json({ data: payment, message: 'Payment recorded' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to record payment' });
  }
});

router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await invoiceService.getPayments(req.user!.contractor_id!, req.params.id);
    res.json({ data: payments });
  } catch (err) {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

export default router;
