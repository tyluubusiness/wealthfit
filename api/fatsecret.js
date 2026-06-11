// Vercel serverless function — FatSecret OAuth 2.0 proxy
// Tries both REACT_APP_ and non-prefixed env var names

export default async function handler(req, res) {
  // Allow CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Try both naming conventions
  const clientId     = process.env.REACT_APP_FATSECRET_ID     || process.env.FATSECRET_ID;
  const clientSecret = process.env.REACT_APP_FATSECRET_SECRET || process.env.FATSECRET_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'FatSecret credentials not configured',
      available_keys: Object.keys(process.env).filter(k => k.includes('FAT') || k.includes('SECRET')),
    });
  }

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    // Step 1: Get OAuth 2.0 bearer token
    const tokenRes = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'basic',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(500).json({ error: 'Token error: ' + err });
    }

    const { access_token } = await tokenRes.json();

    // Step 2: Search foods
    const searchRes = await fetch(
      `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return res.status(500).json({ error: 'Search error: ' + err });
    }

    return res.status(200).json(await searchRes.json());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
