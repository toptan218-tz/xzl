// Dependency injection keeps navigation rules testable without a browser or WeChat.
export function createAuthFlow({
  showModal,
  navigateTo,
  navigateBack,
  reLaunch,
  getPages,
  currentPage,
  clearSession,
  hasSession = () => true,
}) {
  let pending = null;
  function openLogin(next = currentPage()) {
    if (currentPage() === "login") return Promise.resolve();
    return navigateTo({
      url: `/pages/login/index?next=${encodeURIComponent(next || "home")}`,
    });
  }
  function handleAuthError(error, next) {
    const expired = error?.status === 401;
    const guestFailure = !hasSession() && typeof error?.status === "number";
    if (!expired && !guestFailure) return false;
    if (currentPage() === "login") return false;
    if (expired) clearSession();
    if (!pending) {
      pending = Promise.resolve()
        .then(() =>
          showModal({
            title: expired ? "登录提示" : "请求失败",
            content: expired
              ? "当前未登录或登录已过期，是否前往登录？"
              : `${error.message || "请求暂时无法完成。"} 当前未登录，是否前往登录？`,
            confirmText: "去登录",
            cancelText: "暂不登录",
          }),
        )
        .then((result) => (result.confirm ? openLogin(next) : undefined))
        .catch(() => undefined)
        .finally(() => {
          pending = null;
        });
    }
    return true;
  }
  async function backFromLogin(fallback = "home") {
    if (getPages().length > 1) {
      try {
        await navigateBack({ delta: 1 });
        return;
      } catch (_) {
        /* Direct H5 entry has no usable history. */
      }
    }
    const page = ["home", "favorites", "me", "upgrade"].includes(fallback)
      ? fallback
      : "home";
    await reLaunch({ url: `/pages/${page}/index` });
  }
  return { openLogin, handleAuthError, backFromLogin };
}
