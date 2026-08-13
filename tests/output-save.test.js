const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const { saveDownloadedNextToSource } = require("../output-save");

test("converted output is written beside its source without overwriting", async (context) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "groundcat-output-save-"));
  context.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const sourcePath = path.join(directory, "营业执照.pdf");
  const occupiedPath = path.join(directory, "营业执照.png");
  await fs.promises.writeFile(sourcePath, "source");
  await fs.promises.writeFile(occupiedPath, "existing");

  const saved = await saveDownloadedNextToSource({
    sourcePath,
    fileName: "营业执照.png",
    downloadUrl: "http://127.0.0.1/downloads/test"
  }, async (_url, destination) => {
    await fs.promises.writeFile(destination, "converted");
  });

  assert.strictEqual(saved.directory, directory);
  assert.strictEqual(saved.filePath, path.join(directory, "营业执照 (1).png"));
  assert.strictEqual(await fs.promises.readFile(saved.filePath, "utf8"), "converted");
  assert.strictEqual(await fs.promises.readFile(occupiedPath, "utf8"), "existing");
});

test("auto-save rejects a missing or non-file source path", async () => {
  await assert.rejects(
    saveDownloadedNextToSource({ sourcePath: "relative.txt", fileName: "out.txt" }, async () => {}),
    /无法读取源文件所在目录/
  );
  await assert.rejects(
    saveDownloadedNextToSource({ sourcePath: os.tmpdir(), fileName: "out.txt" }, async () => {}),
    /源文件路径无效/
  );
});
