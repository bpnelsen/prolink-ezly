import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const clientService = {
  async list(contractorId: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('contractor_id', contractorId);
    if (error) throw error;
    return data;
  },

  async create(contractorId: string, clientData: any) {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...clientData, contractor_id: contractorId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
