import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuthGet } from '../../api/client';

export default function QuickAskButton() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const r = await apiAuthGet('/user/question-campaigns/active');
      if (r.data && r.data.length > 0) {
        nav(`/user/question-purchase/${r.data[0].id}`, { state: { prefillQuestion: question } });
      } else {
        nav('/user/questions', { state: { newQuestion: question } });
      }
    } catch {
      nav('/user/questions');
    } finally {
      setSubmitting(false);
      setOpen(false);
      setQuestion('');
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
        borderRadius: '50%', background: 'var(--purple)', color: '#fff',
        border: 'none', cursor: 'pointer', fontSize: 28, boxShadow: '0 4px 16px rgba(92,59,139,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        transition: 'transform 0.2s'
      }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        ✦
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }} onClick={() => setOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>Quick Ask</h2>
            <p style={{ fontSize: 13, color: '#6e6573', margin: '0 0 20px' }}>Ask any question — we'll connect you with an astrologer</p>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={4}
              placeholder="Type your question here..."
              style={{ width: '100%', padding: 12, border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '10px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!question.trim() || submitting}
                style={{ padding: '10px 24px', background: question.trim() ? 'var(--purple)' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: question.trim() ? 'pointer' : 'not-allowed' }}>
                {submitting ? 'Sending...' : 'Ask Now →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
