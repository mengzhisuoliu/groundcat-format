const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const source = path.join(root, "public", "assets", "ground-cat", "ground-cat-logo.svg");

async function build() {
  const svg = await fs.readFile(source);
  await fs.mkdir(path.join(root, "build"), { recursive: true });
  await sharp(svg, { density: 384 })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(root, "build", "icon.png"));
  console.log("Generated build/icon.png from the GroundCat SVG source.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
