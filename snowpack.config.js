/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: "/",
    src: "/src",
    examples: "/examples",
  },
  plugins: ["@snowpack/plugin-react-refresh", "@snowpack/plugin-typescript"],
  install: [
    /* ... */
  ],
  installOptions: {
    externalPackage: ["/__web-dev-server__web-socket.js"],
  },
  devOptions: {
    port: 3075,
  },
  buildOptions: {
    baseUrl: "/",
  },
  proxy: {
    /* ... */
  },
  alias: {
    "@examples": "./examples",
    "@lib": "./src",
  },
}
