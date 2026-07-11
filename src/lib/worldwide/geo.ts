// Approximate country centroids as [lng, lat], for placing Around-the-World map pins.
// Projection that matches worldmap-data.ts: x = (lng+180)*1000/360, y = (90-lat)*500/180.
const CENTROIDS: Record<string, [number, number]> = {
  AE: [54, 24], AF: [66, 33], AL: [20, 41], AM: [45, 40], AR: [-64, -34], AT: [14, 47.5],
  AU: [134, -25], AZ: [48, 40], BA: [18, 44], BD: [90, 24], BE: [4.5, 50.5], BG: [25, 43],
  BH: [50.5, 26], BN: [114, 4.5], BO: [-64, -17], BR: [-53, -10], BT: [90.5, 27.5], BY: [28, 53.5],
  CA: [-106, 56], CH: [8, 47], CL: [-71, -30], CN: [104, 35], CO: [-73, 4], CR: [-84, 10],
  CU: [-79, 22], CZ: [15.5, 49.8], DE: [10, 51], DK: [10, 56], DO: [-70.5, 19], DZ: [3, 28],
  EC: [-78, -1.5], EE: [26, 59], EG: [30, 27], ES: [-3.7, 40], ET: [40, 8], FI: [26, 64],
  FJ: [178, -18], FR: [2.5, 46.5], GB: [-2, 54], GE: [43, 42], GH: [-1, 8], GR: [22, 39],
  GT: [-90, 15.5], HN: [-86.5, 15], HR: [16, 45.5], HT: [-72, 19], HU: [19, 47], ID: [113, -1],
  IE: [-8, 53], IL: [35, 31.5], IN: [79, 22], IQ: [44, 33], IR: [53, 32], IS: [-19, 65],
  IT: [12.5, 42], JM: [-77, 18], JO: [36.5, 31], JP: [138, 37], KE: [38, 1], KH: [105, 12.5],
  KP: [127, 40], KR: [128, 36.5], KW: [47.5, 29.5], KZ: [67, 48], LA: [103, 18], LB: [35.8, 33.9],
  LK: [81, 7.5], LT: [24, 55], LV: [25, 57], LY: [17, 27], MA: [-6, 32], MD: [29, 47],
  MK: [21.7, 41.6], ML: [-4, 17], MM: [96, 21], MN: [104, 46], MV: [73, 3.5], MX: [-102, 23],
  MY: [102, 4], NG: [8, 9.5], NI: [-85, 13], NL: [5.5, 52.2], NO: [9, 61], NP: [84, 28],
  NZ: [172, -41], OM: [56, 21], PA: [-80, 9], PE: [-76, -10], PG: [144, -6], PH: [122, 12],
  PK: [70, 30], PL: [19, 52], PT: [-8, 39.5], PY: [-58, -23], QA: [51.2, 25.3], RO: [25, 46],
  RS: [21, 44], RU: [95, 61], SA: [45, 24], SD: [30, 15], SE: [15, 62], SG: [103.8, 1.35],
  SI: [15, 46], SK: [19.5, 48.7], SN: [-14.5, 14.5], SO: [46, 5], SY: [38, 35], TH: [101, 15],
  TN: [9.5, 34], TR: [35, 39], TW: [121, 23.8], TZ: [35, -6], UA: [32, 49], UG: [32, 1],
  US: [-98, 39], UY: [-56, -33], UZ: [64, 41.5], VE: [-66, 8], VN: [108, 16], YE: [48, 15.5],
  ZA: [24, -29], ZW: [30, -19],
};

/** Pin position (percent of the 1000x500 viewBox) for a country code, or null if we can't place it. */
export function pinPercent(code: string | null | undefined): { left: number; top: number } | null {
  if (!code) return null;
  const c = CENTROIDS[code.toUpperCase()];
  if (!c) return null;
  const [lng, lat] = c;
  return { left: ((lng + 180) / 360) * 100, top: ((90 - lat) / 180) * 100 };
}
