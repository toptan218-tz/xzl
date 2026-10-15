const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function load(file, names, context = {}) {
  let code = fs
    .readFileSync(path.join(__dirname, "../src", file), "utf8")
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm, "")
    .replace(/export\s+(?=(function|class|const))/g, "")
    .replace(/export\s*\{[^}]+\};?/g, "");
  return vm.runInNewContext(code + "\n;({" + names.join(",") + "})", {
    ...context,
    console,
    Map,
    Set,
  });
}
const { createAuthFlow } = load("auth-flow.js", ["createAuthFlow"]);
const normalize = load("services/normalize.js", [
  "payload",
  "normalizeSearch",
  "normalizeFavorite",
  "normalizeList",
  "normalizeStats",
  "normalizeArticle",
]);
const { createApiClient } = load(
  "services/client.js",
  ["createApiClient"],
  normalize,
);
const tick = () => new Promise((resolve) => setImmediate(resolve));
function authHarness(confirm = false) {
  const calls = [];
  let pages = [{ route: "pages/home/index" }, { route: "pages/login/index" }];
  const flow = createAuthFlow({
    currentPage: () => "home",
    getPages: () => pages,
    clearSession: () => calls.push("clear"),
    showModal: async () => {
      calls.push("modal");
      return { confirm };
    },
    navigateTo: async (options) => calls.push(options.url),
    navigateBack: async () => calls.push("back"),
    reLaunch: async (options) => calls.push(options.url),
  });
  return {
    flow,
    calls,
    setPages: (value) => {
      pages = value;
    },
  };
}
test("401 cancel stays on page; concurrent failures share one dialog", async () => {
  const { flow, calls } = authHarness();
  assert.equal(flow.handleAuthError({ status: 401 }, "home"), true);
  flow.handleAuthError({ status: 401 }, "home");
  await tick();
  assert.equal(calls.filter((x) => x === "modal").length, 1);
  assert.equal(
    calls.some((x) => x.startsWith("/pages/")),
    false,
  );
});
test("confirm pushes login and back returns to preserved page", async () => {
  const { flow, calls } = authHarness(true);
  flow.handleAuthError({ status: 401 }, "favorites");
  await tick();
  assert.ok(calls.includes("/pages/login/index?next=favorites"));
  await flow.backFromLogin();
  assert.equal(calls.at(-1), "back");
});
test("direct login entry falls back to home; other errors do not prompt login", async () => {
  const { flow, calls, setPages } = authHarness();
  assert.equal(flow.handleAuthError({ status: 500 }, "home"), false);
  setPages([]);
  await flow.backFromLogin("invalid");
  assert.equal(calls.at(-1), "/pages/home/index");
});

test("guest network failure offers optional login without clearing unrelated state", async () => {
  const calls = [];
  const flow = createAuthFlow({
    currentPage: () => "favorites",
    hasSession: () => false,
    clearSession: () => calls.push("clear"),
    showModal: async (options) => {
      calls.push(options.content);
      return { confirm: false };
    },
  });
  assert.equal(
    flow.handleAuthError({ status: 0, message: "网络连接失败" }, "favorites"),
    true,
  );
  await tick();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes("网络连接失败"));
});
test("expired token refreshes once for concurrent requests and retries with new token", async () => {
  const store = new Map([
    ["xinzhili_access_token", "old"],
    ["xinzhili_refresh_token", "refresh"],
  ]);
  let refreshCount = 0;
  const api = createApiClient(
    async (url, method, data, token) => {
      if (url === "/auth/token/refresh") {
        refreshCount++;
        await tick();
        return {
          status: 200,
          data: { accessToken: "new", refreshToken: "newRefresh" },
        };
      }
      return token === "new"
        ? { status: 200, data: { user: { id: "1" } } }
        : { status: 401, data: { message: "expired" } };
    },
    {
      get: (key) => store.get(key),
      set: (key, value) => store.set(key, value),
      remove: (key) => store.delete(key),
    },
  );
  const users = await Promise.all([api.me(), api.me()]);
  assert.equal(refreshCount, 1);
  assert.equal(users[0].id, "1");
});
test("guest protected request really reaches API and returns 401; public search works", async () => {
  const calls = [];
  const api = createApiClient(
    async (url, method, data, token) => {
      calls.push({ url, token });
      return url === "/insights/search"
        ? { status: 200, data: { input: data.text, materials: [] } }
        : { status: 401, data: { message: "请登录" } };
    },
    { get: () => "", set: () => {}, remove: () => {} },
  );
  await assert.rejects(api.me(), (error) => error.status === 401);
  assert.equal((await api.search("测试")).input, "测试");
  assert.equal(calls.length, 2);
});
