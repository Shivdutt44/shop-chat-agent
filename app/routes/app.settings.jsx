import React from "react";

export default function Settings() {
  return (
    <div className="premium-layout">
      <div className="content-wrapper" style={{ maxWidth: '800px' }}>
        <header className="page-header">
          <h1 className="gradient-text">Configurations</h1>
          <p className="sub-header">Refine agent neural core parameters and display preferences.</p>
        </header>

        <form className="glass-card" style={{ marginBottom: '2rem' }} onSubmit={(e) => e.preventDefault()}>
          <h3 className="card-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>General Identity</h3>
          
          <div className="form-group">
            <label className="form-label">Agent Designation</label>
            <input type="text" className="premium-input" defaultValue="Nova AI Assistant" placeholder="e.g. Jarvis, Aura Support" />
          </div>

          <div className="form-group">
            <label className="form-label">Tone of Voice Matrix</label>
            <select className="premium-select">
              <option>Hyper-Professional & Crisp</option>
              <option>Enthusiastic & Friendly</option>
              <option>Helpful & Direct</option>
              <option>Premium Concierge</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Welcome Sequence Logic</label>
            <textarea className="premium-textarea" rows="3" defaultValue="Salutations! How might I optimize your shopping experience on our platform today?"></textarea>
          </div>
        </form>

        <div className="glass-card">
          <h3 className="card-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Interface Rendering</h3>
          
          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Auto-activation on scroll</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Trigger widget popup when user scrolls 50%.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
              <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--primary)', transition: '.4s', borderRadius: '34px' }}>
                <span style={{ position: 'absolute', content: '', height: '16px', width: '16px', left: '24px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button className="premium-button outline">Revert Changes</button>
            <button className="premium-button">Deploy Logic Updates</button>
          </div>
        </div>
      </div>
    </div>
  );
}
