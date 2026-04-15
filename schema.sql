-- Core Tables (Shared)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'contractor', -- 'admin', 'builder', 'contractor'
  is_pro_member BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ProLink Differentiated Tables (Prefix: pl_)
CREATE TABLE IF NOT EXISTS public.pl_contractors (
  id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  rating DECIMAL DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  trade TEXT,
  phone TEXT,
  status TEXT DEFAULT 'New', -- 'New', 'Vetted', 'Blacklisted'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pl_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.pl_contractors(id),
  project_name TEXT,
  stage TEXT DEFAULT 'Lead', -- 'Lead', 'Proposal', 'Active', 'Completed'
  value DECIMAL DEFAULT 0.0,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pl_vetting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.pl_contractors(id),
  engine_result JSONB, -- Stores the automated audit report
  vetted_by UUID REFERENCES public.profiles(id),
  vetted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_vetting_records ENABLE ROW LEVEL SECURITY;

-- Helper function for role-based access
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- Profiles: Admin can do anything; Users can only read/update their own profile
CREATE POLICY "Admin has all access" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Contractors: Admin has all; Contractors can only access their own
CREATE POLICY "Admin has all access" ON public.pl_contractors FOR ALL USING (public.is_admin());
CREATE POLICY "Contractors can read own record" ON public.pl_contractors FOR SELECT USING (id = auth.uid());
CREATE POLICY "Contractors can update own record" ON public.pl_contractors FOR UPDATE USING (id = auth.uid());

-- Pipelines: Admin has all; Contractors can only access their own
CREATE POLICY "Admin has all access" ON public.pl_pipelines FOR ALL USING (public.is_admin());
CREATE POLICY "Contractors can access own pipelines" ON public.pl_pipelines FOR ALL USING (contractor_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.pl_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.pl_contractors(id),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.pl_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin has all access" ON public.pl_customers FOR ALL USING (public.is_admin());
CREATE POLICY "Contractors can access own customers" ON public.pl_customers FOR ALL USING (contractor_id = auth.uid());

