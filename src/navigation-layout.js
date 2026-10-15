export function calculateNavigationLayout(windowInfo = {}, capsule = {}) {
  const statusBarHeight = Math.max(0, Number(windowInfo.statusBarHeight) || 0);
  const width = Number(windowInfo.windowWidth) || 375;
  const validCapsule =
    capsule.height > 0 &&
    capsule.top >= statusBarHeight &&
    capsule.left > 0 &&
    capsule.left < width;
  const navigationHeight = validCapsule
    ? Math.max(44, (capsule.top - statusBarHeight) * 2 + capsule.height)
    : 44;
  return {
    statusBarHeight,
    navigationHeight,
    topInset: statusBarHeight + navigationHeight,
    rightInset: validCapsule ? width - capsule.left + 12 : 104,
    backTop: statusBarHeight + (navigationHeight - 36) / 2,
  };
}
