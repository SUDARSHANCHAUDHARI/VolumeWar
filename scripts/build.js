"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "dist");
const deployableFiles = Object.freeze([
  "index.html",
  "styles.css",
  "game-state.js",
  "script.js",
  "favicon.svg"
]);
const maximumArtifactBytes = 128 * 1024;

function assertSafeOutputDirectory() {
  if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== "dist") {
    throw new Error("Refusing to build outside the project dist directory.");
  }
}

function assertRuntimeAssetsExist() {
  const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const assetPattern = /<(?:script|link|img|source)\b[^>]*\b(?:src|href)="([^"]+)"/gi;
  const references = [...html.matchAll(assetPattern)].map((match) => match[1]);

  references.forEach((reference) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith("//")) {
      throw new Error(`Remote runtime asset is not allowed: ${reference}`);
    }

    const cleanReference = reference.split(/[?#]/, 1)[0];
    const sourcePath = path.resolve(projectRoot, cleanReference);
    if (!sourcePath.startsWith(`${projectRoot}${path.sep}`)) {
      throw new Error(`Runtime asset escapes the project root: ${reference}`);
    }
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing runtime asset referenced by index.html: ${reference}`);
    }
    if (!deployableFiles.includes(cleanReference)) {
      throw new Error(`Runtime asset is not included in the production artifact: ${reference}`);
    }
  });
}

function build() {
  assertSafeOutputDirectory();
  assertRuntimeAssetsExist();

  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory);

  let artifactBytes = 0;
  deployableFiles.forEach((fileName) => {
    const sourcePath = path.join(projectRoot, fileName);
    const outputPath = path.join(outputDirectory, fileName);
    const fileSize = fs.statSync(sourcePath).size;

    fs.copyFileSync(sourcePath, outputPath);
    artifactBytes += fileSize;
  });

  if (artifactBytes > maximumArtifactBytes) {
    throw new Error(
      `Production artifact is ${artifactBytes} bytes, exceeding the ${maximumArtifactBytes}-byte budget.`
    );
  }

  const kibibytes = (artifactBytes / 1024).toFixed(1);
  console.log(`Built ${deployableFiles.length} files in dist/ (${kibibytes} KiB).`);
}

build();
