import { supabase } from '../config/supabase';
import { Lead, LeadActivity, Client, PaginatedResponse } from '../types';

export interface CreateLeadInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  trade_needed?: string;
  project_description?: string;
  address_line1?: string;
  city?: string;
  state_code?: string;
  zip_code?: string;
  estimated_budget?: number;
  source?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}

export interface AddActivityInput {
  activity_type: string;
  description?: string;
}

export const leadService = {
  /**
   * Returns a paginated list of leads with optional status/priority filters.
   */
  async list(contractorId: string, params: LeadListParams = {}): Promise<PaginatedResponse<Lead>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.status) query = query.eq('status', params.status);
    if (params.priority) query = query.eq('priority', params.priority);
    if (params.search) {
      query = query.or(
        `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      data: (data ?? []) as Lead[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Creates a new lead record.
   */
  async create(contractorId: string, input: CreateLeadInput): Promise<Lead> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('leads')
      .insert({ ...normalized, contractor_id: contractorId, assigned_at: new Date().toISOString() })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create lead');
    return data as Lead;
  },

  /**
   * Fetches a single lead, enforcing contractor ownership.
   */
  async getById(contractorId: string, leadId: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !data) throw new Error('Lead not found');
    return data as Lead;
  },

  /**
   * Updates a lead record and status.
   */
  async update(contractorId: string, leadId: string, input: Partial<CreateLeadInput> & { status?: Lead['status'] }): Promise<Lead> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('leads')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Lead not found');
    return data as Lead;
  },

  /**
   * Deletes a lead and its activity log.
   */
  async delete(contractorId: string, leadId: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /**
   * Appends an activity entry to the lead's log.
   */
  async addActivity(contractorId: string, leadId: string, input: AddActivityInput): Promise<LeadActivity> {
    await this.getById(contractorId, leadId);

    const { data, error } = await supabase
      .from('lead_activity')
      .insert({ ...input, lead_id: leadId, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add activity');
    return data as LeadActivity;
  },

  /**
   * Returns all activity entries for a lead.
   */
  async getActivity(contractorId: string, leadId: string): Promise<LeadActivity[]> {
    await this.getById(contractorId, leadId);

    const { data, error } = await supabase
      .from('lead_activity')
      .select('*')
      .eq('lead_id', leadId)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as LeadActivity[];
  },

  /**
   * Atomically converts a lead to a client. Sets lead status to "won" and
   * stores the resulting client reference.
   */
  async convert(contractorId: string, leadId: string): Promise<{ lead: Lead; client: Client }> {
    const lead = await this.getById(contractorId, leadId);

    if (lead.status === 'won' && lead.converted_to_client_id) {
      throw new Error('Lead has already been converted');
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        contractor_id: contractorId,
        first_name: lead.first_name ?? 'Unknown',
        last_name: lead.last_name ?? '',
        email: lead.email,
        phone: lead.phone,
        address_line1: lead.address_line1,
        city: lead.city,
        state_code: lead.state_code,
        zip_code: lead.zip_code,
        source: lead.source ?? 'lead_conversion',
        notes: lead.project_description,
      })
      .select()
      .single();

    if (clientError || !client) throw new Error(clientError?.message ?? 'Failed to create client');

    const { data: updatedLead, error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'won',
        converted_at: new Date().toISOString(),
        converted_to_client_id: client.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (leadError || !updatedLead) throw new Error(leadError?.message ?? 'Failed to update lead');

    await supabase.from('lead_activity').insert({
      lead_id: leadId,
      contractor_id: contractorId,
      activity_type: 'converted',
      description: `Converted to client ${client.id}`,
    });

    return { lead: updatedLead as Lead, client: client as Client };
  },
};
