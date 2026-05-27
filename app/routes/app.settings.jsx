import React, { useState, useEffect } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Bypassing generated type lock via queryRaw
  const results = await prisma.$queryRaw`SELECT * FROM AppSettings WHERE shop = ${shop} LIMIT 1`;
  let settings = results && results.length > 0 ? results[0] : null;

  if (!settings) {
    // Initialize with default values via executeRaw
    const id = `set_${Date.now()}`;
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      INSERT INTO AppSettings (id, shop, agentName, toneOfVoice, welcomeMessage, autoActivation, updatedAt)
      VALUES (${id}, ${shop}, 'Nova AI Assistant', 'Professional', 'Salutations! How might I optimize your shopping experience on our platform today?', 1, ${now})
    `;
    
    const newRes = await prisma.$queryRaw`SELECT * FROM AppSettings WHERE shop = ${shop} LIMIT 1`;
    settings = newRes[0];
  }
  
  // SQLite normalization for boolean
  if (settings) {
    settings.autoActivation = settings.autoActivation === 1 || settings.autoActivation === true;
  }

  return { settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  
  const agentName = formData.get("agentName");
  const toneOfVoice = formData.get("toneOfVoice");
  const welcomeMessage = formData.get("welcomeMessage");
  const autoActivationVal = formData.get("autoActivation") === "true" ? 1 : 0;
  const now = new Date().toISOString();

  try {
    // Upsert via manual raw logic for extreme resilience
    await prisma.$executeRaw`
      UPDATE AppSettings 
      SET agentName = ${agentName}, toneOfVoice = ${toneOfVoice}, welcomeMessage = ${welcomeMessage}, autoActivation = ${autoActivationVal}, updatedAt = ${now}
      WHERE shop = ${shop}
    `;
    
    return { success: true };
  } catch (e) {
    return { error: true, message: e.message };
  }
};


export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [checked, setChecked] = useState(settings?.autoActivation ?? true);

  useEffect(() => {
    if (actionData?.success) {
      // Optional: notify
    }
  }, [actionData]);

  return (
    <div className="premium-layout">
      <div className="content-wrapper" style={{ maxWidth: '800px' }}>
        <header className="page-header">
          <h1 className="gradient-text">Configurations</h1>
          <p className="sub-header">Refine agent neural core parameters and display preferences.</p>
        </header>

        {actionData?.success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            Config Node Synced Successfully! Neural architecture has been rewritten.
          </div>
        )}

        <Form method="POST">
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h3 className="card-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>General Identity</h3>
            
            <div className="form-group">
              <label className="form-label">Agent Designation</label>
              <input type="text" name="agentName" className="premium-input" defaultValue={settings.agentName} placeholder="e.g. Jarvis, Aura Support" required />
            </div>

            <div className="form-group">
              <label className="form-label">Tone of Voice Matrix</label>
              <select name="toneOfVoice" className="premium-select" defaultValue={settings.toneOfVoice}>
                <option value="Professional">Hyper-Professional & Crisp</option>
                <option value="Enthusiastic">Enthusiastic & Friendly</option>
                <option value="Helpful">Helpful & Direct</option>
                <option value="Concierge">Premium Concierge</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Welcome Sequence Logic</label>
              <textarea name="welcomeMessage" className="premium-textarea" rows="3" defaultValue={settings.welcomeMessage} required></textarea>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="card-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Interface Rendering</h3>
            
            <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Auto-activation on scroll</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Trigger widget popup when user scrolls 50%.</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input type="hidden" name="autoActivation" value={checked ? "true" : "false"} />
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: checked ? '24px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="premium-button" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Deploy Logic Updates"}
              </button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}

