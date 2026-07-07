-- Goal completion requires friend confirmation (from user_competitors list)

CREATE TABLE IF NOT EXISTS goal_confirmation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_category TEXT NOT NULL,
  requester_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  confirmer_share_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  requester_note TEXT DEFAULT '',
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id, date)
);

CREATE INDEX IF NOT EXISTS idx_goal_confirmations_confirmer
  ON goal_confirmation_requests (confirmer_share_code, status);

ALTER TABLE goal_confirmation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own confirmation requests" ON goal_confirmation_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Confirmers view assigned requests" ON goal_confirmation_requests
  FOR SELECT USING (
    confirmer_share_code = (
      SELECT p.share_code FROM profiles p WHERE p.user_id = auth.uid()
    )
  );

-- Friend confirms or rejects a pending request (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION respond_goal_confirmation(p_request_id UUID, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_my_code TEXT;
  v_req goal_confirmation_requests%ROWTYPE;
  v_points INTEGER := 10;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  SELECT share_code INTO v_my_code FROM profiles WHERE user_id = v_uid;
  IF v_my_code IS NULL OR v_my_code = '' THEN
    RETURN jsonb_build_object('error', 'Activa compartir para confirmar metas de amigos');
  END IF;

  SELECT * INTO v_req FROM goal_confirmation_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND confirmer_share_code = v_my_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Solicitud no encontrada o ya respondida');
  END IF;

  IF p_accept THEN
    UPDATE goal_confirmation_requests SET
      status = 'confirmed',
      confirmed_by = v_uid,
      confirmed_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO checkins (user_id, goal_id, date, completed, points)
    VALUES (v_req.user_id, v_req.goal_id, v_req.date, true, v_points)
    ON CONFLICT (user_id, goal_id, date)
    DO UPDATE SET completed = true, points = v_points;

    UPDATE user_stats SET
      total_points = total_points + v_points,
      stars_earned = stars_earned + 1,
      streak = streak + 1
    WHERE user_id = v_req.user_id;

    RETURN jsonb_build_object('ok', true, 'status', 'confirmed');
  ELSE
    UPDATE goal_confirmation_requests SET
      status = 'rejected',
      confirmed_by = v_uid,
      confirmed_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_goal_confirmation(UUID, BOOLEAN) TO authenticated;
