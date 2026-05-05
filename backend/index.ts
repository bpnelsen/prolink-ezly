import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Placeholder for logic
app.get('/api/v1/clients', async (req, res) => {
  const { data, error } = await supabase.from('clients').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

app.listen(3000, () => console.log('Prolink Backend V2 running on port 3000'));
