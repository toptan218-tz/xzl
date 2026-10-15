import {
  normalizeSearch,
  normalizeFavorite,
  normalizeList,
  normalizeStats,
  normalizeArticle,
  payload,
} from "./normalize";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function createApiClient(transport, storage) {
  const ACCESS = "xinzhili_access_token";
  const REFRESH = "xinzhili_refresh_token";
  let refreshPromise = null;
  let registrationToken = "";
  const articles = new Map();
  function clear() {
    storage.remove(ACCESS);
    storage.remove(REFRESH);
    registrationToken = "";
    articles.clear();
  }
  function save(response) {
    const data = payload(response);
    if (!data.accessToken || !data.refreshToken)
      throw new ApiError(0, "登录服务未返回有效令牌。");
    storage.set(ACCESS, data.accessToken);
    storage.set(REFRESH, data.refreshToken);
    if (storage.get(ACCESS) !== data.accessToken)
      throw new ApiError(0, "无法保存登录状态，请检查存储权限。");
  }
  async function refresh() {
    if (!storage.get(REFRESH)) return false;
    if (!refreshPromise)
      refreshPromise = (async () => {
        const result = await transport("/auth/token/refresh", "POST", {
          refreshToken: storage.get(REFRESH),
        });
        if ([401, 403].includes(result.status)) {
          clear();
          return false;
        }
        if (result.status < 200 || result.status >= 300)
          throw new ApiError(result.status, "登录状态暂时无法验证，请重试。");
        save(result.data);
        return true;
      })().finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }
  async function request(path, method = "GET", data, authenticated = true) {
    let result = await transport(
      path,
      method,
      data,
      authenticated ? storage.get(ACCESS) : undefined,
    );
    if (authenticated && result.status === 401 && (await refresh())) {
      result = await transport(path, method, data, storage.get(ACCESS));
    }
    if (result.status < 200 || result.status >= 300) {
      const body = payload(result.data);
      let message =
        body.error?.message ||
        body.error ||
        body.message ||
        "请求暂时无法完成，请重试。";
      if (typeof message !== "string") message = "请求暂时无法完成，请重试。";
      if (
        path === "/favorites" &&
        method === "POST" &&
        /duplicate entry.*favorite_categories/i.test(message)
      )
        throw new ApiError(409, "这个问题已经收藏过了。");
      if (/sql|duplicate entry|database|constraint/i.test(message))
        message = "请求暂时无法完成，请重试。";
      throw new ApiError(result.status, message);
    }
    return result.data;
  }
  return {
    save,
    clear,
    request,
    hasToken: () => !!storage.get(ACCESS),
    hasSession: () => !!(storage.get(ACCESS) || storage.get(REFRESH)),
    hasRegistration: () => !!registrationToken,
    async wechatLogin(code) {
      const data = payload(
        await request(
          "/auth/wechat/login",
          "POST",
          { wechatCode: code },
          false,
        ),
      );
      if (data.accessToken && data.refreshToken) {
        save(data);
        return true;
      }
      if (data.registrationToken) {
        registrationToken = data.registrationToken;
        return false;
      }
      throw new ApiError(0, "微信登录服务未返回有效凭证，请重试。");
    },
    async login(phone, code, requestId) {
      save(
        await request(
          "/auth/sms/login",
          "POST",
          {
            phone,
            code,
            requestId,
            ...(registrationToken ? { registrationToken } : {}),
          },
          false,
        ),
      );
      registrationToken = "";
    },
    async sendSms(phone) {
      return payload(await request("/auth/sms/send", "POST", { phone }, false));
    },
    async me() {
      const data = payload(await request("/users/me"));
      return data.user || data;
    },
    async logout() {
      try {
        await request(
          "/auth/logout",
          "POST",
          { refreshToken: storage.get(REFRESH) },
          false,
        );
      } finally {
        clear();
      }
    },
    // Search/original were public endpoints in the supplied H5 bundle.
    async search(text) {
      return normalizeSearch(
        await request("/insights/search", "POST", { text, limit: 5 }, false),
        text,
      );
    },
    async list(filters = {}) {
      const query = Object.entries({ limit: "50", ...filters })
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      return normalizeList(await request(`/favorites?${query}`));
    },
    async stats() {
      return normalizeStats(await request("/favorites/statistics/categories"));
    },
    async detail(id) {
      return normalizeFavorite(
        await request(`/favorites/${encodeURIComponent(id)}`),
      );
    },
    async create(question) {
      const data = payload(await request("/favorites", "POST", { question }));
      return {
        created: typeof data.created === "boolean" ? data.created : null,
      };
    },
    async edit(id, title, note) {
      await request(`/favorites/${encodeURIComponent(id)}`, "PATCH", {
        title,
        note,
      });
    },
    async remove(id) {
      await request(`/favorites/${encodeURIComponent(id)}`, "DELETE");
    },
    async feedback(rating, content) {
      if (!["inspiring", "not_relevant", "unclear"].includes(rating))
        throw new ApiError(0, "请选择使用感受。");
      if (!content.trim() || content.length > 300)
        throw new ApiError(0, "请填写300字以内的反馈。");
      const data = payload(
        await request("/feedback", "POST", { rating, content }),
      );
      if (data.success === false)
        throw new ApiError(0, data.message || "反馈未提交成功，请重试。");
    },
    async article(source) {
      const key = JSON.stringify(source);
      if (!articles.has(key))
        articles.set(
          key,
          request(
            "/articles/original",
            "POST",
            { source, mode: "original" },
            false,
          )
            .then(normalizeArticle)
            .finally(() => articles.delete(key)),
        );
      return articles.get(key);
    },
  };
}
