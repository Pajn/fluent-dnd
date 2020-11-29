const { chromeLauncher } = require("@web/test-runner")

// NODE_ENV=test - Needed by "@snowpack/web-test-runner-plugin"
process.env.NODE_ENV = "test"

/** @type {import("@web/test-runner").TestRunnerConfig } */
module.exports = {
  browsers: [
    process.env.CI === "true"
      ? chromeLauncher({ launchOptions: { args: ["--no-sandbox"] } })
      : chromeLauncher(),
  ],
  plugins: [
    require("@snowpack/web-test-runner-plugin")(),
    require("./testrunner-plugins/snapshot.js")(),
  ],
}
