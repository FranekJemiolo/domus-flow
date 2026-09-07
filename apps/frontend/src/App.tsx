/**
 * DomusFlow App Root
 *
 * This is the Milestone 1 placeholder — full routing, layout, and pages
 * are implemented in Milestone 4. This renders a branded loading/coming-soon
 * screen that confirms the build pipeline works end-to-end.
 */

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: '#f8fafc',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
        }}
        id="domus-flow-logo"
      >
        🏠
      </div>

      {/* Brand */}
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
        id="app-title"
      >
        DomusFlow
      </h1>

      <p
        style={{
          fontSize: '1.125rem',
          color: '#94a3b8',
          marginBottom: '2rem',
          maxWidth: '480px',
          lineHeight: '1.6',
        }}
        id="app-tagline"
      >
        Maintenance Management for Landlords, Tenants & Contractors
      </p>

      {/* Mode Badge */}
      <div
        style={{
          padding: '0.5rem 1.25rem',
          borderRadius: '999px',
          background: isDemoMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${isDemoMode ? 'rgba(99, 102, 241, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
          color: isDemoMode ? '#a5b4fc' : '#86efac',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '3rem',
          letterSpacing: '0.05em',
        }}
        id="mode-badge"
      >
        {isDemoMode ? '🎭 DEMO MODE — No backend required' : '🔗 CONNECTED MODE'}
      </div>

      {/* Milestone Status */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          maxWidth: '480px',
          width: '100%',
          marginBottom: '2rem',
        }}
        id="milestone-status"
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#e2e8f0',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Implementation Progress
        </h2>
        {[
          { label: 'Monorepo Setup & CI/CD', done: true },
          { label: 'Backend & Database Layer', done: false },
          { label: 'Frontend Data Service & Demo Mode', done: false },
          { label: 'Core UI & Routing', done: false },
          { label: 'Ticket Lifecycle & Media', done: false },
          { label: 'Dual-Channel Chat System', done: false },
          { label: 'PWA & Native Packaging', done: false },
        ].map((milestone, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: index < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{milestone.done ? '✅' : '⏳'}</span>
            <span
              style={{
                fontSize: '0.875rem',
                color: milestone.done ? '#86efac' : '#64748b',
                fontWeight: milestone.done ? '600' : '400',
              }}
            >
              {index + 1}. {milestone.label}
            </span>
          </div>
        ))}
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="https://github.com/FranekJemiolo/domus-flow"
          target="_blank"
          rel="noopener noreferrer"
          id="github-link"
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          📦 View Repository
        </a>
        <a
          href="https://github.com/FranekJemiolo/domus-flow/actions"
          target="_blank"
          rel="noopener noreferrer"
          id="ci-link"
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          ⚡ CI / CD Pipeline
        </a>
      </div>
    </div>
  );
}

export default App;
