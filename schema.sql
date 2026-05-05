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
  business_name TEXT,
  rating DECIMAL DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  trade TEXT,
  phone TEXT,
  status TEXT DEFAULT 'New', -- 'New', 'Vetted', 'Blacklisted', 'available', 'busy', 'on_break'
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  website TEXT,
  description TEXT,
  years_in_business INTEGER,
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

-- Clients/Customers table (used by CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Jobs/Tasks table (used by confirm-visit and workflow)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  images TEXT[], -- array of image URLs
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'active', 'completed'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_vetting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_contractor_id ON public.clients(contractor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contractor_id ON public.tasks(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pl_pipelines_contractor_id ON public.pl_pipelines(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pl_pipelines_stage ON public.pl_pipelines(stage);

-- RLS Policies
CREATE POLICY "Users can read own prolink info" ON public.pl_contractors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own prolink info" ON public.pl_contractors
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own prolink info" ON public.pl_contractors
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Contractors can CRUD their clients" ON public.clients
  FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Contractors can CRUD their tasks" ON public.tasks
  FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Contractors can CRUD their pipelines" ON public.pl_pipelines
  FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
