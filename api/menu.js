'use strict';
const { getMenu } = require('../lib/service');
const fallback = require('../public/fallback.json');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const check = url.searchParams.get('check') === '1';
  const r = await getMenu(fallback);
  const body = r.body;
  if (!check) body.meta = { source: body.meta.source, generatedAt: body.meta.generatedAt };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // 5 dk önbellek; süre dolunca eski yanıt gösterilirken arka planda yenilenir.
  res.setHeader('Cache-Control', r.ok ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.end(JSON.stringify(body));
};
