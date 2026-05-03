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
const mockJob = {
  id: 'job-uuid',
  contractor_id: 'contractor-uuid',
  title: 'Roof Repair',
  status: 'draft',
  priority: 'medium',
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

describe('GET /api/v1/jobs', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/jobs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/jobs', () => {
  it('returns 400 when title is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', TOKEN)
      .send({ description: 'No title' });
    expect(res.status).toBe(400);
  });

  it('creates a job successfully', async () => {
    auth();
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockJob, error: null })
    );

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', TOKEN)
      .send({ title: 'Roof Repair', trade: 'Roofing' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Roof Repair');
  });
});

describe('POST /api/v1/jobs/:id/confirm', () => {
  it('updates job status to review', async () => {
    auth();
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: { ...mockJob, status: 'review' }, error: null })
    );

    const res = await request(app)
      .post('/api/v1/jobs/job-uuid/confirm')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('review');
  });
});

describe('GET /api/v1/jobs/:id', () => {
  it('returns 404 for missing job', async () => {
    auth();
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: null, error: { message: 'not found' } })
    );

    const res = await request(app)
      .get('/api/v1/jobs/missing-id')
      .set('Authorization', TOKEN);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/jobs/:id/milestones', () => {
  it('returns 400 when title is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/jobs/job-uuid/milestones')
      .set('Authorization', TOKEN)
      .send({ due_date: '2026-06-01' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/jobs/:id/photos', () => {
  it('returns 400 when url is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/jobs/job-uuid/photos')
      .set('Authorization', TOKEN)
      .send({ caption: 'Before photo' });
    expect(res.status).toBe(400);
  });
});
