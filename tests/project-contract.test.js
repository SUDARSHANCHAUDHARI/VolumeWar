const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const readProjectFile = (fileName) => fs.readFileSync(path.join(projectRoot, fileName), "utf8");

const html = readProjectFile("index.html");
const script = readProjectFile("script.js");
const styles = readProjectFile("styles.css");
const readme = readProjectFile("README.md");
const packageJson = JSON.parse(readProjectFile("package.json"));

function effectiveRootTokens(css) {
  const tokens = {};
  for (const match of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const declaration of match[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[declaration[1]] = declaration[2].trim();
    }
  }
  return tokens;
}

test("audio requires explicit controls and has no autoplay surface", () => {
  assert.match(html, /id="startButton"/);
  assert.match(html, /id="stopButton"/);
  assert.doesNotMatch(html, /<(audio|video)\b[^>]*\sautoplay(?:\s|=|>)/i);
  assert.equal((script.match(/new AudioContextClass\(\)/g) || []).length, 1);
  assert.match(script, /startButton\.addEventListener\("click", startSound\)/);
});

test("the final audio gain remains inside the documented safety cap", () => {
  const gainMatch = script.match(/static MAX_GAIN = ([0-9.]+);/);

  assert.ok(gainMatch, "SafeSynth.MAX_GAIN must be declared");
  assert.ok(Number(gainMatch[1]) <= 0.08, "MAX_GAIN must not exceed 0.08");
});

test("production markup declares a restrictive static-site policy", () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'none'/);
  assert.doesNotMatch(html, /<(script|link)[^>]+https?:\/\//i);
});

test("required controls and accessibility hooks remain present", () => {
  const requiredIds = [
    "volumeSlider",
    "secondSlider",
    "muteButton",
    "startButton",
    "stopButton",
    "resetButton",
    "attemptMeter",
    "battleStatus"
  ];

  requiredIds.forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="progressbar"/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("runtime code avoids dynamic HTML and string execution", () => {
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.doesNotMatch(script, /\beval\s*\(/);
  assert.doesNotMatch(script, /new Function\s*\(/);
  assert.doesNotMatch(script, /document\.write\s*\(/);
});

test("the release gate always produces the production artifact", () => {
  assert.equal(packageJson.scripts.build, "node scripts/build.js");
  assert.match(packageJson.scripts.check, /node scripts\/build\.js/);
});

test("the README preserves verified author and ownership details", () => {
  assert.match(readme, /Sudarshan Chaudhari/);
  assert.match(readme, /SudarshanTechLabs/);
  assert.match(readme, /SUDARSHANCHAUDHARI/);
  assert.match(readme, /sunny\.sudarshan@gmail\.com/);
  assert.match(readme, /sudarshantechlabs@gmail\.com/);
  assert.match(readme, /Bangkok, Thailand/);
  assert.match(readme, /does not currently include an open-source license/);
});

test("uses the shared TinyChaos shell contract", () => {
  const tokens = effectiveRootTokens(styles);
  for (const [name, expected] of Object.entries({
    "--ink": "#15152a",
    "--paper": "#fff5df",
    "--coral": "#ff5d5d",
    "--blue": "#4f7cff",
    "--butter": "#ffd166",
    "--mint": "#58d6a9",
    "--lilac": "#b695ff",
  })) {
    assert.equal(tokens[name]?.toLowerCase(), expected, `${name} must resolve to ${expected}`);
  }
  assert.match(styles, /--display-font:\s*Impact/);
  assert.match(styles, /--body-font:\s*"Arial Rounded MT Bold"/);
  assert.match(styles, /body\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-x:\s*clip;[\s\S]*overflow-y:\s*auto;/);
  assert.match(styles, /html\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(styles, /button:focus-visible,[\s\S]*outline:\s*4px solid var\(--blue\)/);
  assert.match(html, /href="https:\/\/sudarshanchaudhari\.github\.io\/TinyChaos\/"/);
  assert.match(html, /VolumeWar · by Sudarshan Chaudhari/);
});
