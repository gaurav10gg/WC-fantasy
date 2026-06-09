-- One prediction per user per match — same points on global and every league.
-- Scoring uses the best/canonical pick; saves sync across all groups.

CREATE OR REPLACE VIEW canonical_match_predictions
WITH (security_invoker = false)
AS
SELECT DISTINCT ON (user_id, match_id)
  user_id,
  match_id,
  predicted_winner,
  predicted_home_score,
  predicted_away_score
FROM predictions
WHERE match_id IS NOT NULL
ORDER BY
  user_id,
  match_id,
  (CASE
    WHEN predicted_home_score IS NOT NULL AND predicted_away_score IS NOT NULL THEN 1
    ELSE 0
  END) DESC,
  created_at DESC;

CREATE OR REPLACE VIEW canonical_group_predictions
WITH (security_invoker = false)
AS
SELECT DISTINCT ON (user_id, group_winner_label)
  user_id,
  group_winner_label,
  predicted_group_winner_team
FROM predictions
WHERE group_winner_label IS NOT NULL
ORDER BY user_id, group_winner_label, created_at DESC;

CREATE OR REPLACE VIEW leaderboard
WITH (security_invoker = false)
AS
WITH match_scores AS (
  SELECT
    gm.user_id,
    gm.group_id,
    COALESCE(SUM(
      CASE
        WHEN m.status = 'finished'
          AND c.predicted_winner IS NOT NULL
          AND c.predicted_winner = m.winner
        THEN 2 ELSE 0
      END
      +
      CASE
        WHEN m.status = 'finished'
          AND c.predicted_home_score IS NOT NULL
          AND c.predicted_away_score IS NOT NULL
          AND m.result_home IS NOT NULL
          AND m.result_away IS NOT NULL
          AND c.predicted_home_score = m.result_home
          AND c.predicted_away_score = m.result_away
        THEN 1 ELSE 0
      END
    ), 0)::INT AS pts,
    COUNT(*) FILTER (
      WHERE m.status = 'finished'
        AND c.predicted_winner IS NOT NULL
        AND c.predicted_winner = m.winner
    )::INT AS correct_matches
  FROM group_members gm
  LEFT JOIN canonical_match_predictions c ON c.user_id = gm.user_id
  LEFT JOIN matches m ON m.id = c.match_id
  GROUP BY gm.user_id, gm.group_id
),
group_scores AS (
  SELECT
    gm.user_id,
    gm.group_id,
    COALESCE(SUM(
      CASE
        WHEN gr.winner_team IS NOT NULL
          AND cg.predicted_group_winner_team = gr.winner_team
        THEN 5 ELSE 0
      END
    ), 0)::INT AS pts,
    COUNT(*) FILTER (
      WHERE gr.winner_team IS NOT NULL
        AND cg.predicted_group_winner_team = gr.winner_team
    )::INT AS correct_groups
  FROM group_members gm
  LEFT JOIN canonical_group_predictions cg ON cg.user_id = gm.user_id
  LEFT JOIN group_results gr ON gr.group_label = cg.group_winner_label
  GROUP BY gm.user_id, gm.group_id
)
SELECT
  ms.user_id,
  ms.group_id,
  ms.pts + COALESCE(gs.pts, 0) AS total_points,
  ms.correct_matches AS correct_match_predictions,
  COALESCE(gs.correct_groups, 0) AS correct_group_winner_predictions
FROM match_scores ms
LEFT JOIN group_scores gs
  ON gs.user_id = ms.user_id AND gs.group_id = ms.group_id;

CREATE OR REPLACE VIEW global_leaderboard
WITH (security_invoker = false)
AS
SELECT
  lb.user_id,
  COALESCE(pr.team_name, pr.display_name) AS team_name,
  pr.display_name,
  lb.total_points,
  lb.correct_match_predictions,
  lb.correct_group_winner_predictions
FROM leaderboard lb
JOIN groups g ON g.id = lb.group_id AND g.is_global = true
JOIN profiles pr ON pr.id = lb.user_id;

-- Keep every stored copy aligned with the canonical pick
WITH best_match AS (
  SELECT DISTINCT ON (user_id, match_id)
    user_id,
    match_id,
    predicted_winner,
    predicted_home_score,
    predicted_away_score
  FROM predictions
  WHERE match_id IS NOT NULL
  ORDER BY
    user_id,
    match_id,
    (CASE
      WHEN predicted_home_score IS NOT NULL AND predicted_away_score IS NOT NULL THEN 1
      ELSE 0
    END) DESC,
    created_at DESC
)
UPDATE predictions p
SET
  predicted_winner = b.predicted_winner,
  predicted_home_score = b.predicted_home_score,
  predicted_away_score = b.predicted_away_score
FROM best_match b
WHERE p.user_id = b.user_id
  AND p.match_id = b.match_id
  AND (
    p.predicted_winner IS DISTINCT FROM b.predicted_winner
    OR p.predicted_home_score IS DISTINCT FROM b.predicted_home_score
    OR p.predicted_away_score IS DISTINCT FROM b.predicted_away_score
  );

WITH best_group AS (
  SELECT DISTINCT ON (user_id, group_winner_label)
    user_id,
    group_winner_label,
    predicted_group_winner_team
  FROM predictions
  WHERE group_winner_label IS NOT NULL
  ORDER BY user_id, group_winner_label, created_at DESC
)
UPDATE predictions p
SET predicted_group_winner_team = b.predicted_group_winner_team
FROM best_group b
WHERE p.user_id = b.user_id
  AND p.group_winner_label = b.group_winner_label
  AND p.predicted_group_winner_team IS DISTINCT FROM b.predicted_group_winner_team;

-- Sync predictions to all of a user's groups (league <-> global)
CREATE OR REPLACE FUNCTION sync_prediction_across_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_group_id UUID;
BEGIN
  IF current_setting('wc26.syncing_predictions', true) = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('wc26.syncing_predictions', 'on', true);
  PERFORM ensure_global_enrollment(NEW.user_id);

  IF NEW.match_id IS NOT NULL THEN
    FOR v_target_group_id IN
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = NEW.user_id
        AND gm.group_id <> NEW.group_id
    LOOP
      INSERT INTO predictions (
        user_id, group_id, match_id, predicted_winner,
        predicted_home_score, predicted_away_score,
        group_winner_label, predicted_group_winner_team
      ) VALUES (
        NEW.user_id, v_target_group_id, NEW.match_id, NEW.predicted_winner,
        NEW.predicted_home_score, NEW.predicted_away_score,
        NULL, NULL
      )
      ON CONFLICT (user_id, group_id, match_id) DO UPDATE SET
        predicted_winner = EXCLUDED.predicted_winner,
        predicted_home_score = EXCLUDED.predicted_home_score,
        predicted_away_score = EXCLUDED.predicted_away_score;
    END LOOP;
  ELSIF NEW.group_winner_label IS NOT NULL THEN
    FOR v_target_group_id IN
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = NEW.user_id
        AND gm.group_id <> NEW.group_id
    LOOP
      INSERT INTO predictions (
        user_id, group_id, match_id, predicted_winner,
        predicted_home_score, predicted_away_score,
        group_winner_label, predicted_group_winner_team
      ) VALUES (
        NEW.user_id, v_target_group_id, NULL, NULL,
        NULL, NULL,
        NEW.group_winner_label, NEW.predicted_group_winner_team
      )
      ON CONFLICT (user_id, group_id, group_winner_label) DO UPDATE SET
        predicted_group_winner_team = EXCLUDED.predicted_group_winner_team;
    END LOOP;
  END IF;

  PERFORM set_config('wc26.syncing_predictions', 'off', true);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('wc26.syncing_predictions', 'off', true);
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS sync_league_predictions_to_global ON predictions;
CREATE TRIGGER sync_predictions_across_groups
  AFTER INSERT OR UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION sync_prediction_across_groups();

GRANT SELECT ON canonical_match_predictions TO authenticated;
GRANT SELECT ON canonical_group_predictions TO authenticated;
