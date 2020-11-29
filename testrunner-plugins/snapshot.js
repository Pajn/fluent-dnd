const fs = require("fs/promises")
const path = require("path")

module.exports = function snapshotPlugin() {
  let rootDir = ""

  return {
    name: "snapshot",

    serverStart({ config }) {
      rootDir = config.rootDir
    },

    async executeCommand({ command, payload, session }) {
      if (command === "take-snapshot") {
        function getDir(name) {
          return path.join(
            rootDir,
            "test-data",
            name,
            path
              .relative(rootDir, path.dirname(session.testFile))
              .replace(/\/__tests__(\/|$)/g, ""),
          )
        }
        async function writeSnapshot(dir, data) {
          await fs.writeFile(
            path.join(dir, name),
            JSON.stringify(data, undefined, 2),
            { encoding: "utf8" },
          )
        }

        const dir = getDir("snapshots")
        const name =
          path.basename(
            session.testFile,
            `.test` + path.extname(session.testFile),
          ) + `.json`

        await fs.mkdir(dir, { recursive: true })
        let contents
        try {
          contents = await fs.readFile(path.join(dir, name), {
            encoding: "utf8",
          })
          contents = JSON.parse(contents)
        } catch (_) {}
        if (
          contents?.[payload.name] === undefined ||
          process.env["TEST_UPDATE_SNAPSHOT"] === "true"
        ) {
          await writeSnapshot(dir, {
            ...contents,
            [payload.name]: payload.data,
          })
          return { content: payload.data }
        } else {
          const changedDir = getDir("changed-snapshots")
          await fs.mkdir(changedDir, { recursive: true })
          let changedContents
          try {
            changedContents = await fs.readFile(path.join(changedDir, name), {
              encoding: "utf8",
            })
            changedContents = JSON.parse(changedContents)
          } catch (_) {}
          await writeSnapshot(changedDir, {
            ...changedContents,
            [payload.name]: payload.data,
          })
          return { content: contents[payload.name] }
        }
      }
    },
  }
}
