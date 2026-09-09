// Refresh only this account's session. Signing in must never replace training data.
export async function reconnectPersonalAccount({ user, config, password, request, getCurrentOwnerId, saveConfig }) {
  if (!user?.id || !user.email || !String(password || '').trim()) throw new Error('missing_credentials');
  const ownerId = user.id;
  const response = await request('/auth/login', { method:'POST', auth:false, body:{email:user.email,password} });
  if (getCurrentOwnerId() !== ownerId) throw new Error('account_changed');
  if (response?.account?.id !== ownerId || String(response.account.email || '').toLowerCase() !== user.email.toLowerCase()) throw new Error('account_mismatch');
  if (typeof response.token !== 'string' || !response.token) throw new Error('invalid_session');
  const next = {...config,token:response.token,userId:ownerId,lastError:''};
  await saveConfig(next);
  return true;
}
