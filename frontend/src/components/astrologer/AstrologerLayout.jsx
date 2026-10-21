import AstrologerHeader from './AstrologerHeader';

export default function AstrologerLayout({ children }) {
  return (
    <div className="astro-layout min-h-screen flex flex-col">
      <AstrologerHeader />
      <main className="astro-layout-main flex-1 w-full">
        {children}
      </main>
      <footer className="astro-layout-footer border-t border-[#e5dfd8] text-center text-xs text-[#817987] py-6">
        <div className="page-container">
          &copy; 2026 CosmicConnect <span>&bull;</span> Guidance written in the stars
        </div>
      </footer>
    </div>
  );
}
