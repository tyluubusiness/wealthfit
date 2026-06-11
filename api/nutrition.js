// Vercel proxy for API Ninjas nutrition search
// Routes browser requests through server to avoid CORS issues

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.REACT_APP_NINJAS_KEY || process.env.NINJAS_KEY;
  if (!key) return res.status(500).json({ error: 'NINJAS_KEY not set' });

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const r = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
      { headers: { 'X-Api-Key': key } }
    );
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
