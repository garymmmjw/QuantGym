/** Isolated member accounts and API data for browser checks; never contact a real backend. */
export async function installFreePracticeFixture(context, { base, accounts, problems, initialStates = {} }) {
  const endpoint = 'https://free-practice-fixture.invalid/api';
  const baseOrigin = new URL(base).origin;
  const fixtureOrigin = new URL(endpoint).origin;
  const tokens = new Map(accounts.map(account => [`isolated-practice-fixture:${account.id}`, account]));
  const states = new Map(accounts.map(account => [account.id, { problemStates: [], ...initialStates[account.id] }]));
  const catalogBody = JSON.stringify({ problems });
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
      if (url.pathname === '/api/leaderboard') return json({ leaderboard: [], updatedAt: new Date().toISOString() });
      const account = tokens.get((request.headers().authorization || '').replace(/^Bearer\s+/i, ''));
      if (!account) return json({ error: 'Isolated fixture authentication required' }, 401);
      if (url.pathname === '/api/membership') return json({ isMember: true });
      if (url.pathname === '/api/account') return json({ account });
      // The production catalog endpoint owns these large, immutable records.
      // Social/state requests must not repeatedly serialize or transfer them.
      if (url.pathname === '/api/problems' && method === 'GET') return route.fulfill({ contentType: 'application/json', body: catalogBody });
      if (url.pathname === '/api/problem-social') return json({ problemSocial: [] });
      if (url.pathname.startsWith('/api/problem-social/')) return json({ social: {
        problemId: decodeURIComponent(url.pathname.split('/')[3]), likeCount: 0, commentCount: 0, liked: false, comments: []
      } });
      if (url.pathname === '/api/community') return json({ community: { posts: [] } });
      if (url.pathname === '/api/sync' && method === 'POST') {
        const body = request.postDataJSON();
        const current = states.get(account.id);
        states.set(account.id, { ...current, ...body.state, problemStates: body.problemStates || body.state?.problemStates || current.problemStates });
      }
      const { problemStates, problems: _catalog, ...state } = states.get(account.id);
      if (url.pathname === '/api/state') return json({ state });
      if (url.pathname === '/api/problem-states') return json({ problemStates });
      if (url.pathname === '/api/sync') return json({ account, state, problemStates, community: { posts: [] }, syncedAt: new Date().toISOString() });
      return json({ error: `Unimplemented fixture endpoint: ${method} ${url.pathname}` }, 404);
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
