import React from "react";

export default function Index() {
  return (
    <div className="premium-layout">
      <div className="content-wrapper">
        <header className="page-header">
          <h1 className="gradient-text">Welcome, Commander</h1>
          <p className="sub-header">Control center for your AI-Powered Store Agent.</p>
        </header>

        <div className="grid-dashboard">
          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 className="card-title">Live Chat Status</h3>
            <p className="card-desc">AI is currently managing customer requests autonomously.</p>
            <div className="stat-row">
              <span className="stat-val">Active</span>
              <span className="stat-badge">Online</span>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            </div>
            <h3 className="card-title">Resolution Rate</h3>
            <p className="card-desc">Percentage of resolved queries by our NLP core this week.</p>
            <div className="stat-row">
              <span className="stat-val">94.8%</span>
              <span className="stat-badge">+2.4%</span>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <h3 className="card-title">Avg. Response Time</h3>
            <p className="card-desc">Time for AI agent to formulate optimal responses.</p>
            <div className="stat-row">
              <span className="stat-val">0.4s</span>
              <span className="stat-badge">Optimal</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '3rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Supercharge conversions today</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Upgrade your customer engagement flow by exploring detailed analytics or connecting new data pipelines to improve recommendations.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="premium-button">Launch Control Console</button>
            <button className="premium-button outline">View Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
}
