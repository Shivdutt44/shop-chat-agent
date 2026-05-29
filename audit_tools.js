import MCPClient from './app/mcp-client.js';

async function checkTools() {
  const host = 'https://skywaytradingenterprise.myshopify.com';
  const client = new MCPClient(host, 'conv_123', 'shop_123');
  
  try {
    console.log('Querying Storefront MCP for tool definitions...');
    const sfTools = await client.connectToStorefrontServer();
    console.log('\n--- STOREFRONT TOOLS FOUND ---');
    sfTools.forEach(t => {
      console.log(`- ${t.name}: ${t.description}`);
    });
  } catch (e) {
    console.log('Storefront fetch failed:', e.message);
  }
}

checkTools();
