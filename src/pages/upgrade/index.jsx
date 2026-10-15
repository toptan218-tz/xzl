import { Button, View, Text } from "@tarojs/components";
import { getCurrentInstance } from "@tarojs/taro";
import * as React from "react";
import {
  useSession,
  storage,
  api,
  errorMessage,
  Screen,
  go,
  Notice,
  handleAuthError,
} from "../../shared";
function UpgradePage() {
  var h;
  const session = useSession("upgrade"),
    [message, setMessage] = React.useState(""),
    [totalFavorites, setTotalFavorites] = React.useState(null),
    fromLimit =
      "limit" ===
      (null == (h = getCurrentInstance().router) ? void 0 : h.params.source),
    pendingQuestion = storage.get("xinzhili_paywall_question");
  return (
    React.useEffect(() => {
      session.user &&
        api
          .stats()
          .then((s) => setTotalFavorites(s.totalFavorites))
          .catch(
            (s) => handleAuthError(s, "upgrade") || setMessage(errorMessage(s)),
          );
    }, [session.user]),
    (
      <Screen page={"upgrade"}>
        <Text className={"ui-text page-title centered"}>{"升级存档"}</Text>
        <Text className={"ui-text muted centered"}>
          {fromLimit
            ? `你已使用 ${null != totalFavorites ? totalFavorites : "—"} 条免费存档额度。`
            : "升级存档空间，保存更多问题与思考。"}
        </Text>
        {fromLimit && pendingQuestion && (
          <View className={"card"}>
            <Text className={"ui-text eyebrow"}>{"本次想保存的问题"}</Text>
            <Text className={"ui-text prose"}>{pendingQuestion}</Text>
          </View>
        )}
        <Text className={"ui-text section-heading"}>
          {"选择适合你的存档方式"}
        </Text>
        <View className={"plans"}>
          {["免费版", "年度会员"].map((s, e) => (
            <View className={e ? "plan recommended" : "plan"} key={s}>
              <Text className={"ui-text viewpoint"}>{s}</Text>
              <Text className={"ui-text price"}>
                {e ? "¥68/年" : "5 条存档"}
              </Text>
              {["基础查看", "无限存档", "备注与分类", "多设备同步"].map(
                (s, l) => (
                  <Text className={"ui-text feature"} key={s}>
                    {e || !l ? "✓" : "−"}
                    {"\u3000"}
                    {s}
                  </Text>
                ),
              )}
            </View>
          ))}
        </View>
        <Button
          className={"ui-button primary submit"}
          onClick={() => setMessage("会员升级暂未开放，现有存档仍可正常查看。")}
        >
          {"升级后继续收藏"}
        </Button>
        <Button
          className={"ui-button text-button"}
          onClick={() => go("favorites")}
        >
          {"返回查看现有存档"}
        </Button>
        <Notice>{session.error || message}</Notice>
      </Screen>
    )
  );
}
export { UpgradePage as default };
