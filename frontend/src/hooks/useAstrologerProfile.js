import { useState, useEffect } from 'react';
import { getAstrologerProfile, getAstrologerReviews } from '../api/astrologerApi';

export function useAstrologerProfile(astrologerId) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!astrologerId) return;
    setLoading(true);
    getAstrologerProfile(astrologerId)
      .then(r => setProfile(r.data))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [astrologerId]);

  useEffect(() => {
    if (!astrologerId) return;
    getAstrologerReviews(astrologerId, 1, 5)
      .then(r => setReviews(r.data.items))
      .catch(() => {});
  }, [astrologerId]);

  return { profile, reviews, loading, error };
}
