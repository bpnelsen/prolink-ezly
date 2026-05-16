-- Migration 012: Stop trusting client-supplied role at signup.
-- Run in the Supabase SQL editor AFTER migration 011.
--
-- `handle_new_user` (migration 006) copied raw_user_meta_data->>'role' into
-- profiles.role. Supabase signUp lets the client set user_metadata freely, so
-- a user could self-assign any role. The platform admin gate is now an
-- email allowlist enforced server-side (see lib/server-auth.ts:requireAdmin),
-- so role is no longer a security boundary — but we still pin new signups to
-- 'contractor' as defense-in-depth. Existing roles are left untouched
-- (ON CONFLICT DO NOTHING / no UPDATE here).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'contractor'                       -- never trust client-supplied role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, business_name, owner_name, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger from migration 006 already points at this function; no change needed.
