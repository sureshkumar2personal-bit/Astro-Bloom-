import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createContent, updateContent, publishContent } from '../../api/contentApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const CONTENT_TYPES = [
  { value: 'public_prediction', label: 'Public Prediction' },
  { value: 'follower_update', label: 'Follower Update' },
  { value: 'subscriber_perk', label: 'Subscriber Perk' },
  { value: 'monthly_prediction', label: 'Monthly Prediction' },
  { value: 'festival_content', label: 'Festival Content' },
  { value: 'transit_content', label: 'Transit / Peyarchi Content' },
  { value: 'live_announcement', label: 'Live Session Announcement' },
  { value: 'atonement_notification', label: 'Atonement / Remedy' },
  { value: 'educational_content', label: 'Educational Astrology' },
  { value: 'selected_user_message', label: 'Selected User Message' }
];
const CATEGORIES = [
  'Daily Rasi Palan', 'Weekly Rasi Palan', 'Monthly Rasi Palan', 'Yearly Prediction',
  'Nakshatra Prediction', 'Sani Peyarchi', 'Guru Peyarchi', 'Rahu-Ketu Peyarchi',
  'Eclipse Effects', 'Amavasai', 'Pournami', 'Festival Guidance',
  'Marriage Prediction', 'Career Prediction', 'Business Prediction', 'Family Guidance',
  'Child Astrology', 'Numerology', 'Muhurtham', 'Dosham Explanation',
  'Remedy / Pariharam', 'Pooja Guidance', 'Atonement Guidance', 'Astrology Learning'
];
const AUDIENCES = [
  { value: 'public', label: 'Public (All Users)' },
  { value: 'followers', label: 'Followers Only' },
  { value: 'all_subscribers', label: 'All Subscribers' },
  { value: 'silver_subscribers', label: 'Silver Subscribers' },
  { value: 'gold_subscribers', label: 'Gold Subscribers' },
  { value: 'platinum_subscribers', label: 'Platinum Subscribers' },
  { value: 'selected_users', label: 'Selected Users' }
];

export default function AstrologerContentCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', shortDescription: '', body: '', contentType: 'public_prediction', astrologyCategory: '',
    language: 'Tamil', audienceType: 'public', planType: '', scheduledAt: ''
  });
  const [publishType, setPublishType] = useState('draft');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, publishType };
      if (publishType === 'schedule' && form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      const result = await createContent(payload);
      if (publishType !== 'draft') {
        await publishContent(result.data.contentId, { publishNow: publishType === 'publish_now', scheduledAt: publishType === 'schedule' ? form.scheduledAt : null, notifyUsers: true });
      }
      navigate('/astrologer/contents');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">CONTENT CREATION</p>
          <h1>Create Content</h1>
        </div>
        <form className="fc-form" style={{ maxWidth: 700 }} onSubmit={handleSubmit}>
          <label>Content Title*<input name="title" value={form.title} onChange={updateField} required placeholder="e.g. Sani Peyarchi 2026 Special Prediction" /></label>

          <label>Content Type*
            <select name="contentType" value={form.contentType} onChange={updateField}>
              {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label>Astrology Category
            <select name="astrologyCategory" value={form.astrologyCategory} onChange={updateField}>
              <option value="">Select Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label>Language
            <select name="language" value={form.language} onChange={updateField}>
              <option value="Tamil">Tamil</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Kannada">Kannada</option>
            </select>
          </label>

          <label>Short Description<textarea name="shortDescription" value={form.shortDescription} onChange={updateField} rows={2} placeholder="Brief summary for card display" /></label>

          <label>Full Content Body*<textarea name="body" value={form.body} onChange={updateField} rows={12} required placeholder="Write your full content here..." /></label>

          <label>Target Audience*
            <select name="audienceType" value={form.audienceType} onChange={updateField}>
              {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </label>

          {['silver_subscribers', 'gold_subscribers', 'platinum_subscribers'].includes(form.audienceType) && (
            <label>Plan Type*
              <select name="planType" value={form.planType} onChange={updateField} required>
                <option value="">Select Plan</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </label>
          )}

          <label>Schedule Date & Time
            <input type="datetime-local" name="scheduledAt" value={form.scheduledAt} onChange={updateField} />
          </label>

          {error && <p className="fc-error">{error}</p>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={() => { setPublishType('draft'); }} style={publishType === 'draft' ? { borderColor: 'var(--purple)', background: '#f3eef8' } : {}}>Save Draft</button>
            <button type="button" className="btn-secondary" onClick={() => { setPublishType('publish_now'); }} style={publishType === 'publish_now' ? { borderColor: '#27ae60', background: '#eafaf1' } : {}}>Publish Now</button>
            <button type="button" className="btn-secondary" onClick={() => { setPublishType('schedule'); }} style={publishType === 'schedule' ? { borderColor: '#db9a40', background: '#fef9f0' } : {}}>Schedule</button>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : publishType === 'draft' ? 'Save Draft' : publishType === 'schedule' ? 'Schedule Content' : 'Publish Content'}
          </button>
        </form>
      </section>
    </AstrologerLayout>
  );
}
