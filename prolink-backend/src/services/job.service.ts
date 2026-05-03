import { supabase } from '../config/supabase';
import { Job, JobMilestone, JobPhoto, JobDocument, PaginatedResponse } from '../types';

export interface CreateJobInput {
  client_id?: string;
  title: string;
  description?: string;
  trade?: string;
  priority?: 'low' | 'medium' | 'high';
  address_line1?: string;
  city?: string;
  state_code?: string;
  zip_code?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  estimated_value?: number;
  contract_url?: string;
}

export interface JobListParams {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  search?: string;
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  due_date?: string;
  payment_amount?: number;
  sort_order?: number;
}

export interface CreatePhotoInput {
  url: string;
  caption?: string;
  photo_type?: 'before' | 'progress' | 'after';
  taken_at?: string;
}

export interface CreateDocumentInput {
  name: string;
  url: string;
  document_type?: string;
}

export const jobService = {
  /**
   * Returns a paginated list of jobs with optional filters.
   */
  async list(contractorId: string, params: JobListParams = {}): Promise<PaginatedResponse<Job>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.status) query = query.eq('status', params.status);
    if (params.client_id) query = query.eq('client_id', params.client_id);
    if (params.search) query = query.ilike('title', `%${params.search}%`);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      data: (data ?? []) as Job[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Creates a new job.
   */
  async create(contractorId: string, input: CreateJobInput): Promise<Job> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...normalized, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create job');
    return data as Job;
  },

  /**
   * Fetches a single job with ownership check.
   */
  async getById(contractorId: string, jobId: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !data) throw new Error('Job not found');
    return data as Job;
  },

  /**
   * Updates a job record.
   */
  async update(
    contractorId: string,
    jobId: string,
    input: Partial<CreateJobInput> & { status?: Job['status']; actual_start?: string; actual_end?: string; contract_signed?: boolean }
  ): Promise<Job> {
    const normalized = input.state_code
      ? { ...input, state_code: input.state_code.toUpperCase() }
      : input;

    const { data, error } = await supabase
      .from('jobs')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Job not found');
    return data as Job;
  },

  /**
   * Deletes a job and its related records.
   */
  async delete(contractorId: string, jobId: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  // ─── Milestones ─────────────────────────────────────────────────────────────

  /** Returns all milestones for a job ordered by sort_order. */
  async getMilestones(contractorId: string, jobId: string): Promise<JobMilestone[]> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_milestones')
      .select('*')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .order('sort_order');

    if (error) throw new Error(error.message);
    return (data ?? []) as JobMilestone[];
  },

  /** Creates a milestone on a job. */
  async addMilestone(contractorId: string, jobId: string, input: CreateMilestoneInput): Promise<JobMilestone> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_milestones')
      .insert({ ...input, job_id: jobId, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create milestone');
    return data as JobMilestone;
  },

  /** Updates a milestone. */
  async updateMilestone(
    contractorId: string,
    jobId: string,
    milestoneId: string,
    input: Partial<CreateMilestoneInput> & { status?: JobMilestone['status']; completed_date?: string }
  ): Promise<JobMilestone> {
    const { data, error } = await supabase
      .from('job_milestones')
      .update(input)
      .eq('id', milestoneId)
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Milestone not found');
    return data as JobMilestone;
  },

  /** Deletes a milestone. */
  async deleteMilestone(contractorId: string, jobId: string, milestoneId: string): Promise<void> {
    const { error } = await supabase
      .from('job_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  // ─── Photos ──────────────────────────────────────────────────────────────────

  /** Attaches a photo record to a job. */
  async addPhoto(contractorId: string, jobId: string, input: CreatePhotoInput): Promise<JobPhoto> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_photos')
      .insert({ ...input, job_id: jobId, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add photo');
    return data as JobPhoto;
  },

  /** Returns all photos for a job. */
  async getPhotos(contractorId: string, jobId: string): Promise<JobPhoto[]> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as JobPhoto[];
  },

  /** Deletes a photo record. */
  async deletePhoto(contractorId: string, jobId: string, photoId: string): Promise<void> {
    const { error } = await supabase
      .from('job_photos')
      .delete()
      .eq('id', photoId)
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  // ─── Documents ───────────────────────────────────────────────────────────────

  /** Attaches a document record to a job. */
  async addDocument(contractorId: string, jobId: string, input: CreateDocumentInput): Promise<JobDocument> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_documents')
      .insert({ ...input, job_id: jobId, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add document');
    return data as JobDocument;
  },

  /** Returns all documents for a job. */
  async getDocuments(contractorId: string, jobId: string): Promise<JobDocument[]> {
    await this.getById(contractorId, jobId);
    const { data, error } = await supabase
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as JobDocument[];
  },

  /** Deletes a document record. */
  async deleteDocument(contractorId: string, jobId: string, documentId: string): Promise<void> {
    const { error } = await supabase
      .from('job_documents')
      .delete()
      .eq('id', documentId)
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },
};
