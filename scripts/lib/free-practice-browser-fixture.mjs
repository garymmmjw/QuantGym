/** Isolated member accounts and API data for browser checks; never contact a real backend. */
export async function installFreePracticeFixture(context, { base, accounts, problems, initialStates = {} }) {
  const endpoint = 'https://free-practice-fixture.invalid/api';
  const baseOrigin = new URL(base).origin;
  const fixtureOrigin = new URL(endpoint).origin;
  const tokens = new Map(accounts.map(account => [`isolated-practice-fixture:${account.id}`, account]));
  const states = new Map(accounts.map(account => [account.id, { problems, problemStates: [], ...initialStates[account.id] }]));
  const resourceHosts = new Set(['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.origin === baseOrigin && url.pathname === '/config.js') {
      return route.fulfill({ contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
    }
    if (url.origin === fixtureOrigin || url.pathname.startsWith('/api/')) {
      if (method === 'OPTIONS') return json({});
      const account = tokens.get((request.headers().authorization || '').replace(/^Bearer\s+/i, ''));
      if (!account) return json({ error: 'Isolated fixture authentication required' }, 401);
      if (url.pathname === '/api/membership') return json({ isMember: true });
      if (url.pathname === '/api/account') return json({ account });
      if (url.pathname === '/api/sync' && method === 'POST') {
        const body = request.postDataJSON();
        const current = states.get(account.id);
        states.set(account.id, { ...current, ...body.state, problems, problemStates: body.problemStates || body.state?.problemStates || current.problemStates });
      }
      const state = states.get(account.id);
      return json({ account, problems, state, problemStates: state.problemStates, community: { posts: [] }, syncedAt: new Date().toISOString() });
    }
    if ((url.origin === baseOrigin || resourceHosts.has(url.hostname)) && ['GET', 'HEAD'].includes(method)) return route.continue();
    return route.abort();
  });
  await context.addInitScript(({ endpoint, accounts }) => {
    // Re-select the fixture token on every navigation, including the attempts
    // test's explicit account switch. Never reuse another account's cloud data.
    const auth = JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1') || '{}');
    const account = accounts.find(item => item.id === auth.currentUserId) || accounts[0];
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: `isolated-practice-fixture:${account.id}`, userId: account.id }));
  }, { endpoint, accounts });
}
