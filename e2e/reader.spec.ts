// Reader flows (T5 #1–#3): front page, story page, DNL gate.
import { expect, test } from '@playwright/test';

test('front page shows stories and the DNL brand', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Democracy News Live/);
  const links = page.locator('a[href^="/long-read/"]');
  expect(await links.count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('body')).not.toContainText('Rig Wire');
});

test('a story page renders headline, body and structured data', async ({ page }) => {
  await page.goto('/long-read');
  const href = await page.locator('a[href^="/long-read/"]').first().getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('non-DNL modes redirect to the Worldwide front page; signup is invitation-only', async ({ page }) => {
  for (const p of ['/minute', '/digest', '/queue']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/long-read$/);
  }
  await page.goto('/signup');
  await expect(page).toHaveURL(/\/signin/);
});

test('robots.txt and sitemap.xml are served', async ({ request }) => {
  expect((await request.get('/robots.txt')).status()).toBe(200);
  const sm = await request.get('/sitemap.xml');
  expect(sm.status()).toBe(200);
  expect(await sm.text()).toContain('<loc>');
});
