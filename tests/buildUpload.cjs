const path = require("node:path");
const fs = require("node:fs");
const webpack = require("webpack");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "dist/upload-interaction");
webpack(
  {
    mode: "development",
    devtool: false,
    target: "web",
    entry: path.join(__dirname, "uploadFixture.tsx"),
    output: { path: out, filename: "fixture.js" },
    resolve: { extensions: [".ts", ".tsx", ".js"] },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: { loader: "ts-loader", options: { transpileOnly: true } },
        },
        { test: /\.(png|jpg|jpeg|svg|webp)$/, type: "asset/resource" },
      ],
    },
  },
  (err, stats) => {
    if (err || stats.hasErrors()) {
      console.error(err || stats.toString({ all: false, errors: true }));
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(
      path.join(out, "index.html"),
      '<html><body><div id="root"></div><script src="fixture.js"></script></body></html>',
    );
    // Use the actual compiled player preload, not a mock of getPathForFile.
    webpack(
      {
        mode: "development",
        devtool: false,
        target: "electron-preload",
        entry: path.join(root, "src/player/preload.ts"),
        output: { path: out, filename: "preload.js" },
        resolve: { extensions: [".ts", ".js"] },
        module: {
          rules: [
            {
              test: /\.ts$/,
              exclude: /node_modules/,
              use: { loader: "ts-loader", options: { transpileOnly: true } },
            },
          ],
        },
      },
      (err, stats) => {
        if (err || stats.hasErrors()) {
          console.error(err || stats.toString({ all: false, errors: true }));
          process.exitCode = 1;
        } else console.log("Upload fixture built");
      },
    );
  },
);
