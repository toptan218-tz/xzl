const assetName = (file) => file.replace(/\\/g, "/").split("/src/").pop();
module.exports = {
  projectName: "xinzhili",
  date: "2026-10-15",
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: "src",
  outputRoot: `dist/${process.env.TARO_ENV}`,
  framework: "react",
  compiler: "vite",
  plugins: ["@tarojs/plugin-platform-h5", "@tarojs/plugin-platform-weapp"],
  defineConstants: {
    API_BASE_URL: JSON.stringify(
      process.env.TARO_APP_API_BASE || "https://xzl.mopu.top/es/api/v1",
    ),
  },
  imageUrlLoaderOption: { limit: false, name: assetName },
  mini: {
    imageUrlLoaderOption: { limit: false, name: assetName },
    postcss: { pxtransform: { enable: false } },
    // Keep the large original login artwork outside the 2 MB main package.
    optimizeMainPackage: { enable: true },
  },
  h5: {
    imageUrlLoaderOption: { limit: false, name: assetName },
    publicPath: "./",
    router: { mode: "hash" },
    postcss: { pxtransform: { enable: false } },
    devServer: { host: "0.0.0.0", port: 10086 },
  },
};
