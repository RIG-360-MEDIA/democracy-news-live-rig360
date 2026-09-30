import { describe, expect, it } from 'vitest';

// @ts-expect-error — plain .mjs config has no type declarations
import nextConfigRaw from '../../next.config.mjs';

interface HeaderRule { source: string; has?: unknown; headers: { key: string; value: string }[] }
const nextConfig = nextConfigRaw as { poweredByHeader?: boolean; headers: () => Promise<HeaderRule[]> };

describe('security headers (D-5)', () => {
  it('sets the enforced headers and a report-only CSP on every path', async () => {
    const rules = await nextConfig.headers();
    const all = rules.find((r) => r.source === '/:path*' && !r.has);
    expect(all).toBeDefined();
    const h = Object.fromEntries(all!.headers.map((x) => [x.key, x.value]));
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    const csp = h['Content-Security-Policy-Report-Only'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('https://www.youtube.com');
    expect(csp).toContain('report-uri /api/csp-report');
  });

  it('hides the x-powered-by header', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
