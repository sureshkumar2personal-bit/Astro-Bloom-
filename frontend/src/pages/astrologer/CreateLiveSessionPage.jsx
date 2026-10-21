import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { createLiveSession } from '../../api/astrologerLiveApi';

const TOPICS = ['Daily Prediction', 'Sani Peyarchi', 'Guru Peyarchi', 'Marriage', 'Career', 'Remedy', 'Numerology', 'General'];
const AUDIENCES = ['public', 'followers_only', 'subscribers_only', 'paid_users'];
const ENTRY_TYPES = ['free', 'paid', 'subscription_required', 'follower_required'];
const QUESTION_MODES = ['no_questions', 'free_questions', 'paid_question_slots'];
const LANGUAGES = ['Tamil', 'English', 'Hindi', 'Telugu', 'Kannada', 'Malayalam'];

export default function CreateLiveSessionPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', topic: 'Daily Prediction', language: 'Tamil',
    audienceType: 'public', entryType: 'free', entryPrice: 0,
    questionMode: 'no_questions', questionPrice: 0, maxQuestionSlots: 0,
    scheduledStartAt: '', scheduledEndAt: ''
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.scheduledStartAt) { setError('Title and schedule time are required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createLiveSession(form);
      navigate('/astrologer/live');
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <Shell>
      <section className="create-live-page">
        <Link className="back-link" to="/astrologer/live">← Back to live sessions</Link>
        <p className="eyebrow">CREATE LIVE</p>
        <h1>Create Live Session</h1>

        <div className="edit-form" style={{ maxWidth: 800 }}>
          <form onSubmit={handleSubmit}>
            <div className="edit-section">
              <h2>Basic Details</h2>
              <div className="form-group">
                <label>Live Title</label>
                <input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Sani Peyarchi Special Prediction" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe what this live session is about..." />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Topic</label>
                  <select value={form.topic} onChange={e => update('topic', e.target.value)}>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Language</label>
                  <select value={form.language} onChange={e => update('language', e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Scheduled Start</label>
                  <input type="datetime-local" value={form.scheduledStartAt} onChange={e => update('scheduledStartAt', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Scheduled End (optional)</label>
                  <input type="datetime-local" value={form.scheduledEndAt} onChange={e => update('scheduledEndAt', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="edit-section">
              <h2>Access & Pricing</h2>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Audience</label>
                  <select value={form.audienceType} onChange={e => update('audienceType', e.target.value)}>
                    {AUDIENCES.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Entry Type</label>
                  <select value={form.entryType} onChange={e => update('entryType', e.target.value)}>
                    {ENTRY_TYPES.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              {form.entryType === 'paid' && (
                <div className="form-group">
                  <label>Entry Price (₹)</label>
                  <input type="number" min="1" value={form.entryPrice} onChange={e => update('entryPrice', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            <div className="edit-section">
              <h2>Live Questions</h2>
              <div className="form-group">
                <label>Question Mode</label>
                <select value={form.questionMode} onChange={e => update('questionMode', e.target.value)}>
                  {QUESTION_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {form.questionMode === 'paid_question_slots' && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Question Price (₹)</label>
                    <input type="number" min="1" value={form.questionPrice} onChange={e => update('questionPrice', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Max Question Slots</label>
                    <input type="number" min="1" value={form.maxQuestionSlots} onChange={e => update('maxQuestionSlots', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="edit-actions">
              <button className="btn-submit" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Live Session'}</button>
              <Link className="btn-save" to="/astrologer/live">Cancel</Link>
            </div>
          </form>
        </div>
      </section>
    </Shell>
  );
}
