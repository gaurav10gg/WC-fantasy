-- Hide other users' predictions until a match kicks off or a group winner is set.
-- Leaderboards still compute full scores via security-definer views/functions.

DROP POLICY IF EXISTS "Members can view group predictions" ON predictions;

CREATE POLICY "Users can view own predictions"
  ON predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can view revealed peer predictions"
  ON predictions FOR SELECT TO authenticated
  USING (
    user_id <> auth.uid()
    AND is_group_member(group_id)
    AND (
      (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = predictions.match_id
            AND m.status IN ('started', 'finished')
        )
      )
      OR (
        group_winner_label IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM group_results gr
          WHERE gr.group_label = predictions.group_winner_label
        )
      )
    )
  );

-- Leaderboard views run as owner so scores stay correct without exposing hidden picks.
CREATE OR REPLACE VIEW leaderboard
WITH (security_invoker = false)
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

CREATE OR REPLACE VIEW global_leaderboard
WITH (security_invoker = false)
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

CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  group_id UUID,
  total_points INT,
  correct_match_predictions INT,
  correct_group_winner_predictions INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lb.user_id,
    lb.group_id,
    lb.total_points,
    lb.correct_match_predictions,
    lb.correct_group_winner_predictions
  FROM leaderboard lb
  WHERE lb.group_id = p_group_id
    AND is_group_member(p_group_id)
  ORDER BY lb.total_points DESC;
$$;

GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;
