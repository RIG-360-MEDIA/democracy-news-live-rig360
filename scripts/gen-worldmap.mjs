// Build-time: generate an equirectangular world land path (viewBox 0 0 1000 500) so the runtime
// component shows one static SVG file instead of d3 + a topojson file. Run: node scripts/gen-worldmap.mjs
import fs from 'fs';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const land = feature(topo, topo.objects.land);

// scale 159.154943 + translate [500,250] maps the whole globe exactly onto 1000x500, so a pin at
// [lng,lat] is simply x=(lng+180)*1000/360, y=(90-lat)*500/180 — no projection lib needed at runtime.
const projection = geoEquirectangular().scale(1000 / (2 * Math.PI)).translate([500, 250]);
const d = geoPath(projection)(land);

// A static file (served by the CDN, cached by browsers) rather than inline in the page: inlined, the
// path went into every front-page render twice (~156 KB of the HTML).
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><defs><clipPath id="land"><path d="${d}"/></clipPath>`
  + `<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.15" fill="#544838"/></pattern></defs>`
  + `<path d="${d}" fill="#1C1611"/><rect x="0" y="0" width="1000" height="500" fill="url(#dots)" clip-path="url(#land)"/></svg>\n`;
fs.writeFileSync('public/worldmap-land.svg', out);
console.log('wrote public/worldmap-land.svg —', d.length, 'path chars');
