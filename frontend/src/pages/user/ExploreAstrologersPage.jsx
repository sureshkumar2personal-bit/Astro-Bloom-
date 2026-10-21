import { Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import AstrologerCard from '../../components/astrologers/AstrologerCard';
import AstrologerFilters from '../../components/astrologers/AstrologerFilters';
import { useAstrologers } from '../../hooks/useAstrologers';

export default function ExploreAstrologersPage() {
  const { items, loading, page, setPage, total, filters, setFilters } = useAstrologers();

  return (
    <Shell>
      <section className="explore-page">
        <div className="explore-header">
          <p className="eyebrow">DISCOVER ASTROLOGERS</p>
          <h1>Find your guide among the stars</h1>
        </div>
        <div className="explore-layout">
          <AstrologerFilters filters={filters} setFilters={setFilters} setPage={setPage} />
          <div className="explore-results">
            {loading ? (
              <div className="explore-loading"><h2>Finding astrologers…</h2></div>
            ) : items.length === 0 ? (
              <div className="explore-empty"><h2>No astrologers found</h2><p>Try adjusting your filters.</p></div>
            ) : (
              <>
                <p className="results-count">{total} astrologer{total !== 1 ? 's' : ''} found</p>
                <div className="astro-grid">
                  {items.map(a => <AstrologerCard key={a.id} a={a} />)}
                </div>
              </>
            )}
            {total > 20 && (
              <div className="explore-pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                <span>Page {page}</span>
                <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
