import React from "react";

export default function Billing() {
  return (
    <div className="premium-layout">
      <div className="content-wrapper">
        <header className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="gradient-text">Unlock Unlimited Scale</h1>
          <p className="sub-header">Choose a model that empowers your enterprise growth.</p>
        </header>

        <div className="pricing-container">
          {/* Free Plan */}
          <div className="glass-card pricing-card">
            <div className="price-header">
              <h3 className="card-title">Base Matrix</h3>
              <div className="price-amt">$0<span>/mo</span></div>
              <p className="card-desc">Essential AI foundational layer.</p>
            </div>
            <ul className="feature-list">
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>500 Chats/Month</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Basic NLP Processing</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Standard Widget</span>
              </li>
            </ul>
            <button className="premium-button outline" style={{ width: '100%' }}>Current Tier</button>
          </div>

          {/* Pro Plan */}
          <div className="glass-card pricing-card featured">
            <div className="price-header">
              <div style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Most Popular</div>
              <h3 className="card-title" style={{ color: '#a78bfa' }}>Quantum Core</h3>
              <div className="price-amt">$49<span>/mo</span></div>
              <p className="card-desc">Intelligent intent analysis and unlimited bandwidth.</p>
            </div>
            <ul className="feature-list">
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>10,000 Chats/Month</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Premium Response Quality</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Custom Brand Voice styling</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Priority Cloud Compute</span>
              </li>
            </ul>
            <button className="premium-button" style={{ width: '100%' }}>Initialize Upgrade</button>
          </div>

          {/* Elite Plan */}
          <div className="glass-card pricing-card">
            <div className="price-header">
              <h3 className="card-title">Hyper Dimension</h3>
              <div className="price-amt">$199<span>/mo</span></div>
              <p className="card-desc">Fully deterministic enterprise deployment.</p>
            </div>
            <ul className="feature-list">
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Unlimited Chat Capacity</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Dedicated NLP Clusters</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Direct API integrations</span>
              </li>
              <li className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>24/7 Priority Engineering</span>
              </li>
            </ul>
            <button className="premium-button outline" style={{ width: '100%' }}>Contact Sales</button>
          </div>
        </div>
      </div>
    </div>
  );
}
