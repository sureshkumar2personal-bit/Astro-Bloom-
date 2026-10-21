import { useState, useEffect } from 'react';
import { getAstrologers } from '../api/astrologerApi';

const INITIAL_FILTERS = {
  search: '', specialization: '', language: '', minRating: '',
  onlineStatus: '', appointmentAvailable: false, emergencyAvailable: false, liveNow: false
};

export function useAstrologers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  useEffect(() => {
    setLoading(true);
    getAstrologers({ ...filters, page, limit: 20 })
      .then(r => { setItems(r.data.items); setTotal(r.data.pagination.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, page]);

  return { items, loading, page, setPage, total, filters, setFilters };
}
