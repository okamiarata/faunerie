const isUpdater = !!process.argv[2];
let baseVersion = "0.0.0";

if (isUpdater) {
    baseVersion = require('./updater/package.json')['version'];
} else {
    baseVersion = require('./package.json')['version'];
}

process.stdout.write(baseVersion + "-" + new Date().toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .split(".")[0]
    .replace("T", ".")
);
