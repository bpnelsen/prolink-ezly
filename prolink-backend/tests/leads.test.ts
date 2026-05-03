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
const mockUser = { id: 'user-uuid', email: 'test@example.com' };
const mockProfile = { id: 'user-uuid', email: 'test@example.com', role: 'contractor' };
const mockContractor = { id: 'contractor-uuid' };
const mockLead = {
  id: 'lead-uuid',
  contractor_id: 'contractor-uuid',
  first_name: 'Alice',
  last_name: 'Brown',
  status: 'new',
  priority: 'high',
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

describe('GET /api/v1/leads', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/leads');
    expect(res.status).toBe(401);
  });

  it('returns paginated leads', async () => {
    auth();
    const listChain = chain();
    listChain['range'] = jest.fn().mockResolvedValue({ data: [mockLead], count: 1, error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(listChain);

    const res = await request(app).get('/api/v1/leads').set('Authorization', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
});

describe('POST /api/v1/leads', () => {
  it('creates a lead', async () => {
    auth();
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockLead, error: null })
    );

    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', TOKEN)
      .send({ first_name: 'Alice', last_name: 'Brown', trade_needed: 'Plumbing' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('new');
  });
});

describe('POST /api/v1/leads/:id/convert', () => {
  it('returns 400 if lead already converted', async () => {
    auth();
    const convertedLead = { ...mockLead, status: 'won', converted_to_client_id: 'client-uuid' };
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: convertedLead, error: null })
    );

    const res = await request(app)
      .post('/api/v1/leads/lead-uuid/convert')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already been converted');
  });
});

describe('GET /api/v1/leads/:id/activity', () => {
  it('returns activity for a lead', async () => {
    auth();
    // getById
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockLead, error: null })
    );
    // getActivity
    const activityChain = chain();
    activityChain['order'] = jest.fn().mockResolvedValue({ data: [], error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(activityChain);

    const res = await request(app)
      .get('/api/v1/leads/lead-uuid/activity')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
