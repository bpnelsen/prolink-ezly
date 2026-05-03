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

function chain(terminal?: unknown) {
  const self: Record<string, jest.Mock> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit', 'like', 'ilike', 'or', 'gte', 'lt'].forEach((m) => {
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

describe('GET /api/v1/dashboard/summary', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('returns summary object', async () => {
    auth();

    // jobs
    const jobsChain = chain();
    jobsChain['eq'] = jest.fn().mockResolvedValue({ data: [{ status: 'draft' }, { status: 'in_progress' }], error: null });
    // clients
    const clientsChain = chain();
    clientsChain['eq'] = jest.fn().mockResolvedValue({ count: 5, error: null });
    // leads
    const leadsChain = chain();
    leadsChain['eq'] = jest.fn().mockResolvedValue({ data: [{ status: 'new' }], error: null });
    // invoices
    const invoicesChain = chain();
    invoicesChain['eq'] = jest.fn().mockResolvedValue({ data: [{ status: 'sent', balance_due: 500 }], error: null });
    // payments
    const paymentsChain = chain();
    paymentsChain['eq'] = jest.fn().mockResolvedValue({ data: [{ amount: 1000 }], error: null });

    (mockSupabase.from as jest.Mock)
      .mockReturnValueOnce(jobsChain)
      .mockReturnValueOnce(clientsChain)
      .mockReturnValueOnce(leadsChain)
      .mockReturnValueOnce(invoicesChain)
      .mockReturnValueOnce(paymentsChain);

    const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('jobs');
    expect(res.body.data).toHaveProperty('clients');
    expect(res.body.data).toHaveProperty('invoices');
  });
});

describe('GET /api/v1/dashboard/revenue', () => {
  it('returns revenue data', async () => {
    auth();

    const revenueChain = chain();
    revenueChain['lt'] = jest.fn().mockResolvedValue({ data: [], error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(revenueChain);

    const res = await request(app)
      .get('/api/v1/dashboard/revenue?year=2026')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(12);
  });
});

describe('GET /api/v1/dashboard/leads', () => {
  it('returns lead funnel', async () => {
    auth();

    const leadsChain = chain();
    leadsChain['eq'] = jest.fn().mockResolvedValue({ data: [{ status: 'new' }, { status: 'contacted' }], error: null });

    const recentChain = chain();
    recentChain['limit'] = jest.fn().mockResolvedValue({ data: [], error: null });

    (mockSupabase.from as jest.Mock)
      .mockReturnValueOnce(leadsChain)
      .mockReturnValueOnce(recentChain);

    const res = await request(app).get('/api/v1/dashboard/leads').set('Authorization', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('funnel');
    expect(res.body.data).toHaveProperty('recent');
  });
});
