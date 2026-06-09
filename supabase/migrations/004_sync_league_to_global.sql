-- League predictions automatically count for global rankings.
-- Saving picks in a friend league syncs them to the global tournament group.

CREATE OR REPLACE FUNCTION ensure_global_enrollment(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global_id UUID;
BEGIN
  v_global_id := get_global_group_id();
  IF v_global_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE profiles
  SET team_name = display_name
  WHERE id = p_user_id AND team_name IS NULL;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_global_id, p_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_global_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_prediction_to_global()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global_id UUID;
  v_is_global BOOLEAN;
BEGIN
  SELECT is_global INTO v_is_global FROM groups WHERE id = NEW.group_id;
  IF COALESCE(v_is_global, false) THEN
    RETURN NEW;
  END IF;

  v_global_id := ensure_global_enrollment(NEW.user_id);
  IF v_global_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.match_id IS NOT NULL THEN
    INSERT INTO predictions (
      user_id, group_id, match_id, predicted_winner,
      predicted_home_score, predicted_away_score,
      group_winner_label, predicted_group_winner_team
    ) VALUES (
      NEW.user_id, v_global_id, NEW.match_id, NEW.predicted_winner,
      NEW.predicted_home_score, NEW.predicted_away_score,
      NULL, NULL
    )
    ON CONFLICT (user_id, group_id, match_id) DO UPDATE SET
      predicted_winner = EXCLUDED.predicted_winner,
      predicted_home_score = EXCLUDED.predicted_home_score,
      predicted_away_score = EXCLUDED.predicted_away_score;
  ELSIF NEW.group_winner_label IS NOT NULL THEN
    INSERT INTO predictions (
      user_id, group_id, match_id, predicted_winner,
      predicted_home_score, predicted_away_score,
      group_winner_label, predicted_group_winner_team
    ) VALUES (
      NEW.user_id, v_global_id, NULL, NULL,
      NULL, NULL,
      NEW.group_winner_label, NEW.predicted_group_winner_team
    )
    ON CONFLICT (user_id, group_id, group_winner_label) DO UPDATE SET
      predicted_group_winner_team = EXCLUDED.predicted_group_winner_team;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_league_predictions_to_global ON predictions;
CREATE TRIGGER sync_league_predictions_to_global
  AFTER INSERT OR UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION sync_prediction_to_global();

-- Auto-enroll in global when joining a friend league
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

  PERFORM ensure_global_enrollment(auth.uid());

  IF p_copy_global THEN
    PERFORM copy_global_predictions_to_league(v_group_id);
  END IF;

  RETURN v_group_id;
END;
$$;

-- Backfill: enroll league players and copy their latest picks to global
DO $$
DECLARE
  v_global_id UUID;
BEGIN
  v_global_id := get_global_group_id();
  IF v_global_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO group_members (group_id, user_id)
  SELECT v_global_id, gm.user_id
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id AND g.is_global = false
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE profiles SET team_name = display_name WHERE team_name IS NULL;

  INSERT INTO predictions (
    user_id, group_id, match_id, predicted_winner,
    predicted_home_score, predicted_away_score,
    group_winner_label, predicted_group_winner_team
  )
  SELECT DISTINCT ON (p.user_id, p.match_id)
    p.user_id, v_global_id, p.match_id, p.predicted_winner,
    p.predicted_home_score, p.predicted_away_score,
    NULL, NULL
  FROM predictions p
  JOIN groups g ON g.id = p.group_id AND g.is_global = false
  WHERE p.match_id IS NOT NULL
  ORDER BY p.user_id, p.match_id, p.created_at DESC
  ON CONFLICT (user_id, group_id, match_id) DO UPDATE SET
    predicted_winner = EXCLUDED.predicted_winner,
    predicted_home_score = EXCLUDED.predicted_home_score,
    predicted_away_score = EXCLUDED.predicted_away_score;

  INSERT INTO predictions (
    user_id, group_id, match_id, predicted_winner,
    predicted_home_score, predicted_away_score,
    group_winner_label, predicted_group_winner_team
  )
  SELECT DISTINCT ON (p.user_id, p.group_winner_label)
    p.user_id, v_global_id, NULL, NULL,
    NULL, NULL,
    p.group_winner_label, p.predicted_group_winner_team
  FROM predictions p
  JOIN groups g ON g.id = p.group_id AND g.is_global = false
  WHERE p.group_winner_label IS NOT NULL
  ORDER BY p.user_id, p.group_winner_label, p.created_at DESC
  ON CONFLICT (user_id, group_id, group_winner_label) DO UPDATE SET
    predicted_group_winner_team = EXCLUDED.predicted_group_winner_team;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_global_enrollment(UUID) TO authenticated;
