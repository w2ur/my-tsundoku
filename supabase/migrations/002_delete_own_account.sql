-- Allows a signed-in user to delete their own auth.users row.
-- The existing FK cascade (auth.users → profiles → books + sync_metadata)
-- handles all related data automatically.
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
