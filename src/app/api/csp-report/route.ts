// CSP violation reports (P06 D-5, report-only phase). Logged to Vercel function logs so legitimate
// sources can be added before the policy is enforced. Bounded + sanitised; never echoes input.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const text = (await req.text()).slice(0, 4000);
    const body = JSON.parse(text || '{}');
    const r = body['csp-report'] ?? body[0]?.body ?? body;
    console.warn('[csp-report]', JSON.stringify({
      directive: r['violated-directive'] ?? r.effectiveDirective ?? null,
      blocked: String(r['blocked-uri'] ?? r.blockedURL ?? '').slice(0, 200),
      page: String(r['document-uri'] ?? r.documentURL ?? '').slice(0, 200),
    }));
  } catch {
    // malformed report — ignore
  }
  return new NextResponse(null, { status: 204 });
}
