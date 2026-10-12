const packageJson = require("../package.json");

const tag = process.argv[2];

if (tag && tag !== `v${packageJson.version}`) {
  throw new Error(
    `Release tag ${tag} does not match package version v${packageJson.version}`,
  );
}

console.log(
  `Version ${packageJson.version} is consistent${tag ? ` with ${tag}` : ""}.`,
);
