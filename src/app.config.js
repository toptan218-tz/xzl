export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/favorites/index",
    "pages/me/index",
    "pages/upgrade/index",
  ],
  subPackages: [{ root: "pages/login", pages: ["index"] }],
  window: {
    navigationBarTitleText: "心之力",
    navigationBarBackgroundColor: "#f5f0e7",
    navigationBarTextStyle: "black",
    backgroundColor: "#f5f0e7",
    navigationStyle: "custom",
  },
});
