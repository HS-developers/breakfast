export default async function handler(req, res) {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const url = 'https://banquemisr.com/en/Home/CAPITAL-MARKETS/Exchange-Rates-and-Currencies';
  const bmRes = await fetch(url);
  const html = await bmRes.text();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.status(200).send(html);
}
