// Provide minimal env vars for tests so env.ts doesn't exit(1)
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.APP_URL = 'http://localhost:3001';
process.env.FRONTEND_URL = 'http://localhost:3000';
