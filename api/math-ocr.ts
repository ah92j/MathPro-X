import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;
  if (!appId || !appKey) return res.status(503).json({ error: 'OCR service is not configured' });
  const src = typeof req.body?.src === 'string' ? req.body.src : '';
  if (!src.startsWith('data:image/')) return res.status(400).json({ error: 'Expected a base64 image data URL' });
  if (src.length > 2_500_000) return res.status(413).json({ error: 'Image is too large' });
  try {
    const upstream = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', app_id: appId, app_key: appKey },
      body: JSON.stringify({ src, formats: ['latex_styled', 'text'] })
    });
    return res.status(upstream.status).json(await upstream.json());
  } catch {
    return res.status(502).json({ error: 'Could not reach the OCR provider' });
  }
}