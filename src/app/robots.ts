// /robots.txt (P06 D-4). Before this, /robots.txt redirected to the front page on DNL.
import type { MetadataRoute } from 'next';

import { BRAND } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/curate', '/api/', '/signin', '/signup', '/onboarding'] }],
    sitemap: `${BRAND.siteUrl}/sitemap.xml`,
    host: BRAND.siteUrl,
  };
}
