import { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile, uploadCertificate, submitForReview } from '../api/profileApi';

export function useProfileForm() {
  const [form, setForm] = useState({
    displayName: '', professionalTitle: '', experienceYears: 0,
    shortBio: '', longBio: '', consultationStyle: '',
    languages: [], specializations: []
  });
  const [certs, setCerts] = useState([]);
  const [completeness, setCompleteness] = useState(0);
  const [profileStatus, setProfileStatus] = useState('draft');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(r => {
        const d = r.data;
        setForm({
          displayName: d.displayName || '', professionalTitle: d.professionalTitle || '',
          experienceYears: d.experienceYears || 0, shortBio: d.shortBio || '',
          longBio: d.longBio || '', consultationStyle: d.consultationStyle || '',
          languages: d.languages || [], specializations: d.specializations || []
        });
        setCerts(d.certificates || []);
        setCompleteness(d.profileCompleteness || 0);
        setProfileStatus(d.profileStatus || 'draft');
      })
      .catch(() => setMsg('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const toggleLang = l => setForm(f => ({ ...f, languages: f.languages.includes(l) ? f.languages.filter(v => v !== l) : [...f.languages, l] }));
  const toggleSpec = s => setForm(f => ({ ...f, specializations: f.specializations.includes(s) ? f.specializations.filter(v => v !== s) : [...f.specializations, s] }));

  const save = async (draft = true) => {
    setSaving(true); setMsg('');
    try {
      await updateMyProfile(form);
      if (!draft) {
        await submitForReview();
        setProfileStatus('under_review');
      }
      setMsg(draft ? 'Profile saved as draft.' : 'Profile submitted for review.');
    } catch (e) { setMsg(e.message); }
    setSaving(false);
  };

  const handleCertUpload = async (fd) => {
    try {
      const r = await uploadCertificate(fd);
      if (r.success) setCerts(c => [...c, r.data]);
    } catch {}
  };

  return { form, change, toggleLang, toggleSpec, certs, completeness, profileStatus, msg, loading, saving, save, handleCertUpload };
}
