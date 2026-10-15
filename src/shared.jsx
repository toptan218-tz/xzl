import { createApiClient, ApiError } from "./services/client";
import { mergeFavorites } from "./services/normalize";
import { createAuthFlow } from "./auth-flow";
import shareCover from "./assets/share/cover.jpg";
import { createWechatSession } from "./wechat-session";
import { isWeapp, getNavigationLayout } from "./platform-layout";
const storage = {
  get: (key) => String(getStorageSync(key) || ""),
  set: (key, value) => setStorageSync(key, value),
  remove: (key) => removeStorageSync(key),
};
const api = createApiClient(async (path, method, data, token) => {
  try {
    const result = await request({
      url: API_BASE_URL + path,
      method,
      data,
      timeout: 20000,
      header: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: "Bearer " + token,
            }
          : {}),
      },
    });
    return {
      status: result.statusCode,
      data: result.data,
    };
  } catch (_) {
    throw new ApiError(0, "网络连接暂时失败，请保留问题并重试。");
  }
}, storage);
const currentPage = () =>
  (getCurrentInstance().router?.path || "").match(/pages\/([^/]+)/)?.[1] ||
  "home";
const authFlow = createAuthFlow({
  showModal: (options) => showModal(options),
  navigateTo: (options) => navigateTo(options),
  navigateBack: (options) => navigateBack(options),
  reLaunch: (options) => reLaunch(options),
  getPages: () => getCurrentPages(),
  currentPage,
  clearSession: () => api.clear(),
  hasSession: () => api.hasSession(),
});
const { handleAuthError, openLogin, backFromLogin } = authFlow;
const go = (page, query = "") => {
  if (page === "login") return openLogin();
  const url = "/pages/" + page + "/index" + (query ? "?" + query : "");
  return page === "upgrade"
    ? navigateTo({
        url,
      })
    : reLaunch({
        url,
      });
};
const assetPath = (name) => "/assets/" + name;
const tryWechatLogin = createWechatSession({
  enabled: isWeapp,
  login: () => wechatLogin({ timeout: 10000 }),
  api,
});
const errorMessage = (error) =>
  error instanceof Error ? error.message : "暂时无法读取，请重试。";
import { ScrollView, Button, Text, View } from "@tarojs/components";
import * as React from "react";
import {
  request,
  removeStorageSync,
  setStorageSync,
  getStorageSync,
} from "@tarojs/taro";
import {
  getCurrentInstance,
  showModal,
  navigateTo,
  navigateBack,
  reLaunch,
  getCurrentPages,
  useShareAppMessage,
  useShareTimeline,
  useDidShow,
  login as wechatLogin,
} from "@tarojs/taro";
function useShare() {
  (useShareAppMessage(() => ({
    title: "心之力｜面对困难，想想那些经过实践检验的文字",
    path: "/pages/home/index",
    imageUrl: shareCover,
  })),
    useShareTimeline(() => ({
      title: "心之力｜面对困难，想想那些经过实践检验的文字",
      query: "",
      imageUrl: shareCover,
    })),
    useDidShow(() => {}));
}
function Screen({
  children: e,
  page: t,
  title: n = "心之力",
  compactHome: r = false,
}) {
  const layout = getNavigationLayout();
  return (
    <View
      className={`screen screen-${t}${r ? " home-compose" : ""}${isWeapp ? " screen-weapp" : ""}`}
      style={isWeapp ? { paddingTop: `${layout.topInset}px` } : {}}
    >
      {false}
      <View
        className={"top"}
        style={
          isWeapp
            ? {
                top: `${layout.statusBarHeight}px`,
                height: `${layout.navigationHeight}px`,
                paddingRight: `${layout.rightInset}px`,
              }
            : {}
        }
      >
        <View className={"brand-lockup"}>
          <Text className={"ui-text brand-star"}>{"★"}</Text>
          <Text className={"ui-text brand"}>{n}</Text>
        </View>
        <Text className={"ui-text muted"}>
          {"favorites" === t ? "仅自己可见" : ""}
        </Text>
      </View>
      <View className={"content"}>{e}</View>
      {"login" !== t && "upgrade" !== t && (
        <View className={"nav"}>
          {["home", "favorites", "me"].map((e, n) => (
            <Button
              className={
                "ui-button " + (t === e ? "nav-item active" : "nav-item")
              }
              onClick={() => go(e)}
              key={e}
            >
              <View className={`nav-icon nav-icon-${e}`} />
              <Text className="ui-text">{["首页", "存档", "我的"][n]}</Text>
            </Button>
          ))}
        </View>
      )}
    </View>
  );
}
function Notice({ children: e }) {
  return e ? (
    <View className={"notice"} role={"status"}>
      {e}
    </View>
  ) : null;
}
function useSession(page) {
  const [user, setUser] = React.useState(null);
  const [error, setError] = React.useState("");
  const mounted = React.useRef(true);
  const sequence = React.useRef(0);
  async function retry() {
    const id = ++sequence.current;
    setError("");
    try {
      await tryWechatLogin();
      if (!api.hasSession()) {
        if (mounted.current && id === sequence.current) setUser(null);
        return;
      }
      let profile;
      try {
        profile = await api.me();
      } catch (err) {
        if (!isWeapp || err.status !== 401) throw err;
        api.clear();
        if (!(await tryWechatLogin(true))) {
          if (mounted.current && id === sequence.current) setUser(null);
          return;
        }
        profile = await api.me();
      }
      if (mounted.current && id === sequence.current) setUser(profile);
    } catch (err) {
      if (mounted.current && id === sequence.current) {
        setUser(null);
        // A passive session check never interrupts browsing with a login dialog.
        if (err.status === 401) api.clear();
        else setError(errorMessage(err));
      }
    }
  }
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, []);
  useDidShow(() => {
    retry();
  });
  return {
    user,
    error,
    retry,
  };
}
function SourceReader({ reference: e }) {
  const [t, n] = React.useState(null),
    [r, s] = React.useState(null),
    [a, o] = React.useState(""),
    [l, c] = React.useState(false),
    u = React.useRef(0);
  async function d(mode, retry = false) {
    if (t === mode && !retry) return (u.current++, void n(null));
    const i = ++u.current;
    (n(mode), o(""), c(true));
    try {
      const t = !retry && r != null ? r : await api.article(e.source);
      i === u.current && s(t);
    } catch (d) {
      if (i === u.current) {
        o(errorMessage(d));
        handleAuthError(d, currentPage());
      }
    } finally {
      i === u.current && c(false);
    }
  }
  return (
    React.useEffect(
      () => () => {
        u.current++;
      },
      [],
    ),
    (
      <View className={"source"}>
        <Text className={"ui-text source-title"}>
          {"《"}
          {e.work.title}
          {"》"}
        </Text>
        <Text className={"ui-text date"}>{e.work.date}</Text>
        <View className={"actions"}>
          <Button
            className={
              "ui-button " + ("background" === t ? "primary" : "outline")
            }
            onClick={() => d("background")}
          >
            {"当时背景"}
          </Button>
          <Button
            className={
              "ui-button " + ("original" === t ? "primary" : "outline")
            }
            onClick={() => d("original")}
          >
            {"查看原文"}
          </Button>
        </View>
        {t && (
          <View className={"reader"}>
            <View className={"reader-head"}>
              <Text className="ui-text">
                {"background" === t ? "当时背景" : "原文"}
              </Text>
              <Button
                className={"ui-button text-button"}
                onClick={() => {
                  (u.current++, n(null));
                }}
              >
                {"关闭"}
              </Button>
            </View>
            <ScrollView
              scrollY={true}
              className={
                "background" === t
                  ? "reader-body reader-body-background"
                  : "reader-body"
              }
            >
              {l ? (
                <Notice>{"正在读取…"}</Notice>
              ) : a ? (
                <View>
                  <Notice>{a}</Notice>
                  <Button
                    className={"ui-button outline"}
                    onClick={() => d(t, true)}
                  >
                    {"重试"}
                  </Button>
                </View>
              ) : (
                <View>
                  <Text selectable={true} className={"ui-text prose"}>
                    {("background" === t
                      ? null == r
                        ? void 0
                        : r.historicalContext
                      : null == r
                        ? void 0
                        : r.text) || "暂未提供可展示的内容。"}
                  </Text>
                  {"original" === t && (null == r ? void 0 : r.text) && (
                    <Text className={"ui-text muted prose"}>
                      {"接口未标注观点对应的具体段落；此处展示文章原文供核对。"}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    )
  );
}
function Materials({ items: e }) {
  return (
    <View>
      {e.map((e, t) => (
        <View className={"card"} key={`${e.id}-${t}`}>
          <View className={"viewpoint-heading"}>
            <Text className={"ui-text viewpoint-number"}>
              {String(t + 1).padStart(2, "0")}
            </Text>
            <View className={"heading-rule"} />
            <Text className={"ui-text muted"}>{"观点摘要"}</Text>
          </View>
          <Text className={"ui-text viewpoint"}>{e.viewpoint}</Text>
          {!!e.methods.length && (
            <View className={"methods"}>
              <Text className={"ui-text eyebrow"}>{"方法"}</Text>
              <View className={"method-list"}>
                {e.methods.map((e, t) => (
                  <Text className={"ui-text method-tag"} key={t}>
                    {e}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {e.guidance && (
            <View className={"guidance"}>
              <Text className={"ui-text eyebrow"}>{"阅读方向"}</Text>
              <Text className={"ui-text guidance-text"}>{e.guidance}</Text>
            </View>
          )}
          {!!e.basis.sources.length && (
            <View className={"sources"}>
              <Text className={"ui-text eyebrow"}>{"对应篇目"}</Text>
              {e.basis.sources.map((e, t) => (
                <SourceReader
                  reference={e}
                  key={`${JSON.stringify(e.source)}-${t}`}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
function FavoriteSnapshot({ favorite: e, onResearch: t }) {
  return (
    <View>
      <Text className={"ui-text label"}>{"收藏时的观点快照"}</Text>
      {e.materials.map((e, t) => (
        <View className={"legacy"} key={t}>
          <Text className={"ui-text viewpoint"}>{e.viewpoint}</Text>
          {e.guidance && (
            <Text className={"ui-text guidance-text"}>{e.guidance}</Text>
          )}
        </View>
      ))}
      <Button className={"ui-button outline"} onClick={t}>
        {"重新检索这个问题"}
      </Button>
    </View>
  );
}
export {
  Notice,
  Screen,
  Materials,
  useSession,
  api,
  assetPath,
  FavoriteSnapshot,
  errorMessage,
  go,
  mergeFavorites,
  handleAuthError,
  storage,
  tryWechatLogin,
  useShare,
  openLogin,
  backFromLogin,
};
