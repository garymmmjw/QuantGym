// Real browser + real API, using only disposable local accounts and storage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'qg-email-browser-'));
const output = path.join(root, 'artifacts/email-security-browser');
await fs.mkdir(output, { recursive: true });
const probe = net.createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const apiPort = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const endpoint = `${apiOrigin}/api`;
const password = 'EmailBrowserFixture1234';
const originalEmail = 'original@example.invalid';
const targetEmail = 'verified@example.invalid';
await fs.writeFile(path.join(temporary, 'catalog.json'), '[]');
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('QUANTGYM_') && key !== 'DATABASE_URL'));
Object.assign(environment, {
  PYTHONDONTWRITEBYTECODE: '1', QUANTGYM_HOST: '127.0.0.1', PORT: String(apiPort),
  QUANTGYM_DB: path.join(temporary, 'fixture.sqlite'), QUANTGYM_DB_BACKEND: 'sqlite',
  QUANTGYM_PROBLEM_CATALOG: path.join(temporary, 'catalog.json'),
  QUANTGYM_JOBS_CATALOG: path.join(temporary, 'catalog.json'),
  QUANTGYM_MEDIA_ROOT: path.join(temporary, 'media'),
  QUANTGYM_REQUIRE_EMAIL_VERIFICATION: '0', QUANTGYM_REQUIRE_INVITE_CODE: '0',
  QUANTGYM_ACCOUNT_EMAIL_CHANGE_DEV_CODES: '1', QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS: '2',
  QUANTGYM_AUTH_RATE_LIMIT_MAX: '500', QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX: '500',
  QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX: '500',
});
let serverLog = '';
const api = spawn(process.env.QUANTGYM_TEST_PYTHON || 'python3', ['api-server/server.py'], { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
api.stdout.on('data', value => { serverLog += value; });
api.stderr.on('data', value => { serverLog += value; });
let vite, browser, page;
const checks = [];
const errors = [];
const request = async (route, { method = 'GET', body, token = '' } = {}) => {
  const response = await fetch(`${endpoint}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json();
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
};
const check = async (name, action) => { await action(); checks.push(name); console.log(`PASS ${name}`); };
try {
  for (let attempt = 0; ; attempt++) {
    try { await request('/health'); break; }
    catch (error) {
      if (attempt >= 100 || api.exitCode !== null) throw new Error(`Fixture API did not start: ${serverLog}`, { cause: error });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const session = await request('/auth/register', { method: 'POST', body: { password, account: { name: 'Security fixture', email: originalEmail, provider: 'local' } } });
  const secondSession = await request('/auth/login', { method: 'POST', body: { email: originalEmail, password } });
  const account = { ...session.account, cloudLinked: true, emailVerified: true };
  vite = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base && url.pathname === '/config.js') return route.fulfill({ contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
    if (url.origin === base || url.origin === apiOrigin) return route.continue();
    return route.abort();
  });
  await context.addInitScript(({ account, endpoint, token }) => {
    if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token, userId: account.id }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  }, { account, endpoint, token: session.token });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/account?section=security`);
  await page.locator('#accountEmailInput:enabled').waitFor();
  const email = page.locator('#accountEmailInput');
  const currentPassword = page.locator('#accountEmailPassword');
  const codeInput = page.locator('#accountEmailVerificationCode');
  const confirm = page.getByRole('button', { name: '验证并更新邮箱', exact: true });
  const codeResponse = () => page.waitForResponse(response => response.url() === `${endpoint}/account/email-verification-code` && response.request().method() === 'POST');
  const savedEmail = () => request('/account', { token: session.token }).then(value => value.account.email);
  let code;
  await check('requesting a code leaves identity unchanged and starts resend cooldown', async () => {
    await email.fill('first-target@example.invalid');
    await currentPassword.fill(password);
    const response = codeResponse();
    await page.getByRole('button', { name: '发送验证码', exact: true }).click();
    const payload = await (await response).json();
    assert.equal(payload.ok, true);
    code = payload.devCode;
    assert.match(code, /^\d{6}$/);
    await codeInput.waitFor();
    assert.equal(await savedEmail(), originalEmail);
    assert.equal(await confirm.isEnabled(), false);
    assert.equal(await page.getByRole('button', { name: /秒后重新发送/ }).isDisabled(), true);
  });
  await check('editing the target clears verification state; new request works', async () => {
    await codeInput.fill(code);
    await email.fill(targetEmail);
    assert.equal(await codeInput.inputValue(), '');
    assert.equal(await codeInput.isDisabled(), true);
    const response = codeResponse();
    await page.getByRole('button', { name: '发送验证码', exact: true }).click();
    const payload = await (await response).json();
    assert.equal(payload.ok, true);
    code = payload.devCode;
    assert.equal(await codeInput.inputValue(), '');
    assert.equal(await savedEmail(), originalEmail);
  });
  await check('invalid code reports an error without changing server or local identity', async () => {
    await codeInput.fill(code === '000000' ? '000001' : '000000');
    const response = page.waitForResponse(value => value.url() === `${endpoint}/account` && value.request().method() === 'PATCH');
    await confirm.click();
    assert.equal((await response).status(), 400);
    await page.getByRole('alert').waitFor();
    assert.equal(await savedEmail(), originalEmail);
    const localEmail = await page.evaluate(id => JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1')).accounts.find(value => value.id === id).email, account.id);
    assert.equal(localEmail, originalEmail);
    await page.screenshot({ path: path.join(output, 'desktop-email-verification.png'), fullPage: true });
  });
  await check('mobile verification controls remain readable without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await codeInput.evaluate(element => element.closest('form').scrollIntoView({ block: 'start' }));
    await confirm.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await confirm.isVisible(), true);
    await page.screenshot({ path: path.join(output, 'mobile-email-verification.png'), animations: 'disabled' });
  });
  await check('correct code updates identity; new login works and other session is revoked', async () => {
    await codeInput.fill(code);
    await confirm.click();
    await page.getByText('邮箱已验证并更新，其他设备需要重新登录。', { exact: true }).waitFor();
    assert.equal(await savedEmail(), targetEmail);
    const localEmail = await page.evaluate(id => JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1')).accounts.find(value => value.id === id).email, account.id);
    assert.equal(localEmail, targetEmail);
    await request('/auth/login', { method: 'POST', body: { email: targetEmail, password } });
    const revoked = await fetch(`${endpoint}/account`, { headers: { Authorization: `Bearer ${secondSession.token}` } });
    assert.equal(revoked.status, 401);
    await page.reload();
    await page.locator('#accountEmailInput:enabled').waitFor();
    assert.equal(await email.inputValue(), targetEmail);
    await page.screenshot({ path: path.join(output, 'verified-email.png'), fullPage: true });
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify({ checks, errors, backend: 'disposable SQLite API', externalWrites: false }, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await vite?.close();
  if (api.exitCode === null) { api.kill('SIGTERM'); await once(api, 'exit'); }
  await fs.writeFile(path.join(output, 'api-fixture.log'), serverLog);
  await fs.rm(temporary, { recursive: true, force: true });
}
