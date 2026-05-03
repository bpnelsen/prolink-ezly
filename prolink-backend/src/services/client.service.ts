import { supabase } from '../config/supabase';
import { Client, ClientNote, PaginatedResponse } from '../types';

export interface CreateClientInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_code?: string;
  zip_code?: string;
  source?: string;
  tags?: string[];
  notes?: string;
}

export interface ClientListParams {
  page?: number;
  limit?: number;
  search?: string;
  state_code?: string;
  source?: string;
}

export const clientService = {
  /**
   * Returns a paginated list of clients for the contractor with optional filters.
   */
  async list(contractorId: string, params: ClientListParams = {}): Promise<PaginatedResponse<Client>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.search) {
      query = query.or(
        `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
      );
    }
    if (params.state_code) query = query.eq('state_code', params.state_code.toUpperCase());
    if (params.source) query = query.eq('source', params.source);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      data: (data ?? []) as Client[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Creates a new client for the contractor.
   */
  async create(contractorId: string, input: CreateClientInput): Promise<Client> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...normalized, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create client');
    return data as Client;
  },

  /**
   * Fetches a single client, enforcing contractor ownership.
   */
  async getById(contractorId: string, clientId: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !data) throw new Error('Client not found');
    return data as Client;
  },

  /**
   * Updates a client record.
   */
  async update(contractorId: string, clientId: string, input: Partial<CreateClientInput>): Promise<Client> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('clients')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Client not found');
    return data as Client;
  },

  /**
   * Deletes a client record.
   */
  async delete(contractorId: string, clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /**
   * Adds a note to a client record.
   */
  async addNote(contractorId: string, clientId: string, note: string): Promise<ClientNote> {
    // Verify ownership first
    await this.getById(contractorId, clientId);

    const { data, error } = await supabase
      .from('client_notes')
      .insert({ client_id: clientId, contractor_id: contractorId, note })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add note');
    return data as ClientNote;
  },

  /**
   * Returns all notes for a client.
   */
  async getNotes(contractorId: string, clientId: string): Promise<ClientNote[]> {
    await this.getById(contractorId, clientId);

    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ClientNote[];
  },
};
