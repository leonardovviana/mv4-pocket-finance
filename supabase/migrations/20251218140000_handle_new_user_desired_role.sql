-- Permite escolher papel (admin/employee) no cadastro via raw_user_meta_data.desired_role.
-- Regra de segurança: se não existir nenhum admin ainda, o primeiro usuário SEMPRE vira admin.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  next_role TEXT;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data ->> 'desired_role', ''));

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    -- Garante que sempre exista pelo menos 1 admin
    next_role := 'admin';
  ELSIF requested_role IN ('admin', 'employee') THEN
    next_role := requested_role;
  ELSE
    next_role := 'employee';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', next_role);

  RETURN new;
END;
$$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
