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

-- Basic RLS Policy: Pro members can read their own prolink info
CREATE POLICY "Users can read own prolink info" ON public.pl_contractors
  FOR SELECT USING (auth.uid() = id);
