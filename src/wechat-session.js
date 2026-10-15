// Share one wx.login exchange across app launch and concurrent page lifecycles.
export function createWechatSession({ enabled, login, api }) {
  let pending = null;
  let attempted = false;
  return async function ensureWechatSession(force = false) {
    if (!enabled) return false;
    if (pending) return pending;
    if (!force && api.hasSession()) return true;
    if (!force && attempted) return false;
    pending = (async () => {
      const result = await login();
      if (!result.code) throw new Error("微信未返回登录凭证，请重试。");
      const authenticated = await api.wechatLogin(result.code);
      attempted = true;
      // A registrationToken is retained by the API client for SMS binding.
      return authenticated;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}
