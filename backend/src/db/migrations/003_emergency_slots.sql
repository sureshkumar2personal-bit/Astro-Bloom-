-- ============================================================
-- TOPIC: EMERGENCY CALL SLOT MANAGEMENT
-- ============================================================

-- Emergency call slot configuration (astrologer defines a reusable slot template)
CREATE TABLE IF NOT EXISTS emergency_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  title VARCHAR(120),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_time_minutes INT NOT NULL DEFAULT 5,
  call_duration_minutes INT NOT NULL DEFAULT 20,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subscriber_price NUMERIC(12,2),
  non_subscriber_price NUMERIC(12,2),
  platform_fee NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  payment_timing VARCHAR(20) NOT NULL DEFAULT 'before',
  languages TEXT[] DEFAULT '{}'::text[],
  purposes TEXT[] DEFAULT '{}'::text[],
  call_modes VARCHAR(20) NOT NULL DEFAULT 'audio', -- audio | video | both
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | published | paused | closed
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recur_weekdays INT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_es_astrologer ON emergency_slots(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_es_date ON emergency_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_es_status ON emergency_slots(status);

-- Emergency request queue / booking
CREATE TABLE IF NOT EXISTS emergency_request_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES emergency_slots(id),
  call_type VARCHAR(20) NOT NULL DEFAULT 'audio',
  status VARCHAR(40) NOT NULL DEFAULT 'requested',
  -- Available, Requested, Waiting for Astrologer, Accepted, Payment Pending,
  -- Payment Completed, Call Ready, Call In Progress, Call Completed, Missed,
  -- Rejected, Expired, Cancelled, Refund Pending, Refunded, Disputed, Closed
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  priority_score INT NOT NULL DEFAULT 0,
  purpose VARCHAR(60),
  language VARCHAR(40),
  voice_note_url TEXT,
  price_charged NUMERIC(12,2) DEFAULT 0,
  platform_fee NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'wallet',
  payment_status VARCHAR(40) DEFAULT 'pending',
  payment_id UUID,
  scheduled_start_at TIMESTAMPTZ,
  expected_duration_minutes INT DEFAULT 20,
  estimated_wait_seconds INT DEFAULT 0,
  queue_position INT DEFAULT 1,
  astrologer_response TEXT,
  rejection_reason TEXT,
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  missed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(40),
  refund_pending_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  rating INT,
  review_text TEXT,
  rated_at TIMESTAMPTZ,
  rating_window_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eq_user ON emergency_request_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_eq_astrologer ON emergency_request_queue(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_eq_slot ON emergency_request_queue(slot_id);
CREATE INDEX IF NOT EXISTS idx_eq_status ON emergency_request_queue(status);

-- Voice notes attached to an emergency request
CREATE TABLE IF NOT EXISTS emergency_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES emergency_request_queue(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INT DEFAULT 0,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evn_request ON emergency_voice_notes(request_id);
-- Compatibility fixes
ALTER TABLE call_sessions DROP CONSTRAINT IF EXISTS call_sessions_emergency_request_id_fkey;
ALTER TABLE astrologer_reviews ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(50);
ALTER TABLE astrologer_reviews ADD COLUMN IF NOT EXISTS consultation_id UUID;
