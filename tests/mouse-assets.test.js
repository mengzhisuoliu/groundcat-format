const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { test } = require("node:test");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const assetRoot = path.join(root, "public", "assets");
const svgPath = path.join(assetRoot, "ground-cat", "ground-cat-logo.svg");
const iconPath = path.join(root, "build", "icon.png");

async function normalizedPixels(input, size) {
  return sharp(input, { density: 384 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3"
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function meanAbsoluteError(actual, expected) {
  assert.strictEqual(actual.length, expected.length);
  let error = 0;
  for (let index = 0; index < actual.length; index += 1) {
    error += Math.abs(actual[index] - expected[index]);
  }
  return error / actual.length;
}

test("GroundCat logo is a self-contained vector SVG", () => {
  assert.ok(fs.existsSync(svgPath), "GroundCat SVG source is missing");
  const svg = fs.readFileSync(svgPath, "utf8");
  assert.ok(svg.length > 1500, "GroundCat SVG looks like a placeholder");
  assert.match(svg, /<svg[^>]+viewBox="0 0 512 512"/);
  assert.match(svg, /猫头、走地鸡身体/);
  assert.match(svg, /<path/);
  assert.doesNotMatch(svg, /<image|data:image|base64/i, "logo must not embed a bitmap");
});

test("packaging icon is generated from the GroundCat SVG source", async () => {
  assert.ok(fs.existsSync(iconPath), "build/icon.png is missing");
  const metadata = await sharp(iconPath).metadata();
  assert.strictEqual(metadata.format, "png");
  assert.strictEqual(metadata.width, 512);
  assert.strictEqual(metadata.height, 512);
  assert.strictEqual(metadata.channels, 4);

  for (const size of [64, 512]) {
    const [expected, actual] = await Promise.all([
      normalizedPixels(svgPath, size),
      normalizedPixels(iconPath, size)
    ]);
    const threshold = size === 64 ? 2 : 0.1;
    assert.ok(meanAbsoluteError(actual, expected) < threshold, `packaging icon diverges from SVG at ${size}px`);
  }
});

test("minimal renderer has no mascot or bitmap dependency", () => {
  const html = fs.readFileSync(path.join(assetRoot, "..", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(assetRoot, "..", "app.js"), "utf8");
  assert.match(app, /const mouseAssets/);
  assert.doesNotMatch(html, /id="mouseMascot"|class="cat-/);
  assert.doesNotMatch(html, /mouse-format\/.*\.png|sponsor-qr\.jpg/);
  assert.doesNotMatch(app, /mouse-format\/.*\.png/);
});
