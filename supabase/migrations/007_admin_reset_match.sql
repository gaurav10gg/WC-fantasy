-- Admin: reset a match back to upcoming (clears test results)

CREATE OR REPLACE FUNCTION admin_reset_match(
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

  UPDATE matches
  SET
    status = 'upcoming',
    result_home = NULL,
    result_away = NULL,
    winner = NULL
  WHERE id = p_match_id;
END;
$$;

-- Admin: reset all finished/started matches in a round (e.g. group_md1)

CREATE OR REPLACE FUNCTION admin_reset_round(
  p_password TEXT,
  p_round_key TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  UPDATE matches
  SET
    status = 'upcoming',
    result_home = NULL,
    result_away = NULL,
    winner = NULL
  WHERE round_key = p_round_key
    AND status IN ('started', 'finished');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_match(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_round(TEXT, TEXT) TO authenticated;
