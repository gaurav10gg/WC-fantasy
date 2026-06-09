-- Fix: creating a league uses INSERT ... RETURNING, but SELECT only allowed
-- for members. Creator isn't a member until the next insert, so RETURNING fails.

CREATE POLICY "Creators can view groups they created"
  ON groups FOR SELECT TO authenticated
  USING (created_by = auth.uid());
