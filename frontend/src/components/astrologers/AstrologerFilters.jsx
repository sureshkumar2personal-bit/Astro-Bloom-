import { ALL_SPECIALIZATIONS, ALL_LANGUAGES } from '../../utils/constants';

export default function AstrologerFilters({ filters, setFilters, setPage }) {
  const set = (key, val) => { setFilters({ ...filters, [key]: val }); setPage(1); };

  return (
    <aside className="explore-filters">
      <div className="filter-group">
        <label>Search</label>
        <input type="text" placeholder="Name or title..." value={filters.search} onChange={e => set('search', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Specialization</label>
        <select value={filters.specialization} onChange={e => set('specialization', e.target.value)}>
          <option value="">All specializations</option>
          {ALL_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Language</label>
        <select value={filters.language} onChange={e => set('language', e.target.value)}>
          <option value="">All languages</option>
          {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Minimum Rating</label>
        <select value={filters.minRating} onChange={e => set('minRating', e.target.value)}>
          <option value="">Any rating</option>
          <option value="4.5">4.5+</option>
          <option value="4">4.0+</option>
          <option value="3.5">3.5+</option>
        </select>
      </div>
      <div className="filter-group">
        <label>Status</label>
        <select value={filters.onlineStatus} onChange={e => set('onlineStatus', e.target.value)}>
          <option value="">Any status</option>
          <option value="online">Online</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
      </div>
      <div className="filter-checks">
        <label>
          <input type="checkbox" checked={filters.appointmentAvailable} onChange={e => set('appointmentAvailable', e.target.checked)} />
          Appointment Available
        </label>
        <label>
          <input type="checkbox" checked={filters.emergencyAvailable} onChange={e => set('emergencyAvailable', e.target.checked)} />
          Emergency Available
        </label>
        <label>
          <input type="checkbox" checked={filters.liveNow} onChange={e => set('liveNow', e.target.checked)} />
          Live Now
        </label>
      </div>
    </aside>
  );
}
