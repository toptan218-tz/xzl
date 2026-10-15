const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const babel = require("@babel/core");
function moduleValue(file, name) {
  const code = fs
    .readFileSync(path.join(__dirname, "../src", file), "utf8")
    .replace(/export function /g, "function ");
  return vm.runInNewContext(code + `\n;${name}`, { Promise, Number, Math });
}
const createWechatSession = moduleValue(
  "wechat-session.js",
  "createWechatSession",
);
const calculateLayout = moduleValue(
  "navigation-layout.js",
  "calculateNavigationLayout",
);
test("mini program launch shares one wx.login and exchanges its code for backend tokens", async () => {
  let calls = 0,
    session = false;
  const api = {
    hasSession: () => session,
    wechatLogin: async (code) => {
      assert.equal(code, "wx-code");
      session = true;
      return true;
    },
  };
  const ensure = createWechatSession({
    enabled: true,
    login: async () => {
      calls++;
      return { code: "wx-code" };
    },
    api,
  });
  assert.deepEqual(await Promise.all([ensure(), ensure()]), [true, true]);
  assert.equal(calls, 1);
  await ensure();
  assert.equal(calls, 1);
  await ensure(true);
  assert.equal(calls, 2);
});
test("H5 never calls wx.login; registration-only response does not loop or redirect", async () => {
  let calls = 0;
  const login = async () => {
    calls++;
    return { code: "wx-code" };
  };
  const api = { hasSession: () => false, wechatLogin: async () => false };
  assert.equal(
    await createWechatSession({ enabled: false, login, api })(),
    false,
  );
  assert.equal(calls, 0);
  const ensure = createWechatSession({ enabled: true, login, api });
  assert.equal(await ensure(), false);
  assert.equal(await ensure(), false);
  assert.equal(calls, 1);
});
test("wx.login failure allows retry", async () => {
  let calls = 0;
  const ensure = createWechatSession({
    enabled: true,
    login: async () => {
      if (++calls === 1) throw Error("network");
      return { code: "retry" };
    },
    api: { hasSession: () => false, wechatLogin: async () => true },
  });
  await assert.rejects(ensure());
  assert.equal(await ensure(), true);
});
test("custom navigation clears status bar and capsule on iOS, Android and fallback", () => {
  const ios = calculateLayout(
    { statusBarHeight: 47, windowWidth: 390 },
    { top: 53, height: 32, left: 286 },
  );
  assert.equal(ios.topInset, 91);
  assert.equal(ios.rightInset, 116);
  assert.equal(ios.backTop, 51);
  assert.equal(
    calculateLayout(
      { statusBarHeight: 24, windowWidth: 360 },
      { top: 32, height: 32, left: 260 },
    ).topInset,
    72,
  );
  assert.equal(calculateLayout({ statusBarHeight: 44 }, {}).topInset, 88);
});

function readerHarness(article) {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/shared.jsx"),
    "utf8",
  );
  const component = source.slice(
    source.indexOf("function SourceReader("),
    source.indexOf("function Materials("),
  );
  const code = babel.transformSync(component, {
    configFile: false,
    babelrc: false,
    presets: [[require.resolve("@babel/preset-react"), { runtime: "classic" }]],
  }).code;
  const slots = [];
  let index = 0;
  const React = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [
        slots[slot],
        (value) => {
          slots[slot] =
            typeof value === "function" ? value(slots[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useEffect() {},
    createElement(type, props, ...children) {
      return { type, props: props || {}, children };
    },
  };
  const Reader = vm.runInNewContext(code + "\n;SourceReader", {
    React,
    View: "View",
    Text: "Text",
    Button: "Button",
    ScrollView: "ScrollView",
    Notice: "Notice",
    api: { article },
    errorMessage: (e) => e.message,
    handleAuthError: () => false,
    currentPage: () => "home",
  });
  function render() {
    index = 0;
    return Reader({
      reference: {
        work: { title: "实践论", date: "1937" },
        source: { id: "work-1" },
      },
    });
  }
  const flatten = (node) =>
    node && typeof node === "object"
      ? [node, ...(node.children || []).flatMap(flatten)]
      : [node];
  return {
    render,
    flatten,
    button: (tree, label) =>
      flatten(tree).find(
        (n) => n?.type === "Button" && n.children.includes(label),
      ),
  };
}
test("actual reader buttons open background, switch to original, and close without another request", async () => {
  let calls = 0;
  const h = readerHarness(async (source) => {
    calls++;
    assert.equal(source.id, "work-1");
    return { historicalContext: "背景正文", text: "原文正文" };
  });
  let tree = h.render();
  await h.button(tree, "当时背景").props.onClick();
  tree = h.render();
  assert.ok(h.flatten(tree).includes("背景正文"));
  await h.button(tree, "查看原文").props.onClick();
  tree = h.render();
  assert.ok(h.flatten(tree).includes("原文正文"));
  assert.equal(calls, 1);
  await h.button(tree, "查看原文").props.onClick();
  tree = h.render();
  assert.equal(h.flatten(tree).includes("原文正文"), false);
});
test("reader retry requests article again after a failed response", async () => {
  let calls = 0;
  const h = readerHarness(async () => {
    if (++calls === 1) throw Error("读取失败");
    return { text: "重试成功" };
  });
  await h.button(h.render(), "查看原文").props.onClick();
  let tree = h.render();
  assert.ok(h.flatten(tree).includes("读取失败"));
  await h.button(tree, "重试").props.onClick();
  tree = h.render();
  assert.ok(h.flatten(tree).includes("重试成功"));
  assert.equal(calls, 2);
});
test("page source has no undeclared handler arguments", () => {
  const traverse = require("@babel/traverse").default;
  const parser = require("@babel/parser");
  const allowed = new Set([
    "undefined",
    "console",
    "process",
    "API_BASE_URL",
    "definePageConfig",
    "defineAppConfig",
    "Error",
    "Promise",
    "Map",
    "Set",
    "String",
    "Number",
    "Object",
    "Array",
    "JSON",
    "Math",
    "setTimeout",
    "clearTimeout",
    "encodeURIComponent",
  ]);
  const files = [
    "shared.jsx",
    ...["home", "favorites", "login", "me", "upgrade"].map(
      (n) => `pages/${n}/index.jsx`,
    ),
  ];
  const unknown = [];
  for (const file of files) {
    const ast = parser.parse(
      fs.readFileSync(path.join(__dirname, "../src", file), "utf8"),
      { sourceType: "module", plugins: ["jsx"] },
    );
    traverse(ast, {
      ReferencedIdentifier(p) {
        if (!p.scope.hasBinding(p.node.name) && !allowed.has(p.node.name))
          unknown.push(`${file}:${p.node.name}`);
      },
    });
  }
  assert.deepEqual(unknown, []);
});
