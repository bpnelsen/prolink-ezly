import request from 'supertest';
import app from '../src/index';

jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
  supabaseAnon: { auth: {} },
}));

import { supabase } from '../src/config/supabase';
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const TOKEN = 'Bearer valid-token';
const mockUser = { id: 'user-uuid' };
const mockProfile = { id: 'user-uuid', email: 'test@example.com', role: 'contractor' };
const mockContractor = { id: 'contractor-uuid' };

const mockInvoice = {
  id: 'invoice-uuid',
  contractor_id: 'contractor-uuid',
  invoice_number: 'PRO-2026-00001',
  status: 'draft',
  subtotal: 1000,
  tax_rate: 0,
  tax_amount: 0,
  discount_amount: 0,
  total: 1000,
  amount_paid: 0,
  balance_due: 1000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function chain(terminal?: unknown) {
  const self: Record<string, jest.Mock> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit', 'like', 'ilike', 'or'].forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self);
  });
  self['single'] = jest.fn().mockResolvedValue(terminal ?? { data: null, error: null });
  return self;
}

function auth() {
  (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser }, error: null });
  (mockSupabase.from as jest.Mock)
    .mockReturnValueOnce(chain({ data: mockProfile, error: null }))
    .mockReturnValueOnce(chain({ data: mockContractor, error: null }));
}

describe('POST /api/v1/invoices', () => {
  it('returns 400 when line_items is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', TOKEN)
      .send({ client_id: 'some-uuid' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when line_items is empty', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', TOKEN)
      .send({ line_items: [] });
    expect(res.status).toBe(400);
  });

  it('creates an invoice with auto-generated number', async () => {
    auth();

    // generateInvoiceNumber count query
    const countChain = chain();
    countChain['like'] = jest.fn().mockResolvedValue({ count: 0, error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(countChain);

    // invoice insert
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockInvoice, error: null })
    );

    // line items insert
    const lineItemsChain = chain();
    lineItemsChain['select'] = jest.fn().mockResolvedValue({
      data: [{ id: 'li-uuid', description: 'Labor', quantity: 1, unit_price: 1000, total: 1000 }],
      error: null,
    });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(lineItemsChain);

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', TOKEN)
      .send({
        line_items: [{ description: 'Labor', unit_price: 1000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice_number).toBe('PRO-2026-00001');
  });
});

describe('GET /api/v1/invoices', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/invoices');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/invoices/:id/send', () => {
  it('marks invoice as sent', async () => {
    auth();

    // getById: invoice + line_items
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockInvoice, error: null })
    );
    const lineItemsChain = chain();
    lineItemsChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(lineItemsChain);

    // update to sent
    const sentInvoice = { ...mockInvoice, status: 'sent', sent_at: new Date().toISOString() };
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: sentInvoice, error: null })
    );

    const res = await request(app)
      .post('/api/v1/invoices/invoice-uuid/send')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
  });
});
