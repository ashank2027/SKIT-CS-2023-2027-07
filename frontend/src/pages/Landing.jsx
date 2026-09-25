import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📊',
    title: 'Carbon Intelligence Dashboard',
    description: 'Real-time enterprise GHG emissions accounting with automated computation engine and live telemetry.',
    color: 'var(--accent-primary-dim)',
  },
  {
    icon: '🔢',
    title: 'Carbon Calculator',
    description: 'Precise CO2e computation using validated emission factors across Scope 1, 2, and 3 categories.',
    color: 'var(--accent-secondary-dim)',
  },
  {
    icon: '📈',
    title: 'Analytics & Insights',
    description: 'Advanced multi-dimensional analysis by time, category, location, industry, and sector.',
    color: 'var(--accent-tertiary-dim)',
  },
  {
    icon: '🤖',
    title: 'AI Copilot',
    description: 'Intelligent assistant powered by Gemini for sustainability recommendations and data insights.',
    color: 'var(--accent-warning-dim)',
  },
  {
    icon: '🔮',
    title: 'Predictive Forecasting',
    description: '90-day AI-driven emission trajectory projection with neural predictive variance analysis.',
    color: 'var(--accent-primary-dim)',
  },
  {
    icon: '⚡',
    title: 'C++ Kernel Engine',
    description: 'OS-inspired scheduling with Priority and Round Robin algorithms for computational background tasks.',
    color: 'var(--accent-secondary-dim)',
  },
]

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🌿</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>EcoInsight</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/login" className="btn btn-outline">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content fade-in">
          <div className="realtime-badge" style={{ margin: '0 auto 24px' }}>
            <span className="dot"></span>
            Enterprise Carbon Intelligence Platform
          </div>
          <h1>Transform Carbon Data Into Actionable Climate Intelligence</h1>
          <p>
            AI-powered GHG emissions accounting, real-time analytics, predictive forecasting,
            and automated sustainability reporting — built on an OS-inspired C++ scheduling engine.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              🚀 Start Free Trial
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              View Live Demo
            </Link>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: '48px', justifyContent: 'center',
            marginTop: '48px', flexWrap: 'wrap',
          }}>
            {[
              { value: '12,450', label: 'tCO₂e Tracked' },
              { value: '99.8%', label: 'Kernel Efficiency' },
              { value: '<12ms', label: 'Scheduler Latency' },
              { value: '124', label: 'CSVs Ingested Today' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '24px',
                  fontWeight: 700, color: 'var(--accent-primary)',
                }}>{stat.value}</div>
                <div style={{
                  fontSize: '11px', color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px',
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <h2>Enterprise-Grade Carbon Management</h2>
        <div className="landing-feature-grid">
          {features.map((feature, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: feature.color }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '100px 48px', textAlign: 'center',
        background: 'linear-gradient(180deg, transparent, rgba(0, 229, 160, 0.03))',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
          Ready to Decarbonize?
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
          Join organizations using EcoInsight to achieve net-zero targets with data-driven precision.
        </p>
        <Link to="/register" className="btn btn-primary btn-lg">
          🌍 Get Started Now
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 48px', borderTop: '1px solid var(--border-primary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '12px', color: 'var(--text-tertiary)',
      }}>
        <span>© 2026 EcoInsight. Carbon Intelligence Platform.</span>
        <span>Built by Ashank • Daksh • Chetan • Bhavya</span>
      </footer>
    </div>
  )
}
