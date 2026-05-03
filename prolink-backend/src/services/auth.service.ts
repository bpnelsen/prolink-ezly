import { supabase, supabaseAnon } from '../config/supabase';
import { Profile, Contractor } from '../types';

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  business_name: string;
  business_type?: 'sole_proprietor' | 'llc' | 'corporation' | 'partnership';
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResult {
  user: Profile;
  contractor: Contractor;
  session: AuthSession;
}

export interface LoginResult {
  user: Profile;
  contractor: Contractor | null;
  session: AuthSession;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });

    if (createError) {
      throw new Error(`Admin CreateUser Error: ${createError.message}`);
    }
    
    if (!authData.user) {
      console.error('Auth User Creation Data:', JSON.stringify(authData, null, 2));
      throw new Error('Failed to create auth user: user data is null');
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: input.email,
        full_name: input.full_name,
        phone: input.phone ?? null,
        role: 'contractor',
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError || !profile) {
      console.error('Profile Error for User:', userId, profileError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(profileError?.message ?? 'Failed to create profile');
    }

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .upsert({
        profile_id: userId,
        business_name: input.business_name,
        business_type: input.business_type ?? null,
        status: 'pending',
      }, { onConflict: 'profile_id' })
      .select()
      .single();

    if (contractorError || !contractor) {
      console.error('Contractor Error for User:', userId, contractorError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(contractorError?.message ?? 'Failed to create contractor');
    }

    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError || !sessionData.session) {
      throw new Error('Registration succeeded but auto-login failed. Please log in manually.');
    }

    return {
      user: profile as Profile,
      contractor: contractor as Contractor,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in ?? 3600,
        token_type: 'Bearer',
      },
    };
  },

  async login(email: string, password: string): Promise<LoginResult> {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      throw new Error('Invalid email or password');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const { data: contractor } = await supabase
      .from('contractors')
      .select('*')
      .eq('profile_id', data.user.id)
      .single();

    return {
      user: profile as Profile,
      contractor: contractor as Contractor | null,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in ?? 3600,
        token_type: 'Bearer',
      },
    };
  },

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw new Error('Invalid or expired refresh token');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in ?? 3600,
      token_type: 'Bearer',
    };
  },

  async me(userId: string): Promise<{ profile: Profile; contractor: Contractor | null }> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('Profile not found');
    }

    const { data: contractor } = await supabase
      .from('contractors')
      .select('*')
      .eq('profile_id', userId)
      .single();

    return { profile: profile as Profile, contractor: (contractor as Contractor) ?? null };
  },
};
