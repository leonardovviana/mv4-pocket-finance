-- Role-based access: admins see/manage everything; employees can only work with their own service entries.

-- 1) Profiles role
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles
SET role = 'employee'
WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'employee';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'employee'));
  END IF;
END $$;

-- 2) is_admin() helper (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3) Update signup trigger to assign admin only to the first ever user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  next_role TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    next_role := 'employee';
  ELSE
    next_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', next_role);

  RETURN new;
END;
$$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
