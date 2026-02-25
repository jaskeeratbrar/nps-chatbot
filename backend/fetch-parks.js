// One-time script: fetches all NPS parks and writes to frontend/src/data/parks.json
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchParks() {
  let allParks = [];
  let start = 0;
  const limit = 50;
  let total = 1;

  while (start < total) {
    const { data } = await axios.get('https://developer.nps.gov/api/v1/parks', {
      params: {
        api_key: process.env.NPS_API_KEY,
        limit,
        start,
        fields: 'parkCode,fullName,states,images',
      },
    });
    total = parseInt(data.total);
    allParks = allParks.concat(data.data);
    start += limit;
    console.log(`Fetched ${allParks.length} / ${total}`);
  }

  const simplified = allParks
    .map(p => ({
      fullName: p.fullName,
      parkCode: p.parkCode,
      states:   p.states,
      image:    p.images?.[0] ? { url: p.images[0].url, altText: p.images[0].altText || p.fullName } : null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const outDir = path.join(__dirname, '../frontend/src/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'parks.json');
  fs.writeFileSync(outPath, JSON.stringify(simplified, null, 2));
  console.log(`\nSaved ${simplified.length} parks → ${outPath}`);
}

fetchParks().catch(console.error);
