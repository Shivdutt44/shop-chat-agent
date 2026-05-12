import React from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Load actual analytics from DB
  const [totalConvs, totalMsgs] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count()
  ]);

  const avgLength = totalConvs > 0 ? (totalMsgs / totalConvs).toFixed(1) : 0;

  return {
    shop,
    totalConvs,
    totalMsgs,
    avgLength
  };
};

export default function Index() {
  const { shop, totalConvs, totalMsgs, avgLength } = useLoaderData();
  
  return (
    <div className="premium-layout">
      <div className="content-wrapper">
        <header className="page-header">
          <h1 className="gradient-text">Welcome, Commander</h1>
          <p className="sub-header">Connected to {shop} node.</p>
        </header>

        <div className="grid-dashboard">
          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 className="card-title">Active Conversations</h3>
            <p className="card-desc">Total interactions logged in your neural memory.</p>
            <div className="stat-row">
              <span className="stat-val">{totalConvs.toLocaleString()}</span>
              <span className="stat-badge">LIVE</span>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            </div>
            <h3 className="card-title">Payload Volume</h3>
            <p className="card-desc">Cumulative inference operations (messages processing).</p>
            <div className="stat-row">
              <span className="stat-val">{totalMsgs.toLocaleString()}</span>
              <span className="stat-badge">Active</span>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <h3 className="card-title">Avg Depth</h3>
            <p className="card-desc">Average neural messages per interaction flow.</p>
            <div className="stat-row">
              <span className="stat-val">{avgLength} msg</span>
              <span className="stat-badge">Depth</span>
            </div>
          </div>
        </div>


        <div className="glass-card" style={{ padding: '3rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Dynamic Analytics Node Active</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', marginBottom: '2rem', fontSize: '1.1rem' }}>
            The telemetry board is reading live data payloads directly from the secure runtime nexus, processing metrics from your connected store '{shop}'.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="premium-button">Launch Config Node</button>
          </div>
        </div>
      </div>
    </div>
  );
}
