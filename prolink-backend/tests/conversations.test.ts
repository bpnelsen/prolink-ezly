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

const mockConversation = {
  id: 'conv-uuid',
  contractor_id: 'contractor-uuid',
  subject: 'Project discussion',
  status: 'active',
  created_at: new Date().toISOString(),
};

const mockMessage = {
  id: 'msg-uuid',
  conversation_id: 'conv-uuid',
  contractor_id: 'contractor-uuid',
  sender_id: 'user-uuid',
  body: 'Hello!',
  message_type: 'text',
  is_read: false,
  created_at: new Date().toISOString(),
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

describe('GET /api/v1/conversations', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.status).toBe(401);
  });

  it('returns conversations list', async () => {
    auth();
    const listChain = chain();
    listChain['order'] = jest.fn().mockResolvedValue({ data: [mockConversation], error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(listChain);

    const res = await request(app).get('/api/v1/conversations').set('Authorization', TOKEN);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/v1/conversations', () => {
  it('creates a conversation', async () => {
    auth();
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockConversation, error: null })
    );

    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', TOKEN)
      .send({ subject: 'Project discussion' });

    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBe('Project discussion');
  });
});

describe('POST /api/v1/conversations/:id/messages', () => {
  it('returns 400 for empty body', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/conversations/conv-uuid/messages')
      .set('Authorization', TOKEN)
      .send({ body: '' });
    expect(res.status).toBe(400);
  });

  it('sends a message', async () => {
    auth();

    // getConversation check
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockConversation, error: null })
    );
    // insert message
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(
      chain({ data: mockMessage, error: null })
    );
    // update last_message_at
    const updateChain = chain();
    updateChain['eq'] = jest.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as jest.Mock).mockReturnValueOnce(updateChain);

    const res = await request(app)
      .post('/api/v1/conversations/conv-uuid/messages')
      .set('Authorization', TOKEN)
      .send({ body: 'Hello!' });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe('Hello!');
  });
});
