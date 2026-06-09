-- World Cup 2026 Predictor — initial schema

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Friend groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code CHAR(6) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX groups_invite_code_idx ON groups(invite_code);

-- Group membership
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX group_members_group_id_idx ON group_members(group_id);
CREATE INDEX group_members_user_id_idx ON group_members(user_id);

-- Tournament matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL DEFAULT 'group',
  group_label CHAR(1) NOT NULL,
  team_home TEXT NOT NULL,
  team_away TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'started', 'finished')),
  result_home INT,
  result_away INT,
  winner TEXT CHECK (winner IN ('home', 'away', 'draw')),
  match_number INT NOT NULL DEFAULT 1
);

CREATE INDEX matches_group_label_idx ON matches(group_label);
CREATE INDEX matches_status_idx ON matches(status);

-- Group stage winners (set by admin when group concludes)
CREATE TABLE group_results (
  group_label CHAR(1) PRIMARY KEY,
  winner_team TEXT NOT NULL
);

-- User predictions (match + group winner)
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  predicted_winner TEXT CHECK (predicted_winner IN ('home', 'away', 'draw')),
  predicted_home_score INT,
  predicted_away_score INT,
  group_winner_label CHAR(1),
  predicted_group_winner_team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prediction_type_check CHECK (
    (match_id IS NOT NULL AND predicted_winner IS NOT NULL AND group_winner_label IS NULL)
    OR (match_id IS NULL AND group_winner_label IS NOT NULL AND predicted_group_winner_team IS NOT NULL)
  ),
  UNIQUE (user_id, group_id, match_id),
  UNIQUE (user_id, group_id, group_winner_label)
);

CREATE INDEX predictions_user_group_idx ON predictions(user_id, group_id);
CREATE INDEX predictions_match_idx ON predictions(match_id);

-- Admin password (set this in Supabase dashboard to match VITE_ADMIN_PASSWORD)
CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  admin_password TEXT NOT NULL DEFAULT 'changeme'
);

INSERT INTO app_settings (admin_password) VALUES ('changeme');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: is user a member of a group?
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- Leaderboard view (security invoker so RLS applies)
CREATE OR REPLACE VIEW leaderboard
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.group_id,
  COALESCE(SUM(
    CASE
      WHEN p.match_id IS NOT NULL
        AND m.status = 'finished'
        AND p.predicted_winner IS NOT NULL
        AND p.predicted_winner = m.winner
      THEN 2 ELSE 0
    END
    +
    CASE
      WHEN p.match_id IS NOT NULL
        AND m.status = 'finished'
        AND p.predicted_home_score IS NOT NULL
        AND p.predicted_away_score IS NOT NULL
        AND m.result_home IS NOT NULL
        AND m.result_away IS NOT NULL
        AND p.predicted_home_score = m.result_home
        AND p.predicted_away_score = m.result_away
      THEN 1 ELSE 0
    END
    +
    CASE
      WHEN p.match_id IS NULL
        AND gr.winner_team IS NOT NULL
        AND p.predicted_group_winner_team = gr.winner_team
      THEN 5 ELSE 0
    END
  ), 0)::INT AS total_points,
  COUNT(*) FILTER (
    WHERE p.match_id IS NOT NULL
      AND m.status = 'finished'
      AND p.predicted_winner = m.winner
  )::INT AS correct_match_predictions,
  COUNT(*) FILTER (
    WHERE p.match_id IS NULL
      AND gr.winner_team IS NOT NULL
      AND p.predicted_group_winner_team = gr.winner_team
  )::INT AS correct_group_winner_predictions
FROM predictions p
LEFT JOIN matches m ON p.match_id = m.id
LEFT JOIN group_results gr ON p.group_winner_label = gr.group_label
GROUP BY p.user_id, p.group_id;

-- Join group by invite code (bypasses RLS for lookup)
CREATE OR REPLACE FUNCTION join_group_by_invite(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT id INTO v_group_id FROM groups WHERE invite_code = upper(p_invite_code);
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

-- Admin RPC: verify password
CREATE OR REPLACE FUNCTION verify_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_password = (SELECT admin_password FROM app_settings WHERE id = 1);
$$;

-- Admin RPC: update match result
CREATE OR REPLACE FUNCTION admin_update_match(
  p_password TEXT,
  p_match_id UUID,
  p_result_home INT,
  p_result_away INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner TEXT;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  IF p_result_home > p_result_away THEN
    v_winner := 'home';
  ELSIF p_result_away > p_result_home THEN
    v_winner := 'away';
  ELSE
    v_winner := 'draw';
  END IF;

  UPDATE matches
  SET
    result_home = p_result_home,
    result_away = p_result_away,
    winner = v_winner,
    status = 'finished'
  WHERE id = p_match_id;
END;
$$;

-- Admin RPC: mark match as started
CREATE OR REPLACE FUNCTION admin_mark_match_started(
  p_password TEXT,
  p_match_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  UPDATE matches SET status = 'started' WHERE id = p_match_id;
END;
$$;

-- Admin RPC: set group winner
CREATE OR REPLACE FUNCTION admin_set_group_winner(
  p_password TEXT,
  p_group_label CHAR(1),
  p_winner_team TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  INSERT INTO group_results (group_label, winner_team)
  VALUES (p_group_label, p_winner_team)
  ON CONFLICT (group_label) DO UPDATE SET winner_team = EXCLUDED.winner_team;
END;
$$;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Groups
CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT TO authenticated
  USING (is_group_member(id));

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Group members
CREATE POLICY "Members can view group members"
  ON group_members FOR SELECT TO authenticated
  USING (is_group_member(group_id));

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Matches (read-only for users)
CREATE POLICY "Authenticated users can view matches"
  ON matches FOR SELECT TO authenticated USING (true);

-- Group results (read-only for users)
CREATE POLICY "Authenticated users can view group results"
  ON group_results FOR SELECT TO authenticated USING (true);

-- Predictions (group members can read all predictions in their group for leaderboard)
CREATE POLICY "Members can view group predictions"
  ON predictions FOR SELECT TO authenticated
  USING (is_group_member(group_id));

CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_group_member(group_id));

CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions"
  ON predictions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- App settings: no direct access (only via RPC)
CREATE POLICY "No direct access to app_settings"
  ON app_settings FOR ALL TO authenticated USING (false);

GRANT SELECT ON leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION join_group_by_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_match(TEXT, UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_match_started(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_group_winner(TEXT, CHAR, TEXT) TO authenticated;

-- Realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE group_results;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
