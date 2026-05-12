import React from "react";

export default function Support() {
  return (
    <div className="premium-layout">
      <div className="content-wrapper" style={{ maxWidth: '1000px' }}>
        <header className="page-header">
          <h1 className="gradient-text">Mission Control Support</h1>
          <p className="sub-header">Access system telemetry docs or engage standard query resolution channels.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Contact Form */}
          <div className="glass-card">
            <h3 className="card-title">Open Direct Channel</h3>
            <p className="card-desc" style={{ marginBottom: '2rem' }}>Dispatch an encoded support ticket directly to our engineers.</p>
            
            <div className="form-group">
              <label className="form-label">Subject Node</label>
              <input type="text" className="premium-input" placeholder="Brief summary of the issue" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Priority Frequency</label>
              <select className="premium-select">
                <option>Low (Routine)</option>
                <option>Medium (Urgent)</option>
                <option>High (Critical / Operational Halt)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payload Data</label>
              <textarea className="premium-textarea" rows="4" placeholder="Describe the issue context or desired output parameters..."></textarea>
            </div>

            <button className="premium-button" style={{ width: '100%' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Transmit Payload
            </button>
          </div>

          {/* Helpful Resources */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="card-icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h9z"></path></svg>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Central Archive</h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Read exhaustive operational documentation.</p>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="card-icon" style={{ marginBottom: 0, flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Comms Relay</h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Connect with real humans on live matrix chat.</p>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', marginTop: 'auto', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(30, 32, 50, 0.8))' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Telemetry Status</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#34d399' }}>
                <div style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%', boxShadow: '0 0 8px #34d399' }}></div>
                All Systems Operational
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
