// CMS access flow (T5 #8 + S07.01.05): admin creates a person → one-time link → person sets a
// password → signs in → signs out. Needs QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD (box/dev DB only).
import { expect, test, type Page } from '@playwright/test';

const ADMIN = process.env.QA_ADMIN_EMAIL ?? '';
const ADMIN_PW = process.env.QA_ADMIN_PASSWORD ?? '';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/signin');
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
}

test.skip(!ADMIN || !ADMIN_PW, 'QA_ADMIN_* not set');

test('admin creates an editor who sets a password, signs in and out', async ({ page, browser }) => {
  const email = `qa-new-${Date.now()}@rig.test`;
  await signIn(page, ADMIN, ADMIN_PW);
  await page.waitForURL(/\/studio/);

  await page.goto('/studio/admin/users');
  await expect(page.getByRole('heading', { name: /People & access/ })).toBeVisible();
  const addForm = page.locator('section[aria-labelledby="new-user"]');
  await addForm.locator('input[name="email"]').fill(email);
  await addForm.locator('input[name="displayName"]').fill('QA New Editor');
  await addForm.locator('select[name="role"]').selectOption('editor');
  await addForm.getByRole('button', { name: 'Create account' }).click();
  const linkBox = addForm.getByLabel('One-time password link');
  await expect(linkBox).toBeVisible();
  const link = await linkBox.inputValue();
  expect(link).toMatch(/\/reset-password\?token=/);

  // The new person opens the link (fresh browser context = different person).
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  const url = new URL(link);
  await p2.goto(url.pathname + url.search);
  const pw = `Pw-${Date.now()}-e2e-long`;
  await p2.locator('input[name="password"]').fill(pw);
  await p2.locator('input[name="confirm"]').fill(pw);
  await p2.getByRole('button', { name: 'Set password' }).click();
  await expect(p2.getByText('Password set')).toBeVisible();

  // Link is single-use.
  await p2.goto(url.pathname + url.search);
  await p2.locator('input[name="password"]').fill(pw + 'x');
  await p2.locator('input[name="confirm"]').fill(pw + 'x');
  await p2.getByRole('button', { name: 'Set password' }).click();
  await expect(p2.getByText(/invalid or has expired/)).toBeVisible();

  // New editor signs in and reaches the Studio, then signs out.
  await signIn(p2, email, pw);
  await p2.waitForURL(/\/studio/);
  await p2.getByRole('button', { name: 'Sign out' }).click();
  await p2.waitForURL(/\/signin/);
  await ctx.close();
});
