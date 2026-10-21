CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE,
  mobile VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  profile_photo_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  referral_code VARCHAR(50),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  gender VARCHAR(30), date_of_birth DATE, birth_time TIME, birth_place VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL, display_name VARCHAR(150) NOT NULL,
  professional_title VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL, mobile VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, city VARCHAR(100), experience_years INT NOT NULL DEFAULT 0,
  short_bio TEXT, long_bio TEXT, consultation_style VARCHAR(255),
  profile_photo_url TEXT,
  account_status VARCHAR(40) NOT NULL DEFAULT 'pending_verification',
  verification_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  profile_status VARCHAR(40) NOT NULL DEFAULT 'draft',
  is_profile_public BOOLEAN DEFAULT false,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  completed_consultations INT DEFAULT 0,
  rejection_reason TEXT,
  last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  language VARCHAR(100) NOT NULL, proficiency VARCHAR(50), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  specialization VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100), file_size INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  certificate_name VARCHAR(150),
  file_url TEXT NOT NULL,
  verification_status VARCHAR(40) DEFAULT 'pending',
  admin_note TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  service_type VARCHAR(50),
  consultation_type VARCHAR(50),
  consultation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS astrologer_service_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  online_status VARCHAR(30) DEFAULT 'offline',
  appointment_available BOOLEAN DEFAULT false,
  emergency_available BOOLEAN DEFAULT false,
  live_now BOOLEAN DEFAULT false,
  question_available BOOLEAN DEFAULT false,
  starting_question_price NUMERIC(10,2),
  starting_call_price NUMERIC(10,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_type VARCHAR(30) NOT NULL, actor_id UUID NOT NULL,
  refresh_token_hash TEXT NOT NULL, revoked_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_actor ON auth_sessions(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_astrologer_service_status_astrologer ON astrologer_service_status(astrologer_id);

-- ============================================================
-- TOPIC 5: QUESTION PURCHASE FLOW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS question_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  campaign_name VARCHAR(150) NOT NULL,
  campaign_code VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  total_slots INT NOT NULL DEFAULT 0,
  sold_slots INT DEFAULT 0,
  available_slots INT NOT NULL DEFAULT 0,
  general_question_limit INT DEFAULT 0,
  individual_question_limit INT DEFAULT 0,
  general_sold_count INT DEFAULT 0,
  individual_sold_count INT DEFAULT 0,
  submission_mode VARCHAR(40) NOT NULL DEFAULT 'text',
  answer_mode VARCHAR(40) NOT NULL DEFAULT 'text',
  deadline_hours INT DEFAULT 48,
  status VARCHAR(40) DEFAULT 'draft',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_campaign_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES question_campaigns(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS question_campaign_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES question_campaigns(id) ON DELETE CASCADE,
  language VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  available_balance NUMERIC(12,2) DEFAULT 0,
  hold_balance NUMERIC(12,2) DEFAULT 0,
  pending_balance NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallet_accounts(id),
  owner_type VARCHAR(40) NOT NULL,
  owner_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  service_type VARCHAR(80),
  service_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(40) DEFAULT 'created',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  astrologer_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES question_campaigns(id),
  purchase_code VARCHAR(80) UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_status VARCHAR(40) DEFAULT 'pending',
  purchase_status VARCHAR(40) DEFAULT 'pending_payment',
  question_submitted BOOLEAN DEFAULT false,
  question_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  astrologer_id UUID NOT NULL,
  service_type VARCHAR(80) NOT NULL,
  service_id UUID NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  platform_commission NUMERIC(12,2) DEFAULT 0,
  astrologer_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(40) DEFAULT 'held',
  held_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  astrologer_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES question_campaigns(id),
  purchase_id UUID NOT NULL REFERENCES question_purchases(id),
  question_code VARCHAR(80) UNIQUE NOT NULL,
  question_type VARCHAR(40) NOT NULL DEFAULT 'general',
  category VARCHAR(100) NOT NULL,
  language VARCHAR(100) NOT NULL,
  title VARCHAR(200),
  question_text TEXT,
  voice_file_url TEXT,
  related_profile_id UUID,
  status VARCHAR(40) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(80),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL,
  answer_mode VARCHAR(40) NOT NULL,
  answer_text TEXT,
  voice_answer_url TEXT,
  status VARCHAR(40) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_question_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id),
  user_id UUID NOT NULL,
  astrologer_id UUID NOT NULL,
  queue_position INT,
  status VARCHAR(40) DEFAULT 'waiting',
  marked_answering_at TIMESTAMPTZ,
  marked_answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  purchase_id UUID NOT NULL REFERENCES question_purchases(id),
  reason VARCHAR(150) NOT NULL,
  description TEXT,
  expected_resolution VARCHAR(100),
  status VARCHAR(40) DEFAULT 'open',
  astrologer_response TEXT,
  astrologer_responded_at TIMESTAMPTZ,
  admin_notes TEXT,
  resolution VARCHAR(100),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalated_by UUID,
  refund_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES question_disputes(id) ON DELETE CASCADE,
  sender_type VARCHAR(40) NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_disputes_question ON question_disputes(question_id);
CREATE INDEX IF NOT EXISTS idx_question_disputes_user ON question_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_question_disputes_astrologer ON question_disputes(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_question_disputes_status ON question_disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);

CREATE INDEX IF NOT EXISTS idx_question_campaigns_astrologer ON question_campaigns(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_question_campaigns_status ON question_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_question_purchases_user ON question_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_question_purchases_campaign ON question_purchases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_questions_astrologer ON questions(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_accounts_owner ON wallet_accounts(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_escrow_records_service ON escrow_records(service_type, service_id);

-- ============================================================
-- TOPIC 6: SUBSCRIPTION / FOLLOWING / PERKS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  duration_days INT NOT NULL DEFAULT 30,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(astrologer_id, plan_code)
);

CREATE TABLE IF NOT EXISTS subscription_plan_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  benefit_type VARCHAR(100) NOT NULL,
  benefit_name VARCHAR(150) NOT NULL,
  benefit_value INT DEFAULT 1,
  description TEXT,
  reset_cycle VARCHAR(50) DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unfollowed_at TIMESTAMPTZ,
  UNIQUE(user_id, astrologer_id)
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  plan_benefit_id UUID REFERENCES subscription_plan_benefits(id) ON DELETE SET NULL,
  perk_type VARCHAR(100) NOT NULL,
  title VARCHAR(150) NOT NULL,
  total_count INT DEFAULT 1,
  used_count INT DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'available',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS astrologer_content_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  body TEXT,
  media_url TEXT,
  audience_type VARCHAR(100) NOT NULL,
  plan_code VARCHAR(50),
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_astrologer ON subscription_plans(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_astrologer ON user_follows(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_astrologer ON user_subscriptions(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_user_perks_user ON user_perks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perks_astrologer ON user_perks(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_content_perks_astrologer ON astrologer_content_perks(astrologer_id);

-- ============================================================
-- TOPIC 8: LIVE STREAMING FLOW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  topic VARCHAR(100) NOT NULL,
  language VARCHAR(100) NOT NULL,
  audience_type VARCHAR(50) NOT NULL DEFAULT 'public',
  entry_type VARCHAR(50) NOT NULL DEFAULT 'free',
  entry_price NUMERIC(10,2) DEFAULT 0,
  question_mode VARCHAR(50) NOT NULL DEFAULT 'no_questions',
  question_price NUMERIC(10,2) DEFAULT 0,
  max_question_slots INT DEFAULT 0,
  sold_question_slots INT DEFAULT 0,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  stream_room_id VARCHAR(255),
  viewer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_session_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type VARCHAR(50) NOT NULL,
  payment_id UUID,
  access_status VARCHAR(50) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(live_session_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  question_type VARCHAR(50) NOT NULL DEFAULT 'general',
  category VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  voice_file_url TEXT,
  horoscope_profile_id UUID,
  payment_id UUID,
  queue_position INT,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  answered_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(30) NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  astrologer_id UUID REFERENCES astrologers(id),
  service_type VARCHAR(100) NOT NULL,
  service_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  escrow_status VARCHAR(50) DEFAULT 'not_required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_astrologer ON live_sessions(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_live_session_access_session ON live_session_access(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_access_user ON live_session_access(user_id);
CREATE INDEX IF NOT EXISTS idx_live_questions_session ON live_questions(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_questions_user ON live_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON live_chat_messages(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_events_session ON live_session_events(live_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_type, service_id);

-- ============================================================
-- TOPIC 1: ONBOARDING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  zodiac_sign VARCHAR(30),
  moon_sign VARCHAR(30),
  ascendant VARCHAR(30),
  preferred_language VARCHAR(50) DEFAULT 'English',
  interests TEXT[],
  notification_email BOOLEAN DEFAULT true,
  notification_push BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target VARCHAR(255) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- ============================================================
-- TOPIC 2: SESSION MANAGEMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS active_sessions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID NOT NULL,
  refresh_session_id UUID,
  device_info TEXT,
  ip_address VARCHAR(50),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_session_log_actor ON active_session_log(actor_type, actor_id);

-- ============================================================
-- TOPIC 4: APPOINTMENT / CALL FLOW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  appointment_type VARCHAR(50) NOT NULL DEFAULT 'video',
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_id UUID,
  call_room_id VARCHAR(255),
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_astrologer ON appointment_slots(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_astrologer ON appointments(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);

-- ============================================================
-- EMERGENCY CALL FLOW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS astrologer_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL UNIQUE REFERENCES astrologers(id) ON DELETE CASCADE,
  chat_rate_per_minute NUMERIC(12,2) DEFAULT 0,
  audio_rate_per_minute NUMERIC(12,2) DEFAULT 0,
  video_rate_per_minute NUMERIC(12,2) DEFAULT 0,
  emergency_audio_rate NUMERIC(12,2) DEFAULT 0,
  emergency_video_rate NUMERIC(12,2) DEFAULT 0,
  live_paid_question_rate NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_astrologer ON astrologer_rates(astrologer_id);

CREATE TABLE IF NOT EXISTS emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  call_type VARCHAR(20) NOT NULL DEFAULT 'audio',
  status VARCHAR(40) NOT NULL DEFAULT 'requested',
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  priority_score INT NOT NULL DEFAULT 0,
  urgency_note TEXT,
  price_charged NUMERIC(12,2) DEFAULT 0,
  payment_status VARCHAR(40) DEFAULT 'pending',
  payment_id UUID,
  astrologer_response TEXT,
  rejection_reason TEXT,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_er_user ON emergency_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_er_astrologer ON emergency_requests(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_er_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_er_created ON emergency_requests(created_at);

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  emergency_request_id UUID,
  appointment_id UUID REFERENCES appointments(id),
  call_type VARCHAR(20) NOT NULL DEFAULT 'audio',
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  provider_name VARCHAR(80),
  provider_channel_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  amount_charged NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cs_emergency ON call_sessions(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_cs_user ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_astrologer ON call_sessions(astrologer_id);

-- ============================================================
-- TOPIC 7: LIVE ROOMS EXTENDED TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS live_co_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  role VARCHAR(50) DEFAULT 'panelist',
  status VARCHAR(50) DEFAULT 'invited',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_co_hosts_session ON live_co_hosts(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_session ON live_tips(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_tips_user ON live_tips(user_id);

-- ============================================================
-- TOPIC 9: NOTIFICATIONS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel_in_app BOOLEAN DEFAULT true,
  channel_email BOOLEAN DEFAULT false,
  channel_push BOOLEAN DEFAULT true,
  channel_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(actor_type, actor_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notification_pref_actor ON notification_preferences(actor_type, actor_id);

-- ============================================================
-- TOPIC 11: MESSAGING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(30) NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_type VARCHAR(30) NOT NULL,
  actor_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, actor_type, actor_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(30) NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'text',
  media_url TEXT,
  reply_to UUID REFERENCES messages(id),
  status VARCHAR(30) DEFAULT 'sent',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_actor ON conversation_members(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================================
-- TOPIC 12: ANALYTICS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(30),
  actor_id UUID,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earnings_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  commission_paid NUMERIC(12,2) DEFAULT 0,
  net_payout NUMERIC(12,2) DEFAULT 0,
  consultations_count INT DEFAULT 0,
  questions_answered INT DEFAULT 0,
  subscriptions_count INT DEFAULT 0,
  live_tips_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_actor ON analytics_events(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_earnings_records_astrologer ON earnings_records(astrologer_id);

-- ============================================================
-- TOPIC 9: AI CHAT FLOW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code VARCHAR(50) UNIQUE NOT NULL,
  pack_name VARCHAR(100) NOT NULL,
  price_amount NUMERIC(10,2) NOT NULL,
  question_count INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  free_used INT NOT NULL DEFAULT 0,
  free_limit INT NOT NULL DEFAULT 5,
  paid_remaining INT NOT NULL DEFAULT 0,
  total_questions_used INT NOT NULL DEFAULT 0,
  current_pack_id UUID REFERENCES ai_packs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(30) NOT NULL DEFAULT 'general',
  profile_id UUID,
  title VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  category VARCHAR(100),
  profile_id UUID,
  usage_type VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES ai_packs(id),
  wallet_transaction_id UUID,
  price_paid NUMERIC(10,2) NOT NULL,
  question_count INT NOT NULL,
  questions_remaining INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_pack_purchases_user ON ai_pack_purchases(user_id);

-- ─── Content Creation ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_type VARCHAR(30) NOT NULL,
  creator_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  short_description TEXT,
  body TEXT NOT NULL,
  content_type VARCHAR(80) NOT NULL,
  astrology_category VARCHAR(100),
  language VARCHAR(50) NOT NULL DEFAULT 'Tamil',
  audience_type VARCHAR(80) NOT NULL,
  plan_type VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  banner_image_url TEXT,
  pdf_url TEXT,
  audio_url TEXT,
  video_url TEXT,
  linked_live_session_id UUID,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  requires_admin_approval BOOLEAN DEFAULT false,
  admin_approval_status VARCHAR(50) DEFAULT 'not_required',
  admin_rejection_reason TEXT,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contents_creator ON contents(creator_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_audience ON contents(audience_type);
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type);

CREATE TABLE IF NOT EXISTS content_selected_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_selected_content ON content_selected_users(content_id);

CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_views_content ON content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_user ON content_views(user_id);

CREATE TABLE IF NOT EXISTS content_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  original_file_name VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_attachments_content ON content_attachments(content_id);

CREATE TABLE IF NOT EXISTS content_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_notifications_content ON content_notifications(content_id);
CREATE INDEX IF NOT EXISTS idx_content_notifications_user ON content_notifications(user_id);

-- ─── Topic 12: Atonement / Remedy / Pariharam ─────────────────────────────

CREATE TABLE IF NOT EXISTS atonements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  astrologer_id UUID,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  title VARCHAR(200) NOT NULL,
  remedy_type VARCHAR(80) NOT NULL,
  problem_category VARCHAR(100),
  astrology_reason TEXT,
  instructions TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2) DEFAULT 0,
  proof_required BOOLEAN NOT NULL DEFAULT false,
  expected_completion_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'prescribed',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'not_required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_atonements_user ON atonements(user_id);
CREATE INDEX IF NOT EXISTS idx_atonements_astrologer ON atonements(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_atonements_status ON atonements(status);

CREATE TABLE IF NOT EXISTS atonement_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atonement_id UUID NOT NULL REFERENCES atonements(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_type VARCHAR(30) NOT NULL,
  changed_by_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ash_atonement ON atonement_status_history(atonement_id);

CREATE TABLE IF NOT EXISTS atonement_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atonement_id UUID NOT NULL REFERENCES atonements(id) ON DELETE CASCADE,
  uploaded_by_type VARCHAR(30) NOT NULL,
  uploaded_by_id UUID,
  file_url TEXT NOT NULL,
  proof_type VARCHAR(50),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aprf_atonement ON atonement_proofs(atonement_id);

CREATE TABLE IF NOT EXISTS atonement_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atonement_id UUID NOT NULL REFERENCES atonements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  astrologer_id UUID,
  gross_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  platform_commission NUMERIC(10,2) DEFAULT 0,
  astrologer_earning NUMERIC(10,2) DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apay_atonement ON atonement_payments(atonement_id);
CREATE INDEX IF NOT EXISTS idx_apay_user ON atonement_payments(user_id);

CREATE TABLE IF NOT EXISTS atonement_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atonement_id UUID REFERENCES atonements(id) ON DELETE SET NULL,
  astrologer_id UUID,
  user_id UUID,
  revenue_source VARCHAR(50) NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL,
  platform_commission NUMERIC(10,2) DEFAULT 0,
  astrologer_commission NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  settlement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_arev_astrologer ON atonement_revenues(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_arev_atonement ON atonement_revenues(atonement_id);

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  remedy_type VARCHAR(80),
  discount_type VARCHAR(30) NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  max_usage INT,
  used_count INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dc_astrologer ON discount_codes(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_dc_code ON discount_codes(code);

CREATE TABLE IF NOT EXISTS discount_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id),
  user_id UUID NOT NULL,
  atonement_id UUID REFERENCES atonements(id),
  order_id UUID,
  original_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcu_code ON discount_code_usages(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_dcu_user ON discount_code_usages(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TOPIC 15: ACCOUNTS / EDITORS / KILL SWITCH
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS astrologer_staff_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(20),
    password_hash TEXT,
    role_name VARCHAR(100) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'invited',
    invite_token_hash TEXT,
    invite_expires_at TIMESTAMP,
    access_expires_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssa_astrologer ON astrologer_staff_accounts(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_ssa_status ON astrologer_staff_accounts(status);
CREATE INDEX IF NOT EXISTS idx_ssa_email ON astrologer_staff_accounts(email);

CREATE TABLE IF NOT EXISTS astrologer_staff_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES astrologer_staff_accounts(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    action_key VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, module_key, action_key)
);
CREATE INDEX IF NOT EXISTS idx_ssp_staff ON astrologer_staff_permissions(staff_id);

CREATE TABLE IF NOT EXISTS astrologer_staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES astrologer_staff_accounts(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    ip_address VARCHAR(100),
    device_info TEXT,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sss_staff ON astrologer_staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_sss_active ON astrologer_staff_sessions(staff_id, revoked_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS astrologer_staff_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES astrologer_staff_accounts(id) ON DELETE SET NULL,
    actor_type VARCHAR(40) NOT NULL,
    action_key VARCHAR(150) NOT NULL,
    module_key VARCHAR(100) NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(100),
    device_info TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'success',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssal_astrologer ON astrologer_staff_activity_logs(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_ssal_staff ON astrologer_staff_activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_ssal_action ON astrologer_staff_activity_logs(action_key);
CREATE INDEX IF NOT EXISTS idx_ssal_created ON astrologer_staff_activity_logs(created_at);

CREATE TABLE IF NOT EXISTS astrologer_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
    triggered_by_type VARCHAR(40) NOT NULL,
    triggered_by_id UUID,
    event_type VARCHAR(100) NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ase_astrologer ON astrologer_security_events(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_ase_event_type ON astrologer_security_events(event_type);

CREATE TABLE IF NOT EXISTS user_astrology_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    gender VARCHAR(30),
    date_of_birth DATE,
    birth_time TIME,
    birth_place VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    timezone VARCHAR(100),
    rasi VARCHAR(100),
    nakshatra VARCHAR(100),
    pada VARCHAR(20),
    lagna VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uap_user ON user_astrology_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_uap_default ON user_astrology_profiles(user_id, is_default) WHERE is_default = true;

CREATE TABLE IF NOT EXISTS user_profile_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    astrology_profile_id UUID,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upeh_user ON user_profile_edit_history(user_id);

CREATE TABLE IF NOT EXISTS astrologer_profile_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    edit_status VARCHAR(40) DEFAULT 'published',
    edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apeh_astrologer ON astrologer_profile_edit_history(astrologer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN PANEL MODULE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    permissions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON admin_accounts(email);

CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    action_key VARCHAR(150) NOT NULL,
    module_key VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aal_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_aal_action ON admin_audit_logs(action_key);
CREATE INDEX IF NOT EXISTS idx_aal_created ON admin_audit_logs(created_at);

CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    body TEXT,
    type VARCHAR(100) NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
    target_ids JSONB,
    sent_by UUID REFERENCES admin_accounts(id),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notif_status ON admin_notifications(status);

-- ============================================================
-- TOPIC 12: EMERGENCY CALL SLOT MANAGEMENT
-- ============================================================

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
  call_modes VARCHAR(20) NOT NULL DEFAULT 'audio',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recur_weekdays INT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_es_astrologer ON emergency_slots(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_es_date ON emergency_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_es_status ON emergency_slots(status);

CREATE TABLE IF NOT EXISTS emergency_request_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES emergency_slots(id),
  call_type VARCHAR(20) NOT NULL DEFAULT 'audio',
  status VARCHAR(40) NOT NULL DEFAULT 'requested',
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
