import { getCurrentInstance, getSystemInfoSync } from "@tarojs/taro";
import { Button, Input, Text, Image, View } from "@tarojs/components";
import * as React from "react";
import loginBackground from "./assets/login-screen-background.png";
import { useShare, api, backFromLogin, errorMessage } from "../../shared";
import { isWeapp, getNavigationLayout } from "../../platform-layout";
function LoginPage() {
  const layout = getNavigationLayout();
  useShare();
  const [phone, setPhone] = React.useState(""),
    [code, setCode] = React.useState(""),
    [requestId, setRequestId] = React.useState(""),
    [countdown, setCountdown] = React.useState(0),
    [sending, setSending] = React.useState(false),
    [loggingIn, setLoggingIn] = React.useState(false),
    [message, setMessage] = React.useState(""),
    smsBusy = React.useRef(false),
    loginBusy = React.useRef(false),
    [windowHeight] = React.useState(() => getSystemInfoSync().windowHeight),
    [windowWidth] = React.useState(() => getSystemInfoSync().windowWidth),
    boardWidth = Math.min(
      windowWidth,
      0.5654 * (windowHeight - layout.topInset),
    ),
    boardHeight = 1.7686 * boardWidth;
  async function sendCode() {
    var e;
    if (phone.trim() && !smsBusy.current && !countdown) {
      ((smsBusy.current = true), setSending(true), setMessage(""));
      try {
        0;
        const t = await api.sendSms(phone.trim());
        if ("string" !== typeof t.requestId)
          throw new Error("验证码暂时无法发送，请重试。");
        (setRequestId(t.requestId),
          setCountdown(Number(null != (e = t.retryAfter) ? e : 60)),
          null != t.virtualCode &&
            (setCode(String(t.virtualCode)),
            setMessage(`模拟验证码：${t.virtualCode}`)));
      } catch (t) {
        setMessage(errorMessage(t));
      } finally {
        ((smsBusy.current = false), setSending(false));
      }
    }
  }
  async function login() {
    var e;
    if (!loginBusy.current && requestId && code.trim()) {
      ((loginBusy.current = true), setLoggingIn(true), setMessage(""));
      try {
        (await api.login(phone.trim(), code.trim(), requestId), await api.me());
        const t =
          null == (e = getCurrentInstance().router) ? void 0 : e.params.next;
        await backFromLogin(t || "home");
      } catch (t) {
        setMessage(errorMessage(t));
      } finally {
        ((loginBusy.current = false), setLoggingIn(false));
      }
    }
  }
  return (
    React.useEffect(() => {
      if (!countdown) return;
      const e = setTimeout(() => setCountdown((e) => Math.max(e - 1, 0)), 1e3);
      return () => clearTimeout(e);
    }, [countdown]),
    (
      <View
        className={"login"}
        style={{
          minHeight: `${windowHeight}px`,
          paddingTop: isWeapp ? `${layout.topInset}px` : undefined,
        }}
      >
        <Button
          className="login-back ui-button"
          style={isWeapp ? { top: `${layout.backTop}px` } : {}}
          onClick={() => backFromLogin()}
        >
          返回
        </Button>
        <View
          className={"login-board"}
          style={{
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
          }}
        >
          <Image
            className={"login-background"}
            src={loginBackground}
            mode={"scaleToFill"}
          />
          <View className={"login-form"}>
            {message && (
              <Text className={"ui-text login-message"}>{message}</Text>
            )}
            <View className={"login-row"}>
              <Input
                className={"ui-input field"}
                type={"number"}
                value={phone}
                disabled={sending || loggingIn}
                maxlength={20}
                placeholder={"请输入手机号"}
                onInput={(e) => {
                  (setPhone(e.detail.value), setRequestId(""), setCode(""));
                }}
                adjustPosition={true}
                cursorSpacing={100}
              />
              <Button
                className={"ui-button primary"}
                onClick={sendCode}
                disabled={!phone.trim() || sending || countdown > 0}
              >
                {sending
                  ? "发送中…"
                  : countdown
                    ? `${countdown} 秒`
                    : "获取验证码"}
              </Button>
            </View>
            <View className={"login-row"}>
              <Input
                className={"ui-input field"}
                type={"number"}
                value={code}
                disabled={loggingIn}
                maxlength={12}
                placeholder={"请输入短信验证码"}
                onInput={(e) => setCode(e.detail.value)}
                adjustPosition={true}
                cursorSpacing={80}
              />
              <Button
                className={"ui-button primary"}
                disabled={
                  loggingIn || !phone.trim() || !code.trim() || !requestId
                }
                onClick={login}
              >
                {loggingIn ? "登录中…" : "手机号登录"}
              </Button>
            </View>
          </View>
        </View>
      </View>
    )
  );
}
export { LoginPage as default };
