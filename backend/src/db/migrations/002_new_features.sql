-- Daily Horoscope
CREATE TABLE IF NOT EXISTS daily_horoscopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zodiac_sign VARCHAR(20) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  prediction TEXT NOT NULL,
  love_rating INT DEFAULT 0,
  career_rating INT DEFAULT 0,
  health_rating INT DEFAULT 0,
  luck_rating INT DEFAULT 0,
  lucky_color VARCHAR(30),
  lucky_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zodiac_sign, date)
);

-- Astrologer Reviews
CREATE TABLE IF NOT EXISTS astrologer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_type VARCHAR(30) NOT NULL,
  consultation_id UUID,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(120),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_astrologer ON astrologer_reviews(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON astrologer_reviews(user_id);

-- Astrologer Availability Schedule
CREATE TABLE IF NOT EXISTS astrologer_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(astrologer_id, day_of_week)
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  bank_name VARCHAR(100),
  account_number VARCHAR(30),
  ifsc_code VARCHAR(20),
  account_holder_name VARCHAR(100),
  upi_id VARCHAR(60),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_astrologer ON withdrawal_requests(astrologer_id);

-- Response Templates
CREATE TABLE IF NOT EXISTS response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(30) DEFAULT 'general',
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_astrologer ON response_templates(astrologer_id);

-- Client Notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_astro ON client_notes(astrologer_id, user_id);

-- Consultation History (for users)
CREATE TABLE IF NOT EXISTS consultation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID REFERENCES astrologers(id),
  type VARCHAR(30) NOT NULL,
  reference_id UUID,
  title VARCHAR(200),
  summary TEXT,
  amount_spent NUMERIC(10,2) DEFAULT 0,
  rating INT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_history_user ON consultation_history(user_id, created_at DESC);

-- Notification Unread Counts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(300),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Withdrawal - update astrologer wallet available balance tracking
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallet_accounts(id),
  owner_type VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  service_type VARCHAR(30),
  service_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) ON CONFLICT DO NOTHING;
