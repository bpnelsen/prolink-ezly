import { supabase } from '../config/supabase';
import {
  Contractor,
  ContractorTrade,
  ContractorServiceArea,
  ContractorLicense,
  ContractorInsurance,
  Profile,
} from '../types';

export interface ContractorProfile {
  contractor: Contractor;
  profile: Profile;
  trades: ContractorTrade[];
  service_areas: ContractorServiceArea[];
  licenses: ContractorLicense[];
  insurance: ContractorInsurance[];
}

export interface UpdateContractorInput {
  business_name?: string;
  business_type?: 'sole_proprietor' | 'llc' | 'corporation' | 'partnership';
  ein?: string;
  website?: string;
  description?: string;
  founded_year?: number;
  employee_count?: number;
  full_name?: string;
  phone?: string;
}

export interface AddTradeInput {
  trade: string;
  years_experience?: number;
  is_primary?: boolean;
}

export interface AddServiceAreaInput {
  state_code: string;
  county?: string;
  zip_code?: string;
  radius_miles?: number;
}

export interface AddLicenseInput {
  state_code: string;
  license_type: string;
  license_number: string;
  issuing_authority?: string;
  issued_date?: string;
  expiration_date?: string;
  status?: 'active' | 'expired' | 'suspended' | 'pending';
  document_url?: string;
}

export interface AddInsuranceInput {
  insurance_type: 'general_liability' | 'workers_comp' | 'professional' | 'commercial_auto' | 'umbrella';
  provider?: string;
  policy_number?: string;
  coverage_amount?: number;
  expiration_date?: string;
  document_url?: string;
}

export const contractorService = {
  /**
   * Retrieves full contractor profile including trades, service areas, licenses, and insurance.
   */
  async getProfile(profileId: string): Promise<ContractorProfile> {
    const { data: contractor, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error || !contractor) throw new Error('Contractor not found');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    const [tradesRes, areasRes, licensesRes, insuranceRes] = await Promise.all([
      supabase.from('contractor_trades').select('*').eq('contractor_id', contractor.id).order('created_at'),
      supabase.from('contractor_service_areas').select('*').eq('contractor_id', contractor.id).order('created_at'),
      supabase.from('contractor_licenses').select('*').eq('contractor_id', contractor.id).order('created_at'),
      supabase.from('contractor_insurance').select('*').eq('contractor_id', contractor.id).order('created_at'),
    ]);

    return {
      contractor: contractor as Contractor,
      profile: profile as Profile,
      trades: (tradesRes.data ?? []) as ContractorTrade[],
      service_areas: (areasRes.data ?? []) as ContractorServiceArea[],
      licenses: (licensesRes.data ?? []) as ContractorLicense[],
      insurance: (insuranceRes.data ?? []) as ContractorInsurance[],
    };
  },

  /**
   * Updates contractor and associated profile fields.
   */
  async updateProfile(contractorId: string, profileId: string, input: UpdateContractorInput): Promise<ContractorProfile> {
    const { full_name, phone, ...contractorFields } = input;

    const updates: Promise<unknown>[] = [];

    if (Object.keys(contractorFields).length > 0) {
      updates.push(
        supabase.from('contractors').update({ ...contractorFields, updated_at: new Date().toISOString() }).eq('id', contractorId)
      );
    }

    if (full_name !== undefined || phone !== undefined) {
      const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (phone !== undefined) profileUpdate.phone = phone;
      updates.push(supabase.from('profiles').update(profileUpdate).eq('id', profileId));
    }

    await Promise.all(updates);
    return this.getProfile(profileId);
  },

  /** Adds a trade to the contractor. */
  async addTrade(contractorId: string, input: AddTradeInput): Promise<ContractorTrade> {
    const { data, error } = await supabase
      .from('contractor_trades')
      .insert({ ...input, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add trade');
    return data as ContractorTrade;
  },

  /** Removes a trade, validating ownership. */
  async deleteTrade(contractorId: string, tradeId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_trades')
      .delete()
      .eq('id', tradeId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /** Adds a geographic service area. */
  async addServiceArea(contractorId: string, input: AddServiceAreaInput): Promise<ContractorServiceArea> {
    const normalized = { ...input, state_code: input.state_code.toUpperCase() };
    const { data, error } = await supabase
      .from('contractor_service_areas')
      .insert({ ...normalized, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add service area');
    return data as ContractorServiceArea;
  },

  /** Removes a service area, validating ownership. */
  async deleteServiceArea(contractorId: string, areaId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_service_areas')
      .delete()
      .eq('id', areaId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /** Adds a state-issued license. */
  async addLicense(contractorId: string, input: AddLicenseInput): Promise<ContractorLicense> {
    const normalized = { ...input, state_code: input.state_code.toUpperCase() };
    const { data, error } = await supabase
      .from('contractor_licenses')
      .insert({ ...normalized, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add license');
    return data as ContractorLicense;
  },

  /** Updates a license record. */
  async updateLicense(contractorId: string, licenseId: string, input: Partial<AddLicenseInput>): Promise<ContractorLicense> {
    const normalized = input.state_code ? { ...input, state_code: input.state_code.toUpperCase() } : input;
    const { data, error } = await supabase
      .from('contractor_licenses')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', licenseId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'License not found');
    return data as ContractorLicense;
  },

  /** Deletes a license. */
  async deleteLicense(contractorId: string, licenseId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_licenses')
      .delete()
      .eq('id', licenseId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },

  /** Adds an insurance policy record. */
  async addInsurance(contractorId: string, input: AddInsuranceInput): Promise<ContractorInsurance> {
    const { data, error } = await supabase
      .from('contractor_insurance')
      .insert({ ...input, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add insurance');
    return data as ContractorInsurance;
  },

  /** Updates an insurance record. */
  async updateInsurance(contractorId: string, insuranceId: string, input: Partial<AddInsuranceInput>): Promise<ContractorInsurance> {
    const { data, error } = await supabase
      .from('contractor_insurance')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', insuranceId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Insurance record not found');
    return data as ContractorInsurance;
  },

  /** Deletes an insurance record. */
  async deleteInsurance(contractorId: string, insuranceId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_insurance')
      .delete()
      .eq('id', insuranceId)
      .eq('contractor_id', contractorId);

    if (error) throw new Error(error.message);
  },
};
