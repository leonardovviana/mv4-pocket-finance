-- Fix PostgREST visibility for accounts_payable (requires GRANTs)

-- Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Table grants (PostgREST checks privileges)
DO $$
BEGIN
	IF to_regclass('public.accounts_payable') IS NOT NULL THEN
		GRANT ALL ON TABLE public.accounts_payable TO service_role;
		GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts_payable TO authenticated;
	END IF;
END $$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
