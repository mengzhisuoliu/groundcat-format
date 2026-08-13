const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { test } = require("node:test");

const publicRoot = path.join(__dirname, "..", "public");
const projectRoot = path.join(__dirname, "..");

function readPublic(fileName) {
  return fs.readFileSync(path.join(publicRoot, fileName), "utf8");
}

test("Windows installer uses an ASCII groundcat folder name", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const installer = fs.readFileSync(path.join(projectRoot, "build", "installer.nsh"), "utf8");
  assert.equal(pkg.build.nsis.include, "build/installer.nsh");
  assert.match(installer, /!define APP_FILENAME "groundcat"/);
  assert.match(installer, /\$R8 == "flyingmouse-format"/);
  assert.match(installer, /\$R8 == "走地猫"/);
  assert.match(installer, /StrCpy \$INSTDIR "\$R9\\groundcat"/);
});

test("renderer exposes the essential conversion actions and a result shortcut", () => {
  const html = readPublic("index.html");
  assert.match(html, /id="dropZone"/);
  assert.match(html, /id="targetSelect"/);
  assert.match(html, /id="convertButton"/);
  assert.match(html, /id="openOutputButton"[^>]*hidden/);
  assert.doesNotMatch(html, /id="workflowSteps"|formatTable|trust-list|cat-mascot|sponsorWidget/);
});

test("desktop conversion saves beside the source and reveals the generated file", () => {
  const app = readPublic("app.js");
  assert.match(app, /getSourcePath\?\.\(file\)/);
  assert.match(app, /saveConvertedFileNextToSource/);
  assert.match(app, /result\.savedFilePath = saved\.filePath/);
  assert.match(app, /revealConvertedFile\(filePath\)/);
  assert.match(app, /已保存到源文件目录/);
});

test("renderer keeps the GroundCat brand out of the conversion surface", () => {
  const html = readPublic("index.html");
  assert.match(html, />走地猫</);
  assert.doesNotMatch(html, /mouseMascot|ground-cat-logo\.svg[^>]+class=|sponsorWidget|sponsor-qr/);
});

test("renderer uses the GroundCat SVG only as its favicon", () => {
  const html = readPublic("index.html");
  assert.match(html, /rel="icon"/);
  assert.match(html, /href="\/assets\/ground-cat\/ground-cat-logo\.svg"/);
});

test("minimal visual theme matches the restrained reference language", () => {
  const css = readPublic("styles.css");
  assert.match(css, /--paper:\s*#f2efe7/);
  assert.match(css, /--blue:\s*#3f62ff/);
  assert.match(css, /border-radius:\s*0/);
  assert.doesNotMatch(css, /box-shadow:\s*(?!none)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 480px\)/);
});

test("renderer exposes a bilingual language selector", () => {
  const html = readPublic("index.html");
  assert.match(html, /id="languageSelect"/);
  assert.match(html, /value="zh-CN"/);
  assert.match(html, /value="en-US"/);
  assert.ok(html.indexOf("/i18n.js") < html.indexOf("/app.js"));
});

test("renderer does not inject dynamic HTML", () => {
  const app = readPublic("app.js");
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /\.textContent\s*=/);
});

test("renderer restores and updates target preferences through durable Electron settings", () => {
  const html = readPublic("index.html");
  const app = readPublic("app.js");
  assert.match(html, /conversion-preferences\.js/);
  assert.match(app, /migrateLegacySettings/);
  assert.match(app, /preferredTarget\(state\.settings\.targetBySource/);
  assert.match(app, /logBridge\.updateSettings\(\{\s*targetBySource\s*\}/s);
  assert.doesNotMatch(app, /preferredTarget\(localStorage/);
  assert.doesNotMatch(app, /rememberTarget\(localStorage/);
});

test("renderer keeps diagnostics support off the primary interface", () => {
  const html = readPublic("index.html");
  const app = readPublic("app.js");
  assert.doesNotMatch(html, /id="diagnosticsButton"/);
  assert.match(app, /"diagnostics\.export": "导出诊断"/);
  assert.match(app, /"diagnostics\.export": "Export diagnostics"/);
  assert.match(app, /logBridge\.exportDiagnostics/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /result\?\.errorCode/);
  assert.match(app, /error\.errorCode/);
});

test("PDF to XLSX uses a contextual bilingual smart-table label and warning", () => {
  const html = readPublic("index.html");
  const app = readPublic("app.js");
  assert.match(html, /id="pdfExcelHint"[^>]*hidden/);
  assert.match(app, /Excel（智能表格提取）/);
  assert.match(app, /Excel \(smart table extraction\)/);
  assert.match(app, /适合电子版规则表格；扫描件、复杂表头和合并单元格可能不完整/);
  assert.match(app, /Best for digital PDFs with regular tables/);
  assert.match(app, /targetSelect\.value === "xlsx"[\s\S]*info\.category === "pdf"/);
});

test("video targets expose a codec selector (h264/h265/av1) for mp4/mov/mkv", () => {
  const html = readPublic("index.html");
  const app = readPublic("app.js");
  assert.match(html, /id="videoCodecField"[^>]*hidden/);
  assert.match(html, /id="videoCodec"/);
  assert.match(app, /"videoCodec\.h264"/);
  assert.match(app, /"videoCodec\.h265"/);
  assert.match(app, /"videoCodec\.av1"/);
  assert.match(app, /\["mp4", "mov", "mkv"\]\.includes\(targetSelect\.value\)/);
  assert.match(app, /\["mp4", "mov", "mkv"\]\.includes\(targetFormat\)/);
  assert.match(app, /form\.append\("videoCodec"/);
});

test("update plumbing is retained without adding an interface control", () => {
  const html = readPublic("index.html");
  const app = readPublic("app.js");
  assert.doesNotMatch(html, /id="updateButton"/);
  assert.match(app, /kind === "available" \|\| kind === "downloaded"/);
  assert.match(app, /updateButton\.hidden = false/);
});

test("renderer enforces the advertised 2 GB batch limit and localizes resource errors", () => {
  const app = readPublic("app.js");
  assert.match(app, /maxBatchBytes/);
  assert.match(app, /2 \* 1024 \* 1024 \* 1024/);
  assert.match(app, /result\?\.messages\?\.enUS/);
  assert.match(app, /result\?\.messages\?\.zhCN/);
});

test("renderer shows localized conversion warnings without HTML injection", () => {
  const app = readPublic("app.js");
  assert.match(app, /result\?\.warnings/);
  assert.match(app, /warning\?\.messages\?\.enUS/);
  assert.match(app, /warning\?\.messages\?\.zhCN/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
});

test("renderer labels experimental inputs and the macOS AV3A boundary bilingually", () => {
  const app = readPublic("app.js");
  assert.match(app, /experimentalInputs/);
  assert.match(app, /Experimental\/unverified inputs/);
  assert.match(app, /实验性\/尚未完整验证的输入/);
  assert.match(app, /Standard NCM works on macOS; Audio Vivid AV3A currently requires Windows/);
  assert.match(app, /macOS 支持标准 NCM；Audio Vivid AV3A 目前仅支持 Windows/);
});
