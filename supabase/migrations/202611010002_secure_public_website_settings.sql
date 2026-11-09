BEGIN;

DO $preflight$
DECLARE
  target_view oid;
  target_view_kind "char";
  column_count integer;
  admin_policy_count integer;
  public_policy_count integer;
  existing_function oid;
  existing_function_result text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'website_settings'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: public.website_settings is missing or RLS is not enabled.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_settings'
      AND policyname NOT IN (
        'Public can read public website settings',
        'Admins manage website settings'
      )
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: unrecognized RLS policies exist on public.website_settings. Review them; none were removed.';
  END IF;

  SELECT count(*)
  INTO admin_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'website_settings'
    AND policyname = 'Admins manage website settings'
    AND permissive = 'PERMISSIVE'
    AND cmd = 'ALL'
    AND roles = ARRAY['authenticated']::name[]
    AND pg_catalog.regexp_replace(
          pg_catalog.lower(qual),
          '[[:space:]()]',
          '',
          'g'
        ) IN (
          'selectis_adminasis_admin',
          'selectpublic.is_adminasis_admin'
        )
    AND pg_catalog.regexp_replace(
          pg_catalog.lower(with_check),
          '[[:space:]()]',
          '',
          'g'
        ) IN (
          'selectis_adminasis_admin',
          'selectpublic.is_adminasis_admin'
        );

  IF admin_policy_count <> 1 THEN
    RAISE EXCEPTION
      'Preflight failed: the expected Admin-only policy is missing or differs from its expected definition.';
  END IF;

  SELECT count(*)
  INTO public_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'website_settings'
    AND policyname = 'Public can read public website settings'
    AND permissive = 'PERMISSIVE'
    AND cmd = 'SELECT'
    AND cardinality(roles) = 2
    AND roles @> ARRAY['anon', 'authenticated']::name[];

  IF public_policy_count <> 1 THEN
    RAISE EXCEPTION
      'Preflight failed: the expected public-read policy is missing or has unexpected roles or command.';
  END IF;

  target_view := pg_catalog.to_regclass('public.public_website_settings');

  IF target_view IS NOT NULL THEN
    SELECT c.relkind
    INTO target_view_kind
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = target_view;

    IF target_view_kind <> 'v' THEN
      RAISE EXCEPTION
        'Preflight failed: public.public_website_settings exists but is not an ordinary view.';
    END IF;

    SELECT count(*)
    INTO column_count
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = target_view
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF column_count <> 2
       OR NOT EXISTS (
         SELECT 1
         FROM pg_catalog.pg_attribute AS a
         WHERE a.attrelid = target_view
           AND a.attnum = 1
           AND a.attname = 'key'
           AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'text'
       )
       OR NOT EXISTS (
         SELECT 1
         FROM pg_catalog.pg_attribute AS a
         WHERE a.attrelid = target_view
           AND a.attnum = 2
           AND a.attname = 'value'
           AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'jsonb'
       ) THEN
      RAISE EXCEPTION
        'Preflight failed: existing public.public_website_settings columns are not exactly key text, value jsonb.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_depend AS d
      JOIN pg_catalog.pg_rewrite AS rw
        ON d.classid = 'pg_catalog.pg_rewrite'::regclass
       AND rw.oid = d.objid
      WHERE d.refclassid = 'pg_catalog.pg_class'::regclass
        AND d.refobjid = target_view
        AND rw.ev_class <> target_view
    ) THEN
      RAISE EXCEPTION
        'Preflight failed: dependent views reference public.public_website_settings. Review dependencies before replacing it.';
    END IF;
  END IF;

  existing_function :=
    pg_catalog.to_regprocedure('public.get_public_website_settings()');

  IF existing_function IS NOT NULL THEN
    SELECT pg_catalog.pg_get_function_result(existing_function)
    INTO existing_function_result;

    IF pg_catalog.regexp_replace(
         pg_catalog.lower(existing_function_result),
         '[[:space:]]',
         '',
         'g'
       ) <> 'table(keytext,valuejsonb)' THEN
      RAISE EXCEPTION
        'Preflight failed: existing public.get_public_website_settings() has an incompatible result type.';
    END IF;
  END IF;
END;
$preflight$;

-- Remove every table-level privilege from PUBLIC and anon, including
-- REFERENCES, TRIGGER, and TRUNCATE.
REVOKE ALL PRIVILEGES
  ON TABLE public.website_settings
  FROM PUBLIC, anon;

-- Table-level revocation does not remove independent column-level grants.
REVOKE SELECT (key, value, updated_at, updated_by),
       INSERT (key, value, updated_at, updated_by),
       UPDATE (key, value, updated_at, updated_by),
       REFERENCES (key, value, updated_at, updated_by)
  ON TABLE public.website_settings
  FROM PUBLIC, anon;

-- Admins need CRUD, but not table-level REFERENCES, TRIGGER, or TRUNCATE.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.website_settings
  FROM authenticated;

-- Explicitly remove the existing authenticated column-level REFERENCES grant.
REVOKE REFERENCES (key, value, updated_at, updated_by)
  ON TABLE public.website_settings
  FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_public_website_settings()
RETURNS TABLE (key text, value jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    s.key,
    CASE s.key
      WHEN 'business' THEN pg_catalog.jsonb_build_object(
        'business_name', s.value -> 'business_name',
        'logo_text', s.value -> 'logo_text',
        'logo_url', s.value -> 'logo_url',
        'whatsapp_number', s.value -> 'whatsapp_number',
        'phone_number', s.value -> 'phone_number',
        'email', s.value -> 'email',
        'address', s.value -> 'address',
        'address_ur', s.value -> 'address_ur',
        'maps_url', s.value -> 'maps_url',
        'instagram_url', s.value -> 'instagram_url'
      )
      WHEN 'home' THEN pg_catalog.jsonb_build_object(
        'banner_heading_en', s.value -> 'banner_heading_en',
        'banner_heading_ur', s.value -> 'banner_heading_ur',
        'banner_description_en', s.value -> 'banner_description_en',
        'banner_description_ur', s.value -> 'banner_description_ur',
        'banner_image_url', s.value -> 'banner_image_url'
      )
      WHEN 'about' THEN pg_catalog.jsonb_build_object(
        'body_en', s.value -> 'body_en',
        'body_ur', s.value -> 'body_ur',
        'footer_en', s.value -> 'footer_en',
        'footer_ur', s.value -> 'footer_ur'
      )
    END AS value
  FROM public.website_settings AS s
  WHERE s.key IN ('business', 'home', 'about');
$function$;

ALTER FUNCTION public.get_public_website_settings() OWNER TO postgres;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.get_public_website_settings()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.get_public_website_settings()
  TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_website_settings
WITH (security_invoker = true)
AS
SELECT key, value
FROM public.get_public_website_settings();

REVOKE ALL PRIVILEGES
  ON TABLE public.public_website_settings
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.public_website_settings
  TO anon, authenticated;

-- Authenticated users need table privileges for Admin CRUD. The preserved
-- Admin RLS policy remains the row-level authorization boundary.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.website_settings
  TO authenticated;

-- Remove only the known public-read policy; the Admin policy is preserved.
DROP POLICY "Public can read public website settings"
  ON public.website_settings;

COMMIT;

-- Verification: RLS status and the remaining policies.
SELECT
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'website_settings';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'website_settings'
ORDER BY policyname;

-- Verification: effective table privileges. anon should have none;
-- authenticated should have CRUD but not REFERENCES, TRIGGER, or TRUNCATE.
SELECT
  role_name,
  has_table_privilege(role_name, 'public.website_settings', 'SELECT') AS can_select,
  has_table_privilege(role_name, 'public.website_settings', 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.website_settings', 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.website_settings', 'DELETE') AS can_delete,
  has_table_privilege(role_name, 'public.website_settings', 'TRUNCATE') AS can_truncate,
  has_table_privilege(role_name, 'public.website_settings', 'REFERENCES') AS can_reference,
  has_table_privilege(role_name, 'public.website_settings', 'TRIGGER') AS can_trigger
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);

-- Verification: remaining direct column privileges.
SELECT
  grantee,
  column_name,
  privilege_type,
  is_grantable
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'website_settings'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY grantee, column_name, privilege_type;

-- Verification: view security mode, columns, and public role SELECT access.
SELECT
  c.oid::regclass AS relation,
  c.reloptions,
  pg_catalog.pg_get_viewdef(c.oid, true) AS view_definition,
  (
    SELECT pg_catalog.string_agg(
      a.attname || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod),
      ', ' ORDER BY a.attnum
    )
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = c.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS columns
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'public_website_settings';

SELECT
  role_name,
  has_table_privilege(
    role_name,
    'public.public_website_settings',
    'SELECT'
  ) AS can_select_view
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);

-- Verification: function ownership, security mode, fixed search_path,
-- and execution rights.
SELECT
  p.oid::regprocedure AS function_signature,
  pg_catalog.pg_get_userbyid(p.proowner) AS function_owner,
  pg_catalog.pg_get_function_result(p.oid) AS function_result,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_catalog.pg_proc AS p
WHERE p.oid = pg_catalog.to_regprocedure(
  'public.get_public_website_settings()'
);

-- Verification: list only exposed key/property names, not setting values.
SELECT
  settings.key,
  pg_catalog.jsonb_object_keys(settings.value) AS exposed_property
FROM public.public_website_settings AS settings
ORDER BY settings.key, exposed_property;
