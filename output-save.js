const fs = require("fs");
const path = require("path");

function uniqueDestination(directory, fileName, existsSync = fs.existsSync) {
  const parsed = path.parse(path.basename(fileName || "converted-file"));
  let candidate = path.join(directory, `${parsed.name}${parsed.ext}`);
  let counter = 1;

  while (existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name} (${counter})${parsed.ext}`);
    counter += 1;
  }

  return candidate;
}

async function sourceDirectory(sourcePath, stat = fs.promises.stat) {
  const rawSourcePath = String(sourcePath || "");
  if (!rawSourcePath || !path.isAbsolute(rawSourcePath)) {
    throw new Error("无法读取源文件所在目录。");
  }
  const resolvedSource = path.resolve(rawSourcePath);
  const sourceStat = await stat(resolvedSource);
  if (!sourceStat.isFile()) throw new Error("源文件路径无效。");
  return path.dirname(resolvedSource);
}

async function saveDownloadedNextToSource(payload, downloadToFile) {
  if (typeof downloadToFile !== "function") throw new TypeError("downloadToFile must be a function");
  const directory = await sourceDirectory(payload?.sourcePath);
  const fileName = path.basename(String(payload?.fileName || "converted-file"));
  const destination = uniqueDestination(directory, fileName);
  await downloadToFile(payload?.downloadUrl, destination);
  return { directory, filePath: path.resolve(destination) };
}

module.exports = { saveDownloadedNextToSource, sourceDirectory, uniqueDestination };
