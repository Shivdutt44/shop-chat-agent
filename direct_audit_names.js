async function run() {
  const endpoint = 'https://skywaytradingenterprise.myshopify.com/api/mcp';
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1,
        params: {}
      })
    });
    const data = await resp.json();
    const names = data.result.tools.map(t => t.name);
    console.log("TOOLS:", names);
  } catch (e) {
    console.log("Fail:", e.message);
  }
}
run();
