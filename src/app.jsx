import "./app.scss";
import { useLaunch } from "@tarojs/taro";
import { tryWechatLogin } from "./shared";
export default function App({ children }) {
  useLaunch(() => {
    tryWechatLogin().catch(() => {
      /* Page session check displays failures. */
    });
  });
  return children;
}
