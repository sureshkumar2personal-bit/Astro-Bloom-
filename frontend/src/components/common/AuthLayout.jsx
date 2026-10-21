import Shell from './Shell';

export default function AuthLayout({ eyebrow, title, description, children, aside }) {
  return (
    <Shell>
      <section className="auth-grid">
        <aside className="auth-aside">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {aside}
          <div className="moon">☾</div>
        </aside>
        <section className="auth-card">
          {children}
        </section>
      </section>
    </Shell>
  );
}
