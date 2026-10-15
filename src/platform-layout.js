import {
  getWindowInfo,
  getSystemInfoSync,
  getMenuButtonBoundingClientRect,
} from "@tarojs/taro";
import { calculateNavigationLayout } from "./navigation-layout";

export const isWeapp = process.env.TARO_ENV === "weapp";
export function getNavigationLayout() {
  if (!isWeapp) return { topInset: 0 };
  let info = {};
  let capsule = {};
  try {
    info = getWindowInfo();
  } catch (_) {
    try {
      info = getSystemInfoSync();
    } catch (_) {
      /* Use navigation defaults. */
    }
  }
  try {
    capsule = getMenuButtonBoundingClientRect();
  } catch (_) {
    /* Old base libraries. */
  }
  return calculateNavigationLayout(info, capsule);
}
