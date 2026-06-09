-- Google OAuth stores full_name / name, not display_name. Use those for profile + team name.

CREATE OR REPLACE FUNCTION profile_name_from_metadata(meta JSONB, email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(meta->>'display_name'), ''),
    NULLIF(trim(meta->>'full_name'), ''),
    NULLIF(trim(meta->>'name'), ''),
    NULLIF(split_part(email, '@', 1), '')
  );
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := profile_name_from_metadata(NEW.raw_user_meta_data, NEW.email);

  INSERT INTO profiles (id, display_name, team_name)
  VALUES (NEW.id, v_name, v_name);

  RETURN NEW;
END;
$$;

-- Backfill Google / OAuth users missing a proper display or team name
UPDATE profiles p
SET
  display_name = profile_name_from_metadata(u.raw_user_meta_data, u.email),
  team_name = COALESCE(
    NULLIF(trim(p.team_name), ''),
    profile_name_from_metadata(u.raw_user_meta_data, u.email)
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    p.display_name IS NULL
    OR trim(p.display_name) = ''
    OR p.display_name = split_part(u.email, '@', 1)
    OR p.team_name IS NULL
    OR trim(p.team_name) = ''
  );
