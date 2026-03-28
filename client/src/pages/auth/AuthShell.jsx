import { ShieldCheck, Sparkles, Warehouse } from 'lucide-react';

const AuthShell = ({ title, description, children, footer }) => (
  <div className="auth-layout">
    <section className="auth-hero">
      <div className="auth-brand">
        <span className="sidebar-brand-mark">IO</span>
        <div>
          <strong>InventoryOS</strong>
          <p>Full-stack inventory intelligence</p>
        </div>
      </div>

      <div className="auth-copy">
        <span className="section-eyebrow">Built for warehouses, retail, and distribution</span>
        <h1>Modern inventory control for real-world operations.</h1>
        <p>
          Track stock, process purchase orders, manage suppliers, and monitor sales from a
          SaaS-grade dashboard with real operational safeguards.
        </p>
      </div>

      <div className="auth-feature-grid">
        <article className="auth-feature-card">
          <Warehouse size={20} />
          <div>
            <strong>Warehouse-ready workflows</strong>
            <p>Purchase receipts, stock adjustments, and low inventory intelligence.</p>
          </div>
        </article>
        <article className="auth-feature-card">
          <ShieldCheck size={20} />
          <div>
            <strong>Secure role-based access</strong>
            <p>JWT sessions, admin and staff permissions, and protected operations.</p>
          </div>
        </article>
        <article className="auth-feature-card">
          <Sparkles size={20} />
          <div>
            <strong>Modern SaaS UX</strong>
            <p>Command palette, responsive dashboards, and elegant modal workflows.</p>
          </div>
        </article>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-form-shell">
        <span className="section-eyebrow">Welcome back</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
        {footer ? <div className="auth-footer-copy">{footer}</div> : null}
      </div>
    </section>
  </div>
);

export { AuthShell };
