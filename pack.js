const {readFileSync, writeFileSync, existsSync, mkdirSync} = require("fs");
const {resolve} = require("path");
const AdmZip = require("adm-zip");

const {name, version} = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

// Update version in build/manifest.json
const manifestPath = resolve(__dirname, "build", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

const outDir = "release";
const filename = `${name}-v${version}.zip`;

if (!existsSync(outDir)) mkdirSync(outDir);

const zip = new AdmZip();
zip.addLocalFolder("build", "", (filename) => !filename.endsWith(".map"));
zip.writeZip(`${outDir}/${filename}`);

console.log(`Successfully created ${filename} file under ${outDir} directory.`);
