import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from './pool.js';

const uid = () => crypto.randomUUID();
const genCode = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const seedAstrologers = [
  { fullName: 'Dr. Ravi Kumar', displayName: 'Dr. Ravi', professionalTitle: 'Vedic Astrologer', email: 'ravi@astro.com', mobile: '9000000001', experienceYears: 12, shortBio: 'Vedic astrologer specializing in marriage and career guidance with 12+ years of experience.', longBio: 'I am a certified Vedic astrologer with over 12 years of professional experience. My practice focuses on marriage compatibility, career direction, and Dosham analysis. I use traditional Parasari system combined with practical remedies that are easy to follow. Every consultation is confidential, respectful, and tailored to your life situation.', consultationStyle: 'Traditional Parasari with practical remedies', city: 'Chennai', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.87, reviewCount: 1240, completedConsultations: 3800, languages: ['Tamil', 'English'], specializations: ['Vedic Astrology', 'Marriage Matching', 'Career Astrology', 'Dosham Analysis'], onlineStatus: 'online', appointmentAvailable: true, emergencyAvailable: true, liveNow: false, questionAvailable: true, startingQuestionPrice: 199, startingCallPrice: 299 },
  { fullName: 'Meera Joshi', displayName: 'Meera Joshi', professionalTitle: 'Tarot & Career Astrologer', email: 'meera@astro.com', mobile: '9000000002', experienceYears: 8, shortBio: 'Tarot reader and career guidance specialist. Helping people find clarity in professional life.', longBio: 'With 8 years of experience in Tarot and career astrology, I help professionals navigate career transitions, business decisions, and personal growth. My approach combines intuitive Tarot reading with numerology insights to give you clear, actionable guidance.', consultationStyle: 'Intuitive and supportive', city: 'Mumbai', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.82, reviewCount: 890, completedConsultations: 2100, languages: ['Hindi', 'English'], specializations: ['Tarot', 'Career Astrology', 'Numerology'], onlineStatus: 'online', appointmentAvailable: true, emergencyAvailable: false, liveNow: true, questionAvailable: true, startingQuestionPrice: 149, startingCallPrice: 249 },
  { fullName: 'Suresh Babu', displayName: 'Suresh Babu', professionalTitle: 'KP Astrologer', email: 'suresh@astro.com', mobile: '9000000003', experienceYears: 15, shortBio: 'KP system expert with 15 years of experience in predictive astrology.', longBio: 'I am a dedicated KP astrologer with 15 years of experience in precise predictions using the Krishnamurti Paddhati system. My specializations include timing events, marriage matching, and property matters. I believe in evidence-based astrology backed by systematic analysis.', consultationStyle: 'Systematic KP analysis', city: 'Bangalore', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.75, reviewCount: 650, completedConsultations: 1900, languages: ['Kannada', 'English', 'Tamil'], specializations: ['KP Astrology', 'Property Astrology', 'Muhurtham'], onlineStatus: 'busy', appointmentAvailable: true, emergencyAvailable: false, liveNow: false, questionAvailable: true, startingQuestionPrice: 179, startingCallPrice: 279 },
  { fullName: 'Priya Nair', displayName: 'Priya Nair', professionalTitle: 'Numerologist & Vastu Expert', email: 'priya@astro.com', mobile: '9000000004', experienceYears: 6, shortBio: 'Numerology and Vastu consultant helping people align numbers and spaces with destiny.', longBio: 'As a certified numerologist and Vastu consultant with 6 years of experience, I help clients harmonize their living and workspaces while using numerology to uncover their life path. My sessions are interactive, practical, and designed to give you immediate actionable steps.', consultationStyle: 'Interactive and practical', city: 'Kochi', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.68, reviewCount: 420, completedConsultations: 1100, languages: ['Malayalam', 'English', 'Hindi'], specializations: ['Numerology', 'Vastu', 'Business Astrology'], onlineStatus: 'offline', appointmentAvailable: false, emergencyAvailable: false, liveNow: false, questionAvailable: true, startingQuestionPrice: 99, startingCallPrice: 199 },
  { fullName: 'Rajesh Iyer', displayName: 'Rajesh Iyer', professionalTitle: 'Nadi Astrologer', email: 'rajesh@astro.com', mobile: '9000000005', experienceYears: 20, shortBio: 'Nadi astrology specialist with two decades of experience in ancient palm leaf predictions.', longBio: 'With 20 years of dedicated practice in Nadi astrology, I bring the ancient wisdom of palm leaf manuscripts to modern life. My consultations cover life path, marriage, career, health, and spiritual growth. I have successfully guided thousands of seekers through life\u2019s most important decisions.', consultationStyle: 'Traditional Nadi with modern interpretation', city: 'Chennai', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.92, reviewCount: 2100, completedConsultations: 5200, languages: ['Tamil', 'English'], specializations: ['Nadi Astrology', 'Vedic Astrology', 'Dasa/Bhukthi Analysis', 'Remedy / Pariharam'], onlineStatus: 'online', appointmentAvailable: true, emergencyAvailable: true, liveNow: false, questionAvailable: true, startingQuestionPrice: 299, startingCallPrice: 499 },
  { fullName: 'Ananya Sharma', displayName: 'Ananya Sharma', professionalTitle: 'Tarot & Child Astrologer', email: 'ananya@astro.com', mobile: '9000000006', experienceYears: 5, shortBio: 'Tarot reader and child astrology specialist. Gentle guidance for families and children.', longBio: "I specialize in Tarot reading and child astrology, helping parents understand their child's strengths, challenges, and potential. With 5 years of experience, I provide compassionate guidance for family matters, child education planning, and parenting insights through astrological analysis.", consultationStyle: 'Gentle and family-focused', city: 'Hyderabad', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.71, reviewCount: 380, completedConsultations: 950, languages: ['Telugu', 'English', 'Hindi'], specializations: ['Tarot', 'Child Astrology', 'Education Astrology'], onlineStatus: 'online', appointmentAvailable: true, emergencyAvailable: false, liveNow: false, questionAvailable: true, startingQuestionPrice: 129, startingCallPrice: 199 },
  { fullName: 'Venkat Reddy', displayName: 'Venkat Reddy', professionalTitle: 'Transit & Dosham Expert', email: 'venkat@astro.com', mobile: '9000000007', experienceYears: 10, shortBio: 'Expert in transit predictions and Dosham analysis with a focus on remedial measures.', longBio: 'With a decade of experience in transit predictions and Dosham analysis, I provide accurate timing forecasts and effective remedies. My approach blends classical astrology with practical life guidance. I specialize in Sade Sati, Mangal Dosham, and planetary transit effects.', consultationStyle: 'Analytical and remedy-focused', city: 'Visakhapatnam', profileStatus: 'published', isProfilePublic: true, accountStatus: 'active', verificationStatus: 'approved', averageRating: 4.65, reviewCount: 520, completedConsultations: 1600, languages: ['Telugu', 'Tamil', 'English'], specializations: ['Transit Prediction', 'Dosham Analysis', 'Remedy / Pariharam', 'Vedic Astrology'], onlineStatus: 'offline', appointmentAvailable: false, emergencyAvailable: false, liveNow: false, questionAvailable: false, startingQuestionPrice: 159, startingCallPrice: 259 }
];

const sampleReviews = [
  { astrologerEmail: 'ravi@astro.com', rating: 5, text: 'Dr. Ravi gave very accurate predictions about my marriage. Highly recommended!', serviceType: 'question' },
  { astrologerEmail: 'ravi@astro.com', rating: 5, text: 'Excellent career guidance. His Dosham analysis was spot on.', serviceType: 'appointment' },
  { astrologerEmail: 'ravi@astro.com', rating: 4, text: 'Good consultation, very patient in explaining the chart.', serviceType: 'question' },
  { astrologerEmail: 'meera@astro.com', rating: 5, text: "Meera's tarot reading was incredibly insightful. Changed my perspective on life.", serviceType: 'question' },
  { astrologerEmail: 'meera@astro.com', rating: 4, text: 'Great career guidance session. Very supportive and clear.', serviceType: 'appointment' },
  { astrologerEmail: 'suresh@astro.com', rating: 5, text: 'KP analysis was very precise. Predicted job change within the timeframe.', serviceType: 'question' },
  { astrologerEmail: 'priya@astro.com', rating: 5, text: 'Vastu consultation transformed my office space. Business improved within weeks.', serviceType: 'appointment' },
  { astrologerEmail: 'rajesh@astro.com', rating: 5, text: 'Nadi astrology experience was profound. Life predictions matched perfectly.', serviceType: 'question' },
  { astrologerEmail: 'rajesh@astro.com', rating: 5, text: 'Most experienced astrologer I have consulted. True master of Nadi.', serviceType: 'appointment' },
  { astrologerEmail: 'ananya@astro.com', rating: 5, text: "Helped me understand my child's learning style through astrology. Very helpful.", serviceType: 'question' },
  { astrologerEmail: 'venkat@astro.com', rating: 4, text: 'Good transit prediction. Remedy suggestions were practical.', serviceType: 'question' }
];

const sampleCampaigns = [
  { astrologerEmail: 'ravi@astro.com', name: 'Marriage Question Campaign', desc: 'Ask marriage-related personal questions. Get accurate predictions from traditional Parasari system.', price: 199, totalSlots: 50, generalLimit: 20, individualLimit: 30, submissionMode: 'text', answerMode: 'text', deadlineHours: 48, categories: ['Marriage Matching', 'Vedic Astrology'], languages: ['Tamil', 'English'] },
  { astrologerEmail: 'meera@astro.com', name: 'Career Guidance Questions', desc: 'Professional career guidance through Tarot and Numerology. Get clarity on job changes, promotions, and business.', price: 149, totalSlots: 30, generalLimit: 10, individualLimit: 20, submissionMode: 'text', answerMode: 'voice', deadlineHours: 24, categories: ['Career Astrology', 'Numerology'], languages: ['Hindi', 'English'] },
  { astrologerEmail: 'suresh@astro.com', name: 'KP Prediction Questions', desc: 'Precise KP system predictions for timing events. Marriage, property, job changes.', price: 179, totalSlots: 40, generalLimit: 15, individualLimit: 25, submissionMode: 'text_or_voice', answerMode: 'text', deadlineHours: 36, categories: ['KP Astrology', 'Property Astrology', 'Muhurtham'], languages: ['Kannada', 'English', 'Tamil'] },
  { astrologerEmail: 'rajesh@astro.com', name: 'Nadi Astrology Questions', desc: 'Ancient palm leaf predictions. Life path, marriage, career, and spiritual growth guidance.', price: 299, totalSlots: 25, generalLimit: 10, individualLimit: 15, submissionMode: 'text', answerMode: 'text', deadlineHours: 72, categories: ['Nadi Astrology', 'Vedic Astrology', 'Remedy / Pariharam'], languages: ['Tamil', 'English'] },
  { astrologerEmail: 'ananya@astro.com', name: 'Child & Education Questions', desc: 'Understanding your child through astrology. Education planning and parenting insights.', price: 129, totalSlots: 35, generalLimit: 15, individualLimit: 20, submissionMode: 'text', answerMode: 'voice', deadlineHours: 48, categories: ['Child Astrology', 'Education Astrology', 'Tarot'], languages: ['Telugu', 'English', 'Hindi'] }
];

export async function seedDatabase() {
  for (const a of seedAstrologers) {
    const existing = await pool.query('SELECT id FROM astrologers WHERE email=$1', [a.email]);
    if (existing.rows.length > 0) { a.id = existing.rows[0].id; continue; }
    const id = uid();
    a.id = id;
    await pool.query(
      `INSERT INTO astrologers (id,full_name,display_name,professional_title,email,mobile,experience_years,short_bio,long_bio,consultation_style,city,profile_photo_url,account_status,verification_status,profile_status,is_profile_public,average_rating,review_count,completed_consultations,password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [id, a.fullName, a.displayName, a.professionalTitle, a.email, a.mobile, a.experienceYears, a.shortBio, a.longBio, a.consultationStyle, a.city, null, a.accountStatus, a.verificationStatus, a.profileStatus, a.isProfilePublic, a.averageRating, a.reviewCount, a.completedConsultations, await bcrypt.hash('password123', 10)]
    );
    for (const lang of a.languages) await pool.query('INSERT INTO astrologer_languages (astrologer_id,language) VALUES ($1,$2)', [id, lang]);
    for (const spec of a.specializations) await pool.query('INSERT INTO astrologer_specializations (astrologer_id,specialization) VALUES ($1,$2)', [id, spec]);
    await pool.query(
      'INSERT INTO astrologer_service_status (astrologer_id,online_status,appointment_available,emergency_available,live_now,question_available,starting_question_price,starting_call_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, a.onlineStatus, a.appointmentAvailable, a.emergencyAvailable, a.liveNow, a.questionAvailable, a.startingQuestionPrice, a.startingCallPrice]
    );
  }

  for (const r of sampleReviews) {
    const astro = seedAstrologers.find(a => a.email === r.astrologerEmail);
    if (!astro) continue;
    const existingReview = await pool.query('SELECT id FROM astrologer_reviews WHERE astrologer_id=$1 AND review_text=$2', [astro.id, r.text]);
    if (existingReview.rows.length > 0) continue;
    await pool.query('INSERT INTO astrologer_reviews (astrologer_id,user_id,rating,review_text,service_type) VALUES ($1,$2,$3,$4,$5)',
      [astro.id, uid(), r.rating, r.text, r.serviceType]);
  }

  // Seed campaigns
  for (const c of sampleCampaigns) {
    const astro = seedAstrologers.find(a => a.email === c.astrologerEmail);
    if (!astro) continue;
    const existing = await pool.query('SELECT id FROM question_campaigns WHERE astrologer_id=$1 AND campaign_name=$2', [astro.id, c.name]);
    if (existing.rows.length > 0) continue;
    const campId = uid();
    const code = genCode('CMP');
    await pool.query(
      `INSERT INTO question_campaigns (id,astrologer_id,campaign_name,campaign_code,description,price,total_slots,available_slots,general_question_limit,individual_question_limit,submission_mode,answer_mode,deadline_hours,status,start_at,end_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',NOW(),NOW() + INTERVAL '30 days')`,
      [campId, astro.id, c.name, code, c.desc, c.price, c.totalSlots, c.totalSlots, c.generalLimit, c.individualLimit, c.submissionMode, c.answerMode, c.deadlineHours]
    );
    for (const cat of c.categories) await pool.query('INSERT INTO question_campaign_categories (campaign_id,category) VALUES ($1,$2)', [campId, cat]);
    for (const lang of c.languages) await pool.query('INSERT INTO question_campaign_languages (campaign_id,language) VALUES ($1,$2)', [campId, lang]);
  }

  // Seed subscription plans for all astrologers
  const planDefs = [
    { planCode: 'silver', planName: 'Silver', price: 199, durationDays: 30, benefits: [{ benefitType: 'free_question', benefitName: 'Free Questions', benefitValue: 2, description: '2 free text questions per month' }, { benefitType: 'priority_queue', benefitName: 'Priority Queue', benefitValue: 1, description: 'Answers within 12 hours' }, { benefitType: 'monthly_prediction', benefitName: 'Monthly Prediction', benefitValue: 1, description: 'Personalized monthly horoscope' }] },
    { planCode: 'gold', planName: 'Gold', price: 499, durationDays: 30, benefits: [{ benefitType: 'free_question', benefitName: 'Free Questions', benefitValue: 5, description: '5 free text questions per month' }, { benefitType: 'priority_queue', benefitName: 'Priority Queue', benefitValue: 1, description: 'Answers within 6 hours' }, { benefitType: 'monthly_prediction', benefitName: 'Monthly Prediction', benefitValue: 1, description: 'Personalized monthly horoscope' }, { benefitType: 'voice_note', benefitName: 'Voice Notes', benefitValue: 2, description: '2 voice note responses per month' }] },
    { planCode: 'platinum', planName: 'Platinum', price: 999, durationDays: 30, benefits: [{ benefitType: 'free_question', benefitName: 'Free Questions', benefitValue: 10, description: '10 free text questions per month' }, { benefitType: 'priority_queue', benefitName: 'Priority Queue', benefitValue: 1, description: 'Answers within 3 hours' }, { benefitType: 'monthly_prediction', benefitName: 'Monthly Prediction', benefitValue: 1, description: 'Personalized monthly horoscope' }, { benefitType: 'voice_note', benefitName: 'Voice Notes', benefitValue: 5, description: '5 voice note responses per month' }, { benefitType: 'free_reading', benefitName: 'Free Readings', benefitValue: 1, description: '1 free detailed chart reading per month' }] }
  ];

  for (const astro of seedAstrologers) {
    const existingPlan = await pool.query('SELECT id FROM subscription_plans WHERE astrologer_id=$1 LIMIT 1', [astro.id]);
    if (existingPlan.rows.length > 0) continue;
    for (const pd of planDefs) {
      const planId = uid();
      await pool.query(
        `INSERT INTO subscription_plans (id,astrologer_id,plan_name,plan_code,price,duration_days,is_active,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
        [planId, astro.id, pd.planName, pd.planCode, pd.price, pd.durationDays, pd.planCode === 'silver' ? 1 : pd.planCode === 'gold' ? 2 : 3]);
      for (const b of pd.benefits) {
        await pool.query(
          `INSERT INTO subscription_plan_benefits (plan_id,benefit_type,benefit_name,benefit_value,description,is_active)
           VALUES ($1,$2,$3,$4,$5,true)`,
          [planId, b.benefitType, b.benefitName, b.benefitValue, b.description]);
      }
    }
  }

  // Seed demo user wallet (find or create a demo user for testing)
  const demoUserRes = await pool.query("SELECT id FROM users WHERE mobile='8888888888'");
  if (demoUserRes.rows.length) {
    const userId = demoUserRes.rows[0].id;
    const existingWallet = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [userId]);
    if (!existingWallet.rows.length) {
      await pool.query("INSERT INTO wallet_accounts (owner_type,owner_id,available_balance) VALUES ('user',$1,5000)", [userId]);
    }
  }

  // Seed live sessions
  const liveSessions = [
    { astrologerEmail: 'ravi@astro.com', title: 'Sani Peyarchi Special Prediction', description: 'Live explanation of Saturn transit effects for all 12 Rasis. Join to understand the impact on your career, health, and relationships.', topic: 'Sani Peyarchi', language: 'Tamil', audienceType: 'public', entryType: 'free', entryPrice: 0, questionMode: 'paid_question_slots', questionPrice: 199, maxQuestionSlots: 20, status: 'live', minutesAgo: -15 },
    { astrologerEmail: 'meera@astro.com', title: 'Career Guidance Q&A Live', description: 'Professional career guidance through Tarot and Numerology. Ask your career questions live.', topic: 'Career', language: 'Hindi', audienceType: 'public', entryType: 'free', entryPrice: 0, questionMode: 'free_questions', questionPrice: 0, maxQuestionSlots: 0, status: 'scheduled', minutesAgo: 120 },
    { astrologerEmail: 'rajesh@astro.com', title: 'Nadi Astrology — Life Path Reading', description: 'Ancient Nadi astrology insights for your life path. Subscriber-only premium session with personal predictions.', topic: 'Marriage', language: 'Tamil', audienceType: 'subscribers_only', entryType: 'subscription_required', entryPrice: 0, questionMode: 'paid_question_slots', questionPrice: 299, maxQuestionSlots: 10, status: 'scheduled', minutesAgo: 240 },
    { astrologerEmail: 'priya@astro.com', title: 'Numerology & Vastu Live', description: 'Free live session on numerology basics and Vastu tips for your home.', topic: 'Numerology', language: 'English', audienceType: 'public', entryType: 'free', entryPrice: 0, questionMode: 'no_questions', questionPrice: 0, maxQuestionSlots: 0, status: 'scheduled', minutesAgo: 480 }
  ];

  // Seed platform settings
  const settings = [
    { key: 'platform_commission_percent', value: 20, category: 'finance', desc: 'Platform commission percentage on all transactions' },
    { key: 'gst_percent', value: 18, category: 'finance', desc: 'GST/Tax percentage' },
    { key: 'escrow_auto_release_hours', value: 72, category: 'finance', desc: 'Hours after which escrow auto-releases' },
    { key: 'question_deadline_hours', value: 48, category: 'questions', desc: 'Default deadline for astrologer to answer' },
    { key: 'appointment_cancellation_hours', value: 24, category: 'appointments', desc: 'Hours before appointment for free cancellation' },
    { key: 'emergency_timeout_seconds', value: 60, category: 'emergency', desc: 'Seconds for astrologer to accept emergency call' },
    { key: 'ai_chat_free_limit', value: 5, category: 'ai_chat', desc: 'Free AI chat questions per user' },
    { key: 'maintenance_mode', value: false, category: 'platform', desc: 'Platform maintenance mode toggle' },
    { key: 'live_question_rules', value: { maxTextLength: 500, allowVoice: true }, category: 'live', desc: 'Live question submission rules' },
    { key: 'refund_policy', value: { autoRefundHours: 48, maxRefundPercent: 100 }, category: 'finance', desc: 'Refund policy configuration' }
  ];
  for (const s of settings) {
    const existing = await pool.query('SELECT id FROM platform_settings WHERE setting_key=$1', [s.key]);
    if (existing.rows.length === 0) {
      await pool.query(
        "INSERT INTO platform_settings (id,setting_key,setting_value,category,description) VALUES ($1,$2,$3,$4,$5)",
        [uid(), s.key, JSON.stringify(s.value), s.category, s.desc]
      );
    }
  }

  for (const ls of liveSessions) {
    const astro = seedAstrologers.find(a => a.email === ls.astrologerEmail);
    if (!astro) continue;
    const existing = await pool.query('SELECT id FROM live_sessions WHERE astrologer_id=$1 AND title=$2', [astro.id, ls.title]);
    if (existing.rows.length > 0) continue;
    const id = uid();
    const roomId = `room_${id.slice(0, 8)}`;
    const scheduledAt = new Date(Date.now() + ls.minutesAgo * 60000);
    const actualStart = ls.status === 'live' ? new Date(Date.now() + ls.minutesAgo * 60000) : null;
    await pool.query(
      `INSERT INTO live_sessions (id,astrologer_id,title,description,topic,language,audience_type,entry_type,entry_price,question_mode,question_price,max_question_slots,scheduled_start_at,status,stream_room_id,actual_start_at,viewer_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [id, astro.id, ls.title, ls.description, ls.topic, ls.language, ls.audienceType, ls.entryType, ls.entryPrice, ls.questionMode, ls.questionPrice, ls.maxQuestionSlots, scheduledAt, ls.status, roomId, actualStart, ls.status === 'live' ? 127 : 0]
    );
    // Update astrologer live_now flag for live sessions
    if (ls.status === 'live') {
      await pool.query("UPDATE astrologer_service_status SET live_now=true,updated_at=NOW() WHERE astrologer_id=$1", [astro.id]);
    }
  }
}
