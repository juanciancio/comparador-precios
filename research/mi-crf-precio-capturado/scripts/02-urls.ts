import { retailers } from '../../../src/config/retailers.ts';
const HOST = retailers.carrefour.host;
const UA = 'ComparadorPrecios/0.1 (+juan.ciancio02@gmail.com)';
const EANS = ['8006063002366','7791720043332','7793281492819','7790070231864','5000267116419','813497003047'];
for (const ean of EANS) {
  const url = `https://${HOST}/api/catalog_system/pub/products/search/?fq=alternateIds_Ean:${ean}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  const body = await res.json() as any[];
  const p = body[0];
  console.log(`${ean}\thttps://${HOST}/${p?.linkText}/p`);
  await new Promise(r=>setTimeout(r,200));
}
