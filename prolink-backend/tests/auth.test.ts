import request from 'supertest';
import app from '../src/index';

// Mock Supabase clients to avoid real network calls
jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
  supabaseAnon: {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));

import { supabase, supabaseAnon } from '../src/config/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockSupabaseAnon = supabaseAnon as jest.Mocked<typeof supabaseAnon>;

const mockProfile = {
  id: 'user-uuid',
  email: 'test@example.com',
  full_name: 'Test User',
  phone: null,
  avatar_url: null,
  role: 'contractor',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockContractor = {
  id: 'contractor-uuid',
  profile_id: 'user-uuid',
  business_name: 'Test Business',
  status: 'pending',
  verified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer',
};

function makeMockChain(returnValue: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'like', 'ilike', 'or', 'order', 'range', 'limit'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain['single'] = jest.fn().mockResolvedValue(returnValue);
  return chain;
}

describe('POST /api/v1/auth/register', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when Supabase createUser fails', async () => {
    (mockSupabase.auth.admin.createUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Email already taken' },
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      business_name: 'Test Business',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Email already taken');
  });

  it('returns 201 on successful registration', async () => {
    (mockSupabase.auth.admin.createUser as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: 'user-uuid', email: 'test@example.com' } },
      error: null,
    });

    const profileChain = makeMockChain({ data: mockProfile, error: null });
    const contractorChain = makeMockChain({ data: mockContractor, error: null });

    (mockSupabase.from as jest.Mock)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(contractorChain);

    (mockSupabaseAnon.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: {
        user: { id: 'user-uuid', email: 'test@example.com' },
        session: mockSession,
      },
      error: null,
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      business_name: 'Test Business',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('session');
    expect(res.body.data).toHaveProperty('contractor');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 400 for missing credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    (mockSupabaseAnon.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns 400 for missing refresh_token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    (mockSupabaseAnon.auth.refreshSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid refresh token' },
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'bad-token' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
