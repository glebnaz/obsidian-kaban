import { readFileSync, writeFileSync } from "fs";

// When called from npm version hook, use npm_package_version.
// When called standalone (CI), read version from package.json.
const targetVersion =
  process.env.npm_package_version ||
  JSON.parse(readFileSync("package.json", "utf8")).version;

let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
