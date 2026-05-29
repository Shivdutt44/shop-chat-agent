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
          name: "search_catalog",
          arguments: { query: "Teeth" }
        }
      })
    });
    const data = await resp.json();
    console.log("RAW KEY DUMP:", Object.keys(data.result.content[0]));
    console.log("PARSED CONTENT KEYS:", Object.keys(JSON.parse(data.result.content[0].text)));
  } catch (e) {
    console.log("Fail:", e.message);
  }
}
run();
