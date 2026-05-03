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

const mockUser = { id: 'user-uuid', email: 'test@example.com' };
const mockProfile = { id: 'user-uuid', email: 'test@example.com', role: 'contractor' };
const mockContractor = { id: 'contractor-uuid', profile_id: 'user-uuid', business_name: 'Test Co' };

function setupAuth() {
  (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });

  const profileChain = buildChain({ data: mockProfile, error: null });
  const contractorAuthChain = buildChain({ data: mockContractor, error: null });

  (mockSupabase.from as jest.Mock)
    .mockReturnValueOnce(profileChain)   // profiles lookup in auth middleware
    .mockReturnValueOnce(contractorAuthChain); // contractors lookup in auth middleware
}

function buildChain(terminal: unknown) {
  const self: Record<string, jest.Mock> = {};
  const passthroughs = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit', 'like', 'ilike', 'or'];
  passthroughs.forEach((m) => { self[m] = jest.fn().mockReturnValue(self); });
  self['single'] = jest.fn().mockResolvedValue(terminal);
  return self;
}

describe('GET /api/v1/contractor/profile', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/contractor/profile');
    expect(res.status).toBe(401);
  });

  it('returns 403 when no contractor_id', async () => {
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const profileChain = buildChain({ data: mockProfile, error: null });
    // no contractor found → contractor_id undefined
    const noContractorChain = buildChain({ data: null, error: null });

    (mockSupabase.from as jest.Mock)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(noContractorChain);

    const res = await request(app)
      .get('/api/v1/contractor/profile')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(403);
  });

  it('returns 200 with valid auth and contractor', async () => {
    setupAuth();

    // Profile fetch in getProfile
    const contractorProfileChain = buildChain({ data: mockContractor, error: null });
    const profileDetailChain = buildChain({ data: mockProfile, error: null });

    const tradesChain = { ...buildChain(null), data: [], error: null };
    const areasChain = { ...buildChain(null), data: [], error: null };
    const licensesChain = { ...buildChain(null), data: [], error: null };
    const insuranceChain = { ...buildChain(null), data: [], error: null };

    // getProfile calls: contractors, profiles, trades, areas, licenses, insurance
    tradesChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });
    areasChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });
    licensesChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });
    insuranceChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });

    (mockSupabase.from as jest.Mock)
      .mockReturnValueOnce(contractorProfileChain)
      .mockReturnValueOnce(profileDetailChain)
      .mockReturnValueOnce(tradesChain)
      .mockReturnValueOnce(areasChain)
      .mockReturnValueOnce(licensesChain)
      .mockReturnValueOnce(insuranceChain);

    const res = await request(app)
      .get('/api/v1/contractor/profile')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('contractor');
  });
});

describe('POST /api/v1/contractor/trades', () => {
  it('returns 400 for missing trade field', async () => {
    setupAuth();
    const res = await request(app)
      .post('/api/v1/contractor/trades')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.status).toBe(400);
  });
});
