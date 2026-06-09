-- Rounds, global tournament, team names, public leaderboard

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_name TEXT;

UPDATE profiles SET team_name = display_name WHERE team_name IS NULL;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT false;

-- Global tournament league (fixed id for worldwide ranking)
ALTER TABLE groups ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO groups (id, name, invite_code, created_by, is_global)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Global Tournament',
  'GLOBAL',
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE SET is_global = true, name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS tournament_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_round_key TEXT NOT NULL DEFAULT 'group_md1',
  predictions_open BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO tournament_settings (active_round_key, predictions_open)
VALUES ('group_md1', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS matchday INT,
  ADD COLUMN IF NOT EXISTS round_key TEXT NOT NULL DEFAULT 'group_md1',
  ADD COLUMN IF NOT EXISTS visible_for_predictions BOOLEAN NOT NULL DEFAULT false;

-- Knockout matches may not belong to a group
ALTER TABLE matches ALTER COLUMN group_label DROP NOT NULL;

-- Backfill round_key / matchday from match_number for existing group matches
UPDATE matches SET
  matchday = CASE
    WHEN match_number <= 2 THEN 1
    WHEN match_number <= 4 THEN 2
    ELSE 3
  END,
  round_key = CASE
    WHEN match_number <= 2 THEN 'group_md1'
    WHEN match_number <= 4 THEN 'group_md2'
    WHEN match_number <= 6 THEN 'group_md3'
    ELSE stage
  END
WHERE stage = 'group';

-- Round 1 visible by default
UPDATE matches SET visible_for_predictions = true WHERE round_key = 'group_md1';

CREATE INDEX IF NOT EXISTS matches_round_key_idx ON matches(round_key);

-- Global leaderboard view (all users in global tournament group)
CREATE OR REPLACE VIEW global_leaderboard
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  COALESCE(pr.team_name, pr.display_name) AS team_name,
  pr.display_name,
  COALESCE(SUM(
    CASE
      WHEN p.match_id IS NOT NULL AND m.status = 'finished'
        AND p.predicted_winner IS NOT NULL AND p.predicted_winner = m.winner
      THEN 2 ELSE 0
    END
    +
    CASE
      WHEN p.match_id IS NOT NULL AND m.status = 'finished'
        AND p.predicted_home_score IS NOT NULL AND p.predicted_away_score IS NOT NULL
        AND m.result_home IS NOT NULL AND m.result_away IS NOT NULL
        AND p.predicted_home_score = m.result_home
        AND p.predicted_away_score = m.result_away
      THEN 1 ELSE 0
    END
    +
    CASE
      WHEN p.match_id IS NULL AND gr.winner_team IS NOT NULL
        AND p.predicted_group_winner_team = gr.winner_team
      THEN 5 ELSE 0
    END
  ), 0)::INT AS total_points,
  COUNT(*) FILTER (
    WHERE p.match_id IS NOT NULL AND m.status = 'finished' AND p.predicted_winner = m.winner
  )::INT AS correct_match_predictions,
  COUNT(*) FILTER (
    WHERE p.match_id IS NULL AND gr.winner_team IS NOT NULL
      AND p.predicted_group_winner_team = gr.winner_team
  )::INT AS correct_group_winner_predictions
FROM predictions p
JOIN groups g ON g.id = p.group_id AND g.is_global = true
JOIN profiles pr ON pr.id = p.user_id
LEFT JOIN matches m ON p.match_id = m.id
LEFT JOIN group_results gr ON p.group_winner_label = gr.group_label
GROUP BY p.user_id, pr.team_name, pr.display_name;

-- Public global leaderboard (no auth required)
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
  user_id UUID,
  team_name TEXT,
  display_name TEXT,
  total_points INT,
  correct_match_predictions INT,
  correct_group_winner_predictions INT,
  rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gl.user_id,
    gl.team_name,
    gl.display_name,
    gl.total_points,
    gl.correct_match_predictions,
    gl.correct_group_winner_predictions,
    RANK() OVER (ORDER BY gl.total_points DESC, gl.team_name ASC) AS rank
  FROM global_leaderboard gl
  ORDER BY total_points DESC, team_name ASC;
$$;

-- Get global tournament group id
CREATE OR REPLACE FUNCTION get_global_group_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM groups WHERE is_global = true LIMIT 1;
$$;

-- Join global tournament with a team name
CREATE OR REPLACE FUNCTION join_global_tournament(p_team_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  v_group_id := get_global_group_id();
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Global tournament not configured';
  END IF;

  UPDATE profiles SET team_name = trim(p_team_name) WHERE id = auth.uid();

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

-- Copy global predictions into a friend league when joining
CREATE OR REPLACE FUNCTION copy_global_predictions_to_league(p_league_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global_id UUID;
BEGIN
  IF NOT is_group_member(p_league_id) THEN
    RAISE EXCEPTION 'Not a member of this league';
  END IF;

  v_global_id := get_global_group_id();

  INSERT INTO predictions (
    user_id, group_id, match_id, predicted_winner,
    predicted_home_score, predicted_away_score,
    group_winner_label, predicted_group_winner_team
  )
  SELECT
    auth.uid(), p_league_id, match_id, predicted_winner,
    predicted_home_score, predicted_away_score,
    group_winner_label, predicted_group_winner_team
  FROM predictions
  WHERE user_id = auth.uid() AND group_id = v_global_id
  ON CONFLICT DO NOTHING;
END;
$$;

-- Updated join: optionally copy global picks
CREATE OR REPLACE FUNCTION join_group_by_invite(
  p_invite_code TEXT,
  p_copy_global BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT id INTO v_group_id FROM groups
  WHERE invite_code = upper(p_invite_code) AND is_global = false;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  IF p_copy_global THEN
    PERFORM copy_global_predictions_to_league(v_group_id);
  END IF;

  RETURN v_group_id;
END;
$$;

-- Admin: advance to next prediction round
CREATE OR REPLACE FUNCTION admin_advance_round(p_password TEXT, p_round_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  UPDATE tournament_settings SET active_round_key = p_round_key WHERE id = 1;

  IF p_round_key = 'group_winners' THEN
    NULL;
  ELSE
    UPDATE matches SET visible_for_predictions = false;
    UPDATE matches SET visible_for_predictions = true WHERE round_key = p_round_key;
  END IF;
END;
$$;

-- Admin: add knockout match
CREATE OR REPLACE FUNCTION admin_add_knockout_match(
  p_password TEXT,
  p_round_key TEXT,
  p_team_home TEXT,
  p_team_away TEXT,
  p_match_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  INSERT INTO matches (
    stage, group_label, team_home, team_away, match_date,
    status, match_number, round_key, visible_for_predictions
  ) VALUES (
    p_round_key, NULL, p_team_home, p_team_away, p_match_date,
    'upcoming', 1, p_round_key, true
  )
  RETURNING id INTO v_id;

  UPDATE tournament_settings SET active_round_key = p_round_key WHERE id = 1;

  RETURN v_id;
END;
$$;

-- Allow anyone to read global group exists (for UI)
CREATE POLICY "Anyone can see global tournament group"
  ON groups FOR SELECT TO authenticated
  USING (is_global = true);

GRANT SELECT ON global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_group_id() TO authenticated;
GRANT EXECUTE ON FUNCTION join_global_tournament(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION copy_global_predictions_to_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_advance_round(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_knockout_match(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tournament settings"
  ON tournament_settings FOR SELECT TO authenticated, anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE tournament_settings;
