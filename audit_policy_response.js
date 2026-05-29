async function run() {
  const endpoint = 'https://skywaytradingenterprise.myshopify.com/api/mcp';
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "search_shop_policies_and_faqs",
          arguments: { query: "Return policy" }
        }
      })
    });
    const data = await resp.json();
    console.log("POLICY TOOL RESPONSE TEXT:", data.result?.content?.[0]?.text);
  } catch (e) {
    console.log("Fail:", e.message);
  }
}
run();
