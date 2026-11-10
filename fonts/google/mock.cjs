// Google Fonts CSS + files vendored from fonts.googleapis.com (same User-Agent next/font uses), fed to next/font via
// NEXT_FONT_GOOGLE_MOCKED_RESPONSES so builds don't depend on what Google answers Vercel's build machines.
const fs = require('node:fs');
const path = require('node:path');
const map = require('./responses.json');
module.exports = Object.fromEntries(Object.entries(map).map(([url, file]) => [
  url,
  fs.readFileSync(path.join(__dirname, file), 'utf8').replaceAll('url(./', `url(${__dirname}/`),
]));
