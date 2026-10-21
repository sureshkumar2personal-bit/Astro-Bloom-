import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createAtonement, getAstrologerAtonementDetail, updateAtonement, updateAtonementStatus, notifyAtonementUser } from '../../api/atonementApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const REMEDY_TYPES = [
  { value: 'mantra_chanting', label: 'Mantra Chanting' }, { value: 'temple_visit', label: 'Temple Visit' },
  { value: 'donation', label: 'Donation' }, { value: 'fasting', label: 'Fasting' },
  { value: 'pooja', label: 'Pooja' }, { value: 'homam', label: 'Homam' },
  { value: 'digital_atonement', label: 'Digital Atonement' }, { value: 'festival_pariharam', label: 'Festival Pariharam' },
  { value: 'dosham_remedy', label: 'Dosham Remedy' }, { value: 'sani_pariharam', label: 'Sani Pariharam' },
  { value: 'rahu_ketu_pariharam', label: 'Rahu/Ketu Pariharam' }, { value: 'sevvai_remedy', label: 'Sevvai/Manglik Remedy' },
  { value: 'marriage_delay_remedy', label: 'Marriage Delay Remedy' }, { value: 'career_obstacle_remedy', label: 'Career Obstacle Remedy' },
  { value: 'family_peace_remedy', label: 'Family Peace Remedy' }
];
const SOURCE_TYPES = [
  { value: 'text_question', label: 'Text Question' }, { value: 'appointment', label: 'Appointment Call' },
  { value: 'emergency_call', label: 'Emergency Call' }, { value: 'live_session', label: 'Live Session' },
  { value: 'ai_chat', label: 'AI Chat' }, { value: 'free_calculation', label: 'Free Calculation' },
  { value: 'platform_event', label: 'Platform Event' }, { value: 'manual', label: 'Manual' }
];
const STATUSES = ['draft', 'prescribed', 'notified', 'pending_user_action', 'payment_pending', 'paid', 'in_progress', 'proof_uploaded', 'completed', 'cancelled', 'expired', 'disputed', 'refunded'];

function formatLabel(s) { return (s || '').replace(/_/g, ' '); }

export default function IndividualAtonementTrackingPage() {
  const { atonementId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!atonementId;
  const [form, setForm] = useState({
    userId: '', sourceType: 'text_question', sourceId: '', title: '', remedyType: 'pooja',
    problemCategory: '', astrologyReason: '', instructions: '', isPaid: false, price: 0,
    proofRequired: false, expectedCompletionDate: ''
  });
  const [status, setStatus] = useState('prescribed');
  const [statusNote, setStatusNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingData, setExistingData] = useState(null);

  useEffect(() => {
    if (isEdit) {
      getAstrologerAtonementDetail(atonementId)
        .then(r => {
          const d = r.data;
          setExistingData(d);
          setForm({
            userId: d.user_id, sourceType: d.source_type, sourceId: d.source_id || '', title: d.title,
            remedyType: d.remedy_type, problemCategory: d.problem_category || '', astrologyReason: d.astrology_reason || '',
            instructions: d.instructions, isPaid: d.is_paid, price: d.price, proofRequired: d.proof_required,
            expectedCompletionDate: d.expected_completion_date ? d.expected_completion_date.split('T')[0] : ''
          });
          setStatus(d.status);
        })
        .catch(e => setError(e.message));
    }
  }, [atonementId, isEdit]);

  function updateField(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) {
        await updateAtonement(atonementId, { ...form, price: Number(form.price) });
      } else {
        const res = await createAtonement({ ...form, price: Number(form.price) });
        navigate(`/astrologer/atonements/${res.data.atonementId}`);
        return;
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleStatusUpdate() {
    try {
      await updateAtonementStatus(atonementId, { status, note: statusNote });
      setExistingData(prev => ({ ...prev, status }));
      setStatusNote('');
    } catch (e) { alert(e.message); }
  }

  async function handleNotify() {
    try {
      await notifyAtonementUser(atonementId);
      alert('User notified successfully');
    } catch (e) { alert(e.message); }
  }

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="atonement-detail-wrap">
          <div className="page-header-block">
            <p className="eyebrow">{isEdit ? 'EDIT REMEDY' : 'PRESCRIBE REMEDY'}</p>
            <h1>{isEdit ? existingData?.title || 'Edit Remedy' : 'Create New Remedy'}</h1>
          </div>

          {isEdit && existingData && (
            <div className="atonement-user-summary">
              <div><small>User</small><b>{existingData.user_name || 'Unknown'}</b></div>
              <div><small>Source</small><b>{formatLabel(existingData.source_type)}</b></div>
              <div><small>Status</small><b>{formatLabel(existingData.status)}</b></div>
            </div>
          )}

          <form className="atonement-form" onSubmit={handleSubmit}>
            {!isEdit && (
              <label>User ID*<input name="userId" value={form.userId} onChange={updateField} required placeholder="User UUID" /></label>
            )}

            <label>Remedy Title*<input name="title" value={form.title} onChange={updateField} required placeholder="e.g. Sani Pariharam for Career Growth" /></label>

            <div className="atonement-form-row">
              <label>Remedy Type*
                <select name="remedyType" value={form.remedyType} onChange={updateField}>
                  {REMEDY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label>Source Type*
                <select name="sourceType" value={form.sourceType} onChange={updateField}>
                  {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>

            <label>Problem Category<input name="problemCategory" value={form.problemCategory} onChange={updateField} placeholder="e.g. Career Block, Marriage Delay" /></label>
            <label>Astrology Reason<textarea name="astrologyReason" value={form.astrologyReason} onChange={updateField} rows={3} placeholder="e.g. Suggested due to Sani influence during current period" /></label>
            <label>Instructions*<textarea name="instructions" value={form.instructions} onChange={updateField} rows={5} required placeholder="Step-by-step instructions for the user..." /></label>

            <div className="atonement-form-row">
              <label className="atonement-checkbox"><input type="checkbox" name="isPaid" checked={form.isPaid} onChange={updateField} /> Paid Remedy</label>
              {form.isPaid && <label>Price (₹)<input name="price" type="number" value={form.price} onChange={updateField} min="1" /></label>}
            </div>

            <div className="atonement-form-row">
              <label className="atonement-checkbox"><input type="checkbox" name="proofRequired" checked={form.proofRequired} onChange={updateField} /> Proof Required</label>
              <label>Expected Completion Date<input name="expectedCompletionDate" type="date" value={form.expectedCompletionDate} onChange={updateField} /></label>
            </div>

            {error && <p className="atonement-error">{error}</p>}

            <div className="atonement-form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Remedy' : 'Prescribe Remedy'}
              </button>
            </div>
          </form>

          {isEdit && existingData && (
            <div className="atonement-status-update-box">
              <h3>Update Status</h3>
              <div className="atonement-form-row">
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
                <button className="btn-primary" onClick={handleStatusUpdate}>Update</button>
              </div>
              <textarea placeholder="Status note (optional)" value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={2} style={{ marginTop: 10 }} />
              <button className="btn-secondary" onClick={handleNotify} style={{ marginTop: 10 }}>Notify User</button>
            </div>
          )}
        </div>
      </section>
    </AstrologerLayout>
  );
}
