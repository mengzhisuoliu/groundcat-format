const state = {
  files: [],
  sourcePaths: [],
  fileInfos: [],
  capabilities: null,
  converted: null,
  batchResults: [],
  savedFiles: [],
  isConverting: false,
  progressValue: 0,
  settings: { schemaVersion: 2, targetBySource: {} }
};

/* --- 渲染进程日志：转发到主进程 debug.log --- */
const logBridge = window.flyingMouseFormat || {};

function rendererLog(level, message, error) {
  const detail = error ? `${message}\n${error.stack || error.message || error}` : message;
  try {
    if (typeof logBridge.log === "function") {
      logBridge.log(level, detail).catch(() => {});
    } else {
      // 非桌面环境（纯浏览器预览）退化为 console
      if (level === "error") console.error(detail);
      else if (level === "warn") console.warn(detail);
      else console.info(detail);
    }
  } catch {
    // 日志转发失败不应影响功能
  }
}

window.addEventListener("error", (event) => {
  rendererLog("error", `未捕获的渲染进程错误: ${event.message || "unknown"}`, event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  rendererLog("error", "未处理的 Promise 拒绝", event.reason);
});

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const fileStrip = document.querySelector("#fileStrip");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const targetSelect = document.querySelector("#targetSelect");
const pdfExcelHint = document.querySelector("#pdfExcelHint");
const zipCompressionField = document.querySelector("#zipCompressionField");
const zipCompression = document.querySelector("#zipCompression");
const videoCodecField = document.querySelector("#videoCodecField");
const videoCodec = document.querySelector("#videoCodec");
const pdfPasswordField = document.querySelector("#pdfPasswordField");
const pdfPassword = document.querySelector("#pdfPassword");
const pdfActionField = document.querySelector("#pdfActionField");
const pdfAction = document.querySelector("#pdfAction");
const convertButton = document.querySelector("#convertButton");
const clearButton = document.querySelector("#clearButton");
const statusBox = document.querySelector("#statusBox");
const downloadButton = document.querySelector("#downloadButton");
const batchSaveButton = document.querySelector("#batchSaveButton");
const openOutputButton = document.querySelector("#openOutputButton");
const toolHealth = document.querySelector("#toolHealth");
const formatTable = document.querySelector("#formatTable");
const dropHint = document.querySelector("#dropHint");
const batchList = document.querySelector("#batchList");
const progressPanel = document.querySelector("#progressPanel");
const progressLabel = document.querySelector("#progressLabel");
const progressPercent = document.querySelector("#progressPercent");
const progressTrack = document.querySelector(".progress-track");
const progressFill = document.querySelector("#progressFill");
const mouseMascot = document.querySelector("#mouseMascot");
const languageSelect = document.querySelector("#languageSelect");
const diagnosticsButton = document.querySelector("#diagnosticsButton");
const workflowSteps = [...document.querySelectorAll("[data-step]")];
const {
  STORAGE_KEY: LEGACY_TARGET_STORAGE_KEY,
  readPreferences,
  rememberTarget,
  preferredTarget
} = window.FlyingMouseConversionPreferences;
const { LANGUAGE_STORAGE_KEY, createI18n } = window.FlyingMouseI18n;

const messages = {
  "zh-CN": {
    "workspace.aria": "走地猫文件转换工作台", "brand.name": "走地猫", "brand.subtitle": "本地文件格式转换器",
    "brand.eyebrow": "LOCAL FORMAT UTILITY / OFFLINE", "brand.title": "选择文件，指定格式，转换完成。",
    "trust.offline": "本地处理", "trust.batch": "批量队列", "trust.private": "无需上传云端",
    "language.label": "语言", "health.checking": "正在检测转换引擎", "health.failed": "检测失败",
    "diagnostics.export": "导出诊断", "diagnostics.saved": "诊断报告已保存到：{path}",
    "diagnostics.canceled": "已取消导出诊断报告。", "diagnostics.failed": "导出诊断失败：{message}",
    "update.check": "检查更新", "update.checking": "正在检查更新…",
    "update.latest": "已是最新版本", "update.available": "发现新版本 v{version}，正在下载…",
    "update.downloaded": "新版本 v{version} 已下载，重启后生效", "update.restart": "立即重启",
    "update.error": "更新检查失败：{message}", "update.unavailable": "当前版本不支持自动更新",
    "workflow.aria": "转换流程", "workflow.select": "选择文件", "workflow.analyze": "识别格式",
    "workflow.convert": "开始转换", "workflow.save": "保存结果", "upload.aria": "上传文件",
    "upload.title": "选择文件", "upload.hint": "也可以拖到这里",
    "upload.cta": "选择文件",
    "upload.limited": "PDF 表格可以转 Excel；Office/WPS 需要内置 LibreOffice",
    "action.clear": "清空", "action.convert": "开始转换", "action.download": "下载转换后的文件",
    "action.save": "保存", "action.saveAll": "保存全部", "action.reveal": "打开所在文件夹 →", "target.label": "目标格式",
    "target.placeholder": "先选择文件", "target.analyzing": "正在识别", "target.none": "无共同目标格式",
    "pdfExcel.hint": "适合电子版规则表格；扫描件、复杂表头和合并单元格可能不完整。",
    "formats.experimental": "实验性/尚未完整验证的输入：{formats}",
    "formats.av3aMac": "macOS 支持标准 NCM；Audio Vivid AV3A 目前仅支持 Windows。",
    "zip.label": "ZIP 压缩级别（0=不压缩，9=最大）", "zip.0": "0 不压缩（最快）",
    "zip.1": "1 最快", "zip.6": "6 标准（默认）", "zip.9": "9 最大压缩（最慢）",
    "videoCodec.label": "视频编码", "videoCodec.h264": "H.264（兼容性最好，默认）",
    "videoCodec.h265": "H.265（体积更小）", "videoCodec.av1": "AV1（压缩率最高）",
    "pdfPassword.label": "PDF 密码（加密/解密）", "pdfAction.label": "PDF 操作",
    "pdfAction.split": "拆分 PDF（默认）", "pdfAction.encrypt": "加密 PDF", "pdfAction.decrypt": "解密 PDF",
    "settings.aria": "转换设置", "settings.kicker": "OUTPUT", "settings.title": "转换设置",
    "settings.privacy": "文件在本机处理，转换过程无需上传云端。", "progress.label": "转换进度", "status.ready": "",
    "formats.aria": "支持格式", "formats.kicker": "FORMAT MAP", "formats.title": "格式能力",
    "formats.description": "文档转换会尽量保留排版；PDF 可导出页面图片，图片和扫描版 PDF 可 OCR 转 TXT。",
    "mascot.upload": "准备接收文件", "mascot.idle": "格式已经识别", "mascot.analyzing": "正在识别格式",
    "mascot.converting": "正在转换", "mascot.pdfPages": "正在处理 PDF", "mascot.ocr": "正在识别文字",
    "mascot.batch": "正在处理队列", "mascot.success": "转换完成", "mascot.error": "需要检查一下",
    "footer.core": "基于 FlyingMouse Format v0.5.0 核心重构", "footer.license": "MIT License · 转换始终在本机完成"
  },
  "en-US": {
    "workspace.aria": "GroundCat file conversion workspace", "brand.name": "GroundCat", "brand.subtitle": "Local format converter",
    "brand.eyebrow": "LOCAL FORMAT UTILITY / OFFLINE", "brand.title": "Select a file. Choose a format. Convert.",
    "trust.offline": "Local processing", "trust.batch": "Batch queue", "trust.private": "No cloud upload",
    "language.label": "Language", "health.checking": "Checking conversion engines", "health.failed": "Check failed",
    "diagnostics.export": "Export diagnostics", "diagnostics.saved": "Diagnostics saved to: {path}",
    "diagnostics.canceled": "Diagnostics export canceled.", "diagnostics.failed": "Diagnostics export failed: {message}",
    "update.check": "Check for Updates", "update.checking": "Checking for updates…",
    "update.latest": "You are up to date", "update.available": "New version v{version} found, downloading…",
    "update.downloaded": "v{version} downloaded; restart to apply", "update.restart": "Restart now",
    "update.error": "Update check failed: {message}", "update.unavailable": "Auto-update is unavailable in this build",
    "workflow.aria": "Conversion workflow", "workflow.select": "Select files", "workflow.analyze": "Detect format",
    "workflow.convert": "Convert", "workflow.save": "Save results", "upload.aria": "Upload files",
    "upload.title": "Choose files", "upload.hint": "Or drop them here",
    "upload.cta": "Choose files",
    "upload.limited": "PDF tables can be converted to Excel; Office/WPS needs bundled LibreOffice",
    "action.clear": "Clear", "action.convert": "Convert", "action.download": "Download converted file",
    "action.save": "Save", "action.saveAll": "Save all", "action.reveal": "Show in folder →", "target.label": "Target format",
    "target.placeholder": "Select files first", "target.analyzing": "Detecting", "target.none": "No common target format",
    "pdfExcel.hint": "Best for digital PDFs with regular tables. Scans, complex headers, and merged cells may be incomplete.",
    "formats.experimental": "Experimental/unverified inputs: {formats}",
    "formats.av3aMac": "Standard NCM works on macOS; Audio Vivid AV3A currently requires Windows.",
    "zip.label": "ZIP compression level (0=none, 9=maximum)", "zip.0": "0 None (fastest)",
    "zip.1": "1 Fastest", "zip.6": "6 Standard (default)", "zip.9": "9 Maximum (slowest)",
    "videoCodec.label": "Video codec", "videoCodec.h264": "H.264 (best compatibility, default)",
    "videoCodec.h265": "H.265 (smaller size)", "videoCodec.av1": "AV1 (highest compression)",
    "pdfPassword.label": "PDF password (encrypt/decrypt)", "pdfAction.label": "PDF action",
    "pdfAction.split": "Split PDF (default)", "pdfAction.encrypt": "Encrypt PDF", "pdfAction.decrypt": "Decrypt PDF",
    "settings.aria": "Conversion settings", "settings.kicker": "OUTPUT", "settings.title": "Conversion settings",
    "settings.privacy": "Files are processed locally and never uploaded to the cloud.", "progress.label": "Conversion progress", "status.ready": "",
    "formats.aria": "Supported formats", "formats.kicker": "FORMAT MAP", "formats.title": "Format capabilities",
    "formats.description": "Document conversion preserves layout where possible. PDF pages can be exported as images, and images or scanned PDFs can be OCR'd to TXT.",
    "mascot.upload": "Ready for files", "mascot.idle": "Format detected", "mascot.analyzing": "Detecting format",
    "mascot.converting": "Converting", "mascot.pdfPages": "Processing PDF", "mascot.ocr": "Reading text",
    "mascot.batch": "Working through queue", "mascot.success": "Conversion complete", "mascot.error": "Needs attention",
    "footer.core": "Rebuilt on FlyingMouse Format v0.5.0 core", "footer.license": "MIT License · Processing stays local"
  }
};

const i18n = createI18n({ storage: localStorage, systemLanguage: navigator.language, messages });
const t = (key, params) => i18n.t(key, params);

function applyStaticTranslations() {
  document.documentElement.lang = i18n.language;
  document.title = i18n.language === "en-US" ? "GroundCat · Format Converter" : "走地猫 · 格式转换";
  languageSelect.value = i18n.language;
  for (const element of document.querySelectorAll("[data-i18n]")) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll("[data-i18n-aria]")) element.setAttribute("aria-label", t(element.dataset.i18nAria));
  for (const element of document.querySelectorAll("[data-i18n-title]")) element.title = t(element.dataset.i18nTitle);
  for (const element of document.querySelectorAll("[data-i18n-alt]")) element.alt = t(element.dataset.i18nAlt);
}

function setHealthText(text, ok = false) {
  if (!toolHealth) return;
  const dot = document.createElement("span");
  dot.className = "health-dot";
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = text;
  toolHealth.replaceChildren(dot, label);
  toolHealth.classList.toggle("ok", ok);
}

function renderHealth() {
  if (!state.capabilities) return;
  const enabled = i18n.language === "en-US" ? ["Images", "Text", "PDF", "ZIP"] : ["图片", "文本", "PDF", "ZIP"];
  if (state.capabilities.tools.libreoffice) enabled.push("Office/WPS");
  if (state.capabilities.tools.ffmpeg) enabled.push(i18n.language === "en-US" ? "Audio/Video" : "音视频");
  setHealthText(i18n.language === "en-US" ? `${enabled.join(", ")} enabled` : `${enabled.join("、")} 已启用`, true);
  if (!state.capabilities.tools.libreoffice) dropHint.textContent = t("upload.limited");
}

function refreshLanguage() {
  applyStaticTranslations();
  renderHealth();
  if (state.capabilities) renderFormatTable();
  if (!state.files.length) setStatus(t("status.ready"));
  resetProgress();
  renderBatchList();
  syncPdfExcelHint();
  setMouseState(mouseMascot?.dataset.state || "upload");
}

const mouseAssets = {
  idle: "/assets/ground-cat/ground-cat-logo.svg",
  upload: "/assets/ground-cat/ground-cat-logo.svg",
  analyzing: "/assets/ground-cat/ground-cat-logo.svg",
  converting: "/assets/ground-cat/ground-cat-logo.svg",
  pdfPages: "/assets/ground-cat/ground-cat-logo.svg",
  ocr: "/assets/ground-cat/ground-cat-logo.svg",
  batch: "/assets/ground-cat/ground-cat-logo.svg",
  success: "/assets/ground-cat/ground-cat-logo.svg",
  error: "/assets/ground-cat/ground-cat-logo.svg"
};

const labels = {
  image: "图片",
  text: "文本",
  document: "Word/WPS 文档",
  spreadsheet: "Excel/WPS 表格",
  presentation: "PPT/WPS 演示",
  pdf: "PDF",
  audio: "音频",
  video: "视频",
  any: "任意文件",
  unknown: "未知类型"
};

const statusLabels = {
  pending: "等待",
  converting: "转换中",
  success: "完成",
  error: "失败"
};

const englishLabels = {
  image: "Image", text: "Text", document: "Word/WPS document", spreadsheet: "Excel/WPS spreadsheet",
  presentation: "PPT/WPS presentation", pdf: "PDF", audio: "Audio", video: "Video", any: "Any file", unknown: "Unknown type"
};
const englishStatusLabels = { pending: "Waiting", converting: "Converting", success: "Complete", error: "Failed" };
const categoryLabel = (key) => i18n.language === "en-US" ? (englishLabels[key] || englishLabels.unknown) : (labels[key] || labels.unknown);
const batchStatusLabel = (key) => i18n.language === "en-US" ? (englishStatusLabels[key] || "Waiting") : (statusLabels[key] || statusLabels.pending);

function extensionOf(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function setSelectPlaceholder(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.replaceChildren(option);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`.trim();
}

function setMouseState(name) {
  if (!mouseMascot) return;
  mouseMascot.src = mouseAssets[name] || mouseAssets.idle;
  mouseMascot.dataset.state = name;
  const stage = document.querySelector("#catStage");
  const stateBadge = document.querySelector("#mascotState");
  if (stage) stage.dataset.state = name;
  if (stateBadge) stateBadge.textContent = t(`mascot.${name}`);
}

function setWorkflowStep(step) {
  const activeIndex = workflowSteps.findIndex((item) => item.dataset.step === step);
  for (const [index, item] of workflowSteps.entries()) {
    const active = item.dataset.step === step;
    item.classList.toggle("active", active);
    item.classList.toggle("completed", activeIndex > -1 && index < activeIndex);
    if (active) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  }
}

function mouseStateForConversion(targetFormat) {
  if (state.files.length > 1) return "batch";
  if (targetFormat === "txt" && state.fileInfos.some((info) => info.category === "image" || info.category === "pdf")) return "ocr";
  if ((targetFormat === "png" || targetFormat === "jpg") && state.fileInfos.some((info) => info.category === "pdf")) return "pdfPages";
  return "converting";
}

function setProgress(value, label, type = "") {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  state.progressValue = safeValue;
  progressPanel.hidden = false;
  progressPanel.className = `progress-panel ${type}`.trim();
  progressLabel.textContent = label;
  progressPercent.textContent = `${safeValue}%`;
  progressFill.style.width = `${safeValue}%`;
  progressTrack.setAttribute("aria-valuenow", String(safeValue));
}

function resetProgress() {
  state.progressValue = 0;
  progressPanel.hidden = true;
  progressPanel.className = "progress-panel";
  progressLabel.textContent = t("progress.label");
  progressPercent.textContent = "0%";
  progressFill.style.width = "0%";
  progressTrack.setAttribute("aria-valuenow", "0");
}

function resetDownload() {
  state.converted = null;
  state.batchResults = [];
  state.savedFiles = [];
  openOutputButton.hidden = true;
  downloadButton.hidden = true;
  downloadButton.removeAttribute("href");
  downloadButton.removeAttribute("download");
  batchSaveButton.hidden = true;
}

function clearFile() {
  state.files = [];
  state.sourcePaths = [];
  state.fileInfos = [];
  state.isConverting = false;
  fileInput.value = "";
  fileStrip.hidden = true;
  batchList.hidden = true;
  batchList.replaceChildren();
  setSelectPlaceholder(targetSelect, "", t("target.placeholder"));
  syncPdfExcelHint();
  targetSelect.disabled = true;
  convertButton.disabled = true;
  resetDownload();
  resetProgress();
  setMouseState("upload");
  setStatus(t("status.ready"));
  setWorkflowStep("select");
}

async function fetchCapabilities() {
  const response = await fetch("/api/capabilities");
  if (!response.ok) throw new Error(i18n.language === "en-US" ? "Unable to read conversion capabilities." : "无法读取转换能力。");
  state.capabilities = await response.json();

  const enabled = ["图片", "文本", "PDF", "ZIP"];
  if (state.capabilities.tools.libreoffice) enabled.push("Office/WPS");
  if (state.capabilities.tools.ffmpeg) enabled.push("音视频");
  setHealthText(`${enabled.join("、")} 已启用`, true);

  if (!state.capabilities.tools.libreoffice) {
    dropHint.textContent = "PDF 表格可以转 Excel；Office/WPS 需要内置 LibreOffice";
  }

  renderFormatTable();
  renderHealth();
}

function renderFormatTable() {
  if (!formatTable) return;
  const groups = state.capabilities?.groups || {};
  const pairSeparator = i18n.language === "en-US" ? ": " : "：";
  const items = [
    ["image", groups.image],
    ["text", groups.text],
    ["document", groups.document],
    ["spreadsheet", groups.spreadsheet],
    ["presentation", groups.presentation],
    ["pdf", groups.pdf],
    ["audio", groups.audio],
    ["video", groups.video],
    ["any", groups.any]
  ].filter(([, group]) => group);

  const entries = items.map(([key, group]) => {
    const article = document.createElement("article");
    article.className = "format-item";
    article.append(
      createTextElement("h3", "", categoryLabel(key)),
      createTextElement("p", "", `${i18n.language === "en-US" ? "Input" : "输入"}${pairSeparator}${group.inputs.join(", ")}`),
      createTextElement("p", "", `${i18n.language === "en-US" ? "Output" : "输出"}${pairSeparator}${group.targets.join(", ")}`)
    );
    if (Array.isArray(group.experimentalInputs) && group.experimentalInputs.length) {
      article.append(createTextElement("p", "format-note", t("formats.experimental", {
        formats: group.experimentalInputs.join(", ")
      })));
    }
    if (key === "audio" && state.capabilities?.platform?.av3a === false) {
      article.append(createTextElement("p", "format-note", t("formats.av3aMac")));
    }
    return article;
  });
  formatTable.replaceChildren(...entries);
}

async function loadTargets(file) {
  const extension = extensionOf(file.name);
  const response = await fetch("/api/targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extension })
  });

  if (!response.ok) throw new Error("无法判断目标格式。");
  return response.json();
}

function commonTargetsFrom(infos) {
  if (!infos.length) return [];
  const [first, ...rest] = infos;
  const common = new Set(first.targets);
  for (const info of rest) {
    for (const target of [...common]) {
      if (!info.targets.includes(target)) common.delete(target);
    }
  }
  return [...common];
}

function summarizeFiles(files) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length === 1) {
    return {
      name: files[0].name,
      meta: `${formatSize(files[0].size)} · ${files[0].type || (i18n.language === "en-US" ? "Unknown MIME" : "未知 MIME")}`
    };
  }
  return {
    name: i18n.language === "en-US" ? `${files.length} files selected` : `已选择 ${files.length} 个文件`,
    meta: i18n.language === "en-US" ? `${formatSize(totalBytes)} total · Converted one by one` : `总大小 ${formatSize(totalBytes)} · 将按队列逐个转换`
  };
}

function renderBatchList() {
  if (state.files.length <= 1) {
    batchList.hidden = true;
    batchList.replaceChildren();
    return;
  }

  batchList.hidden = false;
  const entries = state.files.map((file, index) => {
    const result = state.batchResults[index] || { status: "pending", detail: "等待转换" };
    const article = document.createElement("article");
    article.className = `batch-item ${result.status}`;

    const main = document.createElement("div");
    main.className = "batch-main";
    main.append(
      createTextElement("p", "batch-name", file.name),
      createTextElement("p", "batch-detail", result.detail || batchStatusLabel(result.status))
    );

    const actions = document.createElement("div");
    actions.className = "batch-actions";
    if (canReorderImages()) {
      const upButton = createTextElement("button", "mini-button", i18n.language === "en-US" ? "↑" : "↑");
      upButton.type = "button";
      upButton.dataset.move = String(index);
      upButton.dataset.direction = "up";
      upButton.disabled = index === 0;
      upButton.title = i18n.language === "en-US" ? "Move up (earlier in PDF)" : "上移（在 PDF 中更靠前）";
      const downButton = createTextElement("button", "mini-button", "↓");
      downButton.type = "button";
      downButton.dataset.move = String(index);
      downButton.dataset.direction = "down";
      downButton.disabled = index === state.files.length - 1;
      downButton.title = i18n.language === "en-US" ? "Move down (later in PDF)" : "下移（在 PDF 中更靠后）";
      actions.append(upButton, downButton);
    }
    actions.append(createTextElement("span", "batch-status", batchStatusLabel(result.status)));
    if (result.status === "success" && result.result && !result.result.savedFilePath) {
      const saveButton = createTextElement("button", "mini-button", t("action.save"));
      saveButton.type = "button";
      saveButton.dataset.saveIndex = String(index);
      actions.append(saveButton);
    }

    article.append(main, actions);
    return article;
  });
  batchList.replaceChildren(...entries);
}

// 多张图片合并 PDF 时允许调整顺序（PDF 页序 = 队列顺序）
function canReorderImages() {
  return isMergedImagePdfConversion(targetSelect.value)
    && !state.isConverting
    && state.batchResults.every((result) => result.status !== "success");
}

function moveFileInQueue(index, direction) {
  if (!canReorderImages()) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= state.files.length) return;
  const swap = (array) => {
    const tmp = array[index];
    array[index] = array[target];
    array[target] = tmp;
  };
  swap(state.files);
  swap(state.sourcePaths);
  swap(state.fileInfos);
  swap(state.batchResults);
  renderBatchList();
}

function setBatchResult(index, patch) {
  state.batchResults[index] = {
    ...(state.batchResults[index] || { status: "pending", detail: "等待转换" }),
    ...patch
  };
  renderBatchList();
}

function syncZipCompressionField() {
  if (!zipCompressionField || !zipCompression) return;
  zipCompressionField.hidden = targetSelect.value !== "zip";
}

function syncVideoCodecField() {
  if (!videoCodecField || !videoCodec) return;
  videoCodecField.hidden = !["mp4", "mov", "mkv"].includes(targetSelect.value);
}

function syncPdfActionFields() {
  if (!pdfPasswordField || !pdfActionField) return;
  const isPdfToPdf = targetSelect.value === "pdf"
    && state.fileInfos.length === state.files.length
    && state.fileInfos.every((info) => info.category === "pdf");
  pdfPasswordField.hidden = !isPdfToPdf;
  pdfActionField.hidden = !isPdfToPdf;
}

function syncPdfExcelHint() {
  if (!pdfExcelHint) return;
  pdfExcelHint.hidden = !(targetSelect.value === "xlsx"
    && state.fileInfos.length > 0
    && state.fileInfos.every((info) => info.category === "pdf"));
}

async function acceptFiles(fileList) {
  const files = [...fileList].filter((file) => file && file.size >= 0);
  if (!files.length) return;
  const maxBatchBytes = state.capabilities?.limits?.maxBatchBytes || (2 * 1024 * 1024 * 1024);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (!Number.isSafeInteger(totalBytes) || totalBytes > maxBatchBytes) {
    setStatus(i18n.language === "en-US"
      ? "This batch exceeds the 2 GB limit. Convert the files in smaller batches."
      : "本批文件总大小超过 2GB，请分批转换。", "error");
    setMouseState("error");
    fileInput.value = "";
    return;
  }

  state.files = files;
  state.sourcePaths = files.map((file) => {
    try {
      return window.flyingMouseFormat?.getSourcePath?.(file) || "";
    } catch {
      return "";
    }
  });
  state.fileInfos = [];
  state.batchResults = files.map(() => ({ status: "pending", detail: "等待转换" }));
  resetDownload();
  resetProgress();
  setMouseState(files.length > 1 ? "batch" : "analyzing");
  setWorkflowStep("analyze");

  const summary = summarizeFiles(files);
  fileName.textContent = summary.name;
  fileMeta.textContent = summary.meta;
  fileStrip.hidden = false;
  renderBatchList();

  targetSelect.disabled = true;
  convertButton.disabled = true;
  setSelectPlaceholder(targetSelect, "", t("target.analyzing"));
  setStatus(i18n.language === "en-US"
    ? (files.length === 1 ? "Analyzing the file and available target formats..." : `Finding common targets for ${files.length} files...`)
    : (files.length === 1 ? "正在分析文件类型和可用转换格式..." : `正在分析 ${files.length} 个文件的共同转换格式...`));

  try {
    const infos = await Promise.all(files.map(loadTargets));
    state.fileInfos = infos;
    const targets = commonTargetsFrom(infos);
    targetSelect.replaceChildren();

    if (!targets.length) {
      setSelectPlaceholder(targetSelect, "", t("target.none"));
      setStatus(files.length === 1
        ? (i18n.language === "en-US" ? "No target format is available for this file." : "这个文件当前没有可用转换格式。")
        : (i18n.language === "en-US" ? "These files have no common target format. Batch files of the same type or select fewer files." : "这些文件没有共同的目标格式。请分成同类型文件批量转换，或减少选择的文件。"),
      "error");
      syncZipCompressionField();
      syncVideoCodecField();
      syncPdfActionFields();
      setMouseState("error");
      return;
    }

    for (const target of targets) {
      const option = document.createElement("option");
      option.value = target;
      let label = target.toUpperCase();
      if (target === "pdf" && state.fileInfos.every((info) => info.category === "pdf")) {
        label = state.files.length > 1
          ? (i18n.language === "en-US" ? "PDF (merge)" : "PDF（合并）")
          : (i18n.language === "en-US" ? "PDF (split into pages)" : "PDF（拆分为单页）");
      }
      if (target === "xlsx" && state.fileInfos.every((info) => info.category === "pdf")) {
        label = i18n.language === "en-US" ? "Excel (smart table extraction)" : "Excel（智能表格提取）";
      }
      option.textContent = label;
      targetSelect.append(option);
    }

    const rememberedTarget = preferredTarget(state.settings.targetBySource, files.map((file) => extensionOf(file.name)), targets);
    if (rememberedTarget) targetSelect.value = rememberedTarget;

    targetSelect.disabled = false;
    convertButton.disabled = false;
    syncZipCompressionField();
    syncVideoCodecField();
    syncPdfActionFields();
    syncPdfExcelHint();
    setMouseState(files.length > 1 ? "batch" : "idle");
    setStatus("");
    setWorkflowStep("convert");
  } catch (error) {
    setStatus(i18n.language === "en-US" ? `Detection failed: ${error.message}` : `识别失败：${error.message}`, "error");
    setWorkflowStep("analyze");
    setMouseState("error");
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function responseErrorMessage(result, status) {
  const localized = i18n.language === "en-US" ? result?.messages?.enUS : result?.messages?.zhCN;
  return localized || result?.error || (i18n.language === "en-US" ? `Server returned ${status}` : `服务器返回 ${status}`);
}

function responseError(result, status) {
  const errorCode = result?.errorCode ? String(result.errorCode) : "";
  const message = responseErrorMessage(result, status);
  const error = new Error(errorCode ? `${message} [${errorCode}]` : message);
  error.errorCode = errorCode;
  return error;
}

function localizedWarnings(result) {
  return (Array.isArray(result?.warnings) ? result.warnings : []).map((warning) => {
    const localized = i18n.language === "en-US" ? warning?.messages?.enUS : warning?.messages?.zhCN;
    return localized || warning?.code || "";
  }).filter(Boolean);
}

async function convertOneFile(file, targetFormat) {
  const form = new FormData();
  form.append("file", file);
  form.append("targetFormat", targetFormat);
  if (targetFormat === "zip") {
    form.append("compressionLevel", zipCompression?.value || "6");
  }
  if (["mp4", "mov", "mkv"].includes(targetFormat)) {
    form.append("videoCodec", videoCodec?.value || "h264");
  }
  if (targetFormat === "pdf" && state.fileInfos.every((info) => info.category === "pdf")) {
    form.append("pdfAction", pdfAction?.value || "");
    if (pdfPassword?.value) form.append("password", pdfPassword.value);
  }

  const response = await fetch("/api/convert", {
    method: "POST",
    body: form
  });
  const result = await parseResponse(response);

  if (!response.ok) {
    throw responseError(result, response.status);
  }
  return result;
}

function isMergedImagePdfConversion(targetFormat) {
  return targetFormat === "pdf"
    && state.files.length > 1
    && state.fileInfos.length === state.files.length
    && state.fileInfos.every((info) => info.category === "image");
}

async function convertImagesToPdf(files) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch("/api/convert-images-to-pdf", {
    method: "POST",
    body: form
  });
  const result = await parseResponse(response);

  if (!response.ok) {
    throw responseError(result, response.status);
  }
  return result;
}

async function saveNextToSource(result, sourcePath) {
  if (!result || !sourcePath || !window.flyingMouseFormat?.saveConvertedFileNextToSource) return null;
  const saved = await window.flyingMouseFormat.saveConvertedFileNextToSource({
    sourcePath,
    downloadUrl: result.downloadUrl,
    fileName: result.fileName
  });
  if (!saved?.filePath) throw new Error(i18n.language === "en-US" ? "The converted file was not saved." : "转换后的文件未能保存。");
  result.savedFilePath = saved.filePath;
  state.savedFiles.push(saved.filePath);
  openOutputButton.hidden = false;
  return saved;
}

function showResultAction(result) {
  if (result?.savedFilePath) {
    openOutputButton.hidden = false;
    downloadButton.hidden = true;
    return;
  }
  if (!result) return;
  downloadButton.href = result.downloadUrl;
  downloadButton.download = result.fileName;
  downloadButton.textContent = `${t("action.save")} ${result.fileName}`;
  downloadButton.hidden = false;
}

async function convertMergedImagesToPdf() {
  state.files.forEach((_file, index) => {
    setBatchResult(index, { status: "converting", detail: "正在合并到 PDF" });
  });
  setProgress(35, "正在合并图片");

  try {
    const result = await convertImagesToPdf(state.files);
    const saved = await saveNextToSource(result, state.sourcePaths[0]);
    state.batchResults = state.files.map((_file, index) => ({
      status: "success",
      detail: index === 0 ? result.fileName : `已合并到 ${result.fileName}`,
      result: index === 0 ? result : null
    }));
    renderBatchList();
    state.converted = result;
    showResultAction(result);
    batchSaveButton.hidden = true;
    setProgress(100, i18n.language === "en-US" ? "Merge complete" : "合并完成", "success");
    setStatus(saved
      ? (i18n.language === "en-US" ? `Saved next to the source: ${saved.filePath}` : `已保存到源文件目录：${saved.filePath}`)
      : (i18n.language === "en-US" ? `Images merged into ${result.fileName}.` : `图片已合并为：${result.fileName}。`), "success");
    setMouseState("success");
    setWorkflowStep("save");
  } catch (error) {
    state.batchResults = state.files.map(() => ({
      status: "error",
      detail: error.message || "合并 PDF 失败"
    }));
    renderBatchList();
    setProgress(100, i18n.language === "en-US" ? "Merge failed" : "合并失败", "error");
    setStatus(i18n.language === "en-US" ? `PDF merge failed: ${error.message || "Unknown error"}` : `合并 PDF 失败：${error.message || "未知错误"}`, "error");
    setMouseState("error");
  } finally {
    state.isConverting = false;
    convertButton.disabled = !state.files.length;
    targetSelect.disabled = !state.files.length;
  }
}

function isMergedPdfConversion(targetFormat) {
  return targetFormat === "pdf"
    && state.files.length > 1
    && state.fileInfos.length === state.files.length
    && state.fileInfos.every((info) => info.category === "pdf");
}

function isSplitPdfConversion(targetFormat) {
  return targetFormat === "pdf"
    && state.files.length === 1
    && state.fileInfos.length === 1
    && state.fileInfos[0].category === "pdf";
}

async function convertPdfsToMerged(files) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch("/api/merge-pdfs", {
    method: "POST",
    body: form
  });
  const result = await parseResponse(response);

  if (!response.ok) {
    throw responseError(result, response.status);
  }
  return result;
}

async function convertMergedPdfs() {
  state.files.forEach((_file, index) => {
    setBatchResult(index, { status: "converting", detail: "正在合并到 PDF" });
  });
  setProgress(35, "正在合并 PDF");

  try {
    const result = await convertPdfsToMerged(state.files);
    const saved = await saveNextToSource(result, state.sourcePaths[0]);
    state.batchResults = state.files.map((_file, index) => ({
      status: "success",
      detail: index === 0 ? result.fileName : `已合并到 ${result.fileName}`,
      result: index === 0 ? result : null
    }));
    renderBatchList();
    state.converted = result;
    showResultAction(result);
    batchSaveButton.hidden = true;
    setProgress(100, i18n.language === "en-US" ? "Merge complete" : "合并完成", "success");
    setStatus(saved
      ? (i18n.language === "en-US" ? `Saved next to the source: ${saved.filePath}` : `已保存到源文件目录：${saved.filePath}`)
      : (i18n.language === "en-US" ? `PDF files merged into ${result.fileName}.` : `PDF 已合并为：${result.fileName}。`), "success");
    setMouseState("success");
    setWorkflowStep("save");
  } catch (error) {
    state.batchResults = state.files.map(() => ({
      status: "error",
      detail: error.message || "合并 PDF 失败"
    }));
    renderBatchList();
    setProgress(100, i18n.language === "en-US" ? "Merge failed" : "合并失败", "error");
    setStatus(i18n.language === "en-US" ? `PDF merge failed: ${error.message || "Unknown error"}` : `合并 PDF 失败：${error.message || "未知错误"}`, "error");
    setMouseState("error");
  } finally {
    state.isConverting = false;
    convertButton.disabled = !state.files.length;
    targetSelect.disabled = !state.files.length;
  }
}

async function convertCurrentFiles() {
  if (!state.files.length || !targetSelect.value || state.isConverting) return;

  const targetFormat = targetSelect.value;
  state.isConverting = true;
  convertButton.disabled = true;
  targetSelect.disabled = true;
  resetDownload();
  state.batchResults = state.files.map(() => ({ status: "pending", detail: "等待转换" }));
  renderBatchList();
  setMouseState(mouseStateForConversion(targetFormat));
  setProgress(0, i18n.language === "en-US" ? "Preparing conversion" : "准备转换");
  setWorkflowStep("convert");
  setStatus(i18n.language === "en-US"
    ? (state.files.length === 1 ? "Converting. PDF, Office/WPS, or video files may take longer..." : `Converting ${state.files.length} files...`)
    : (state.files.length === 1 ? "正在转换，请稍等。PDF、Office/WPS 或视频文件可能需要更久..." : `正在批量转换 ${state.files.length} 个文件，请稍等...`));

  if (isMergedImagePdfConversion(targetFormat)) {
    await convertMergedImagesToPdf();
    return;
  }

  if (isMergedPdfConversion(targetFormat)) {
    await convertMergedPdfs();
    return;
  }

  if (isSplitPdfConversion(targetFormat)) {
    setStatus(i18n.language === "en-US" ? "Splitting the PDF into individual pages..." : "正在把 PDF 拆分为单页文件...");
  }

  let successCount = 0;
  let failCount = 0;

  for (let index = 0; index < state.files.length; index += 1) {
    const file = state.files[index];
    setBatchResult(index, { status: "converting", detail: i18n.language === "en-US" ? `Converting to ${targetFormat.toUpperCase()}` : `正在转换为 ${targetFormat.toUpperCase()}` });
    setProgress((index / state.files.length) * 100, i18n.language === "en-US" ? `Converting ${index + 1}/${state.files.length}` : `正在转换 ${index + 1}/${state.files.length}`);

    try {
      const result = await convertOneFile(file, targetFormat);
      const saved = await saveNextToSource(result, state.sourcePaths[index]);
      successCount += 1;
      let detail = saved
        ? (i18n.language === "en-US" ? `Saved: ${result.fileName}` : `已保存：${result.fileName}`)
        : result.fileName;
      if (targetFormat === "zip" && result.compressionRatio != null) {
        detail += `（${formatSize(result.originalBytes || 0)} → ${formatSize(result.compressedBytes || 0)}，压缩 ${result.compressionRatio}%）`;
      }
      const warnings = localizedWarnings(result);
      if (warnings.length) detail += ` — ${warnings.join("；")}`;
      setBatchResult(index, { status: "success", detail, result });
    } catch (error) {
      failCount += 1;
      rendererLog("warn", `转换失败: "${file.name || "未知文件"}" -> ${targetFormat}: ${error.message || error}`);
      setBatchResult(index, { status: "error", detail: error.message || (i18n.language === "en-US" ? "Unknown error" : "未知错误") });
    }
  }

  const completed = successCount + failCount;
  const type = failCount ? (successCount ? "" : "error") : "success";
  setProgress(100, i18n.language === "en-US"
    ? (failCount ? `Completed ${completed}/${state.files.length}; ${failCount} failed` : "Conversion complete")
    : (failCount ? `完成 ${completed}/${state.files.length}，失败 ${failCount} 个` : "转换完成"), type);

  state.batchResults = [...state.batchResults];
  const successful = state.batchResults.filter((item) => item.status === "success" && item.result);
  state.converted = successful.length === 1 ? successful[0].result : null;

  if (successful.length === 1) {
    showResultAction(successful[0].result);
  } else if (state.savedFiles.length) {
    openOutputButton.hidden = false;
  }

  batchSaveButton.hidden = state.savedFiles.length > 0 || successful.length < 2;
  setMouseState(failCount ? "error" : "success");
  if (successful.length) {
    setWorkflowStep("save");
  }
  const singleFile = state.files.length === 1;
  const singleSavedPath = successful[0]?.result?.savedFilePath || "";
  setStatus(i18n.language === "en-US"
    ? (singleFile
      ? (failCount ? `Conversion failed: ${state.batchResults[0]?.detail || "Unknown error"}` : (singleSavedPath ? `Saved next to the source: ${singleSavedPath}` : `Conversion complete: ${successful[0]?.result?.fileName || state.files[0].name}`))
      : (failCount ? `Batch complete: ${successCount} succeeded, ${failCount} failed. Details appear beside each file.` : (state.savedFiles.length ? `Converted files were saved next to their source files.` : `Batch complete: ${successCount} succeeded.`)))
    : (singleFile
      ? (failCount ? `转换失败：${state.batchResults[0]?.detail || "未知错误"}` : (singleSavedPath ? `已保存到源文件目录：${singleSavedPath}` : `转换完成：${successful[0]?.result?.fileName || state.files[0].name}`))
      : (failCount ? `批量转换完成：成功 ${successCount} 个，失败 ${failCount} 个。失败原因已显示在对应文件旁边。` : (state.savedFiles.length ? `转换完成，结果已分别保存到各自源文件目录。` : `批量转换完成：成功 ${successCount} 个。`))),
  failCount ? (successCount ? "" : "error") : "success");

  state.isConverting = false;
  convertButton.disabled = !state.files.length;
  targetSelect.disabled = !state.files.length;
}

async function saveResult(result) {
  if (!result) return;

  if (window.flyingMouseFormat?.saveConvertedFile) {
    setStatus(i18n.language === "en-US" ? `Choose where to save ${result.fileName}...` : `请选择 ${result.fileName} 的保存位置...`);
    const saved = await window.flyingMouseFormat.saveConvertedFile({
      downloadUrl: result.downloadUrl,
      fileName: result.fileName
    });
    if (saved?.canceled) {
      setStatus(i18n.language === "en-US" ? `Converted: ${result.fileName}. Not saved yet.` : `转换完成：${result.fileName}。尚未保存。`, "success");
      return;
    }
    setStatus(i18n.language === "en-US" ? `Saved to: ${saved.filePath}` : `已保存到：${saved.filePath}`, "success");
    return;
  }

  const link = document.createElement("a");
  link.href = result.downloadUrl;
  link.download = result.fileName;
  link.click();
}

async function saveConvertedFile(event) {
  if (!state.converted) return;
  event.preventDefault();

  try {
    await saveResult(state.converted);
  } catch (error) {
    setStatus(i18n.language === "en-US" ? `Save failed: ${error.message || "Unknown error"}` : `保存失败：${error.message || "未知错误"}`, "error");
  }
}

async function saveAllConvertedFiles() {
  const results = state.batchResults
    .filter((item) => item.status === "success" && item.result)
    .map((item) => item.result);
  if (!results.length) return;

  try {
    if (window.flyingMouseFormat?.saveConvertedFiles) {
      setStatus(i18n.language === "en-US" ? `Choose a folder for ${results.length} files...` : `请选择 ${results.length} 个文件的保存文件夹...`);
      const saved = await window.flyingMouseFormat.saveConvertedFiles({ files: results });
      if (saved?.canceled) {
        setStatus(i18n.language === "en-US" ? `${results.length} files converted. Not saved yet.` : `已转换 ${results.length} 个文件，尚未保存。`, "success");
        return;
      }
      setStatus(i18n.language === "en-US" ? `Saved ${saved.savedCount} files to: ${saved.directory}` : `已保存 ${saved.savedCount} 个文件到：${saved.directory}`, "success");
      return;
    }

    for (const result of results) {
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = result.fileName;
      link.click();
    }
  } catch (error) {
    setStatus(i18n.language === "en-US" ? `Save all failed: ${error.message || "Unknown error"}` : `保存全部失败：${error.message || "未知错误"}`, "error");
  }
}

async function revealSavedOutput() {
  const filePath = state.savedFiles[0];
  if (!filePath || !window.flyingMouseFormat?.revealConvertedFile) return;
  try {
    await window.flyingMouseFormat.revealConvertedFile(filePath);
  } catch (error) {
    setStatus(i18n.language === "en-US"
      ? `Unable to open the result folder: ${error.message || "Unknown error"}`
      : `无法打开结果所在文件夹：${error.message || "未知错误"}`, "error");
  }
}

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
  setMouseState("upload");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
  setMouseState(state.files.length > 1 ? "batch" : state.files.length ? "idle" : "upload");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  acceptFiles(event.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  acceptFiles(fileInput.files);
});

batchList.addEventListener("click", async (event) => {
  const moveButton = event.target.closest("[data-move]");
  if (moveButton) {
    moveFileInQueue(Number(moveButton.dataset.move), moveButton.dataset.direction);
    return;
  }
  const button = event.target.closest("[data-save-index]");
  if (!button) return;
  const index = Number(button.dataset.saveIndex);
  const result = state.batchResults[index]?.result;
  try {
    await saveResult(result);
  } catch (error) {
    setStatus(`保存失败：${error.message || "未知错误"}`, "error");
  }
});

clearButton.addEventListener("click", clearFile);
convertButton.addEventListener("click", convertCurrentFiles);
languageSelect.addEventListener("change", async () => {
  i18n.setLanguage(languageSelect.value, { persist: false });
  if (typeof logBridge.updateSettings === "function") {
    state.settings = await logBridge.updateSettings({ language: i18n.language });
  }
  refreshLanguage();
});
targetSelect.addEventListener("change", async () => {
  syncZipCompressionField();
  syncVideoCodecField();
  syncPdfActionFields();
  syncPdfExcelHint();
  renderBatchList();
  const targetBySource = rememberTarget(
    state.settings.targetBySource,
    state.files.map((file) => extensionOf(file.name)),
    targetSelect.value
  );
  if (typeof logBridge.updateSettings === "function") {
    state.settings = await logBridge.updateSettings({ targetBySource });
  } else {
    state.settings.targetBySource = targetBySource;
  }
});
downloadButton.addEventListener("click", saveConvertedFile);
batchSaveButton.addEventListener("click", saveAllConvertedFiles);
openOutputButton.addEventListener("click", revealSavedOutput);
diagnosticsButton?.addEventListener("click", async () => {
  if (typeof logBridge.exportDiagnostics !== "function") return;
  diagnosticsButton.disabled = true;
  try {
    const result = await logBridge.exportDiagnostics();
    setStatus(result?.canceled
      ? t("diagnostics.canceled")
      : t("diagnostics.saved", { path: result.filePath }), result?.canceled ? "" : "success");
  } catch (error) {
    setStatus(t("diagnostics.failed", { message: error.message || "unknown" }), "error");
    rendererLog("error", "导出诊断失败", error);
  } finally {
    diagnosticsButton.disabled = false;
  }
});

async function initializeDurableSettings() {
  const legacy = {
    targetBySource: readPreferences(localStorage),
    language: (() => {
      try { return localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch { return null; }
    })()
  };
  if (typeof logBridge.migrateLegacySettings === "function") {
    state.settings = await logBridge.migrateLegacySettings(legacy);
    try {
      localStorage.removeItem(LEGACY_TARGET_STORAGE_KEY);
      localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // A blocked origin store must not prevent startup after main settings load.
    }
  } else if (typeof logBridge.getSettings === "function") {
    state.settings = await logBridge.getSettings();
  } else {
    state.settings.targetBySource = legacy.targetBySource;
  }
  i18n.setLanguage(state.settings.language || navigator.language, { persist: false });
}

async function initializeApp() {
  await initializeDurableSettings();
  applyStaticTranslations();
  setMouseState("upload");
  setWorkflowStep("select");
  await fetchCapabilities();
  initializeUpdateWidget();
}

// ---- 版本号与自动更新状态（NSIS 版；开发/商店版静默降级）----
const appVersionEl = document.querySelector("#appVersion");
const updateButton = document.querySelector("#updateButton");
const updateStatusEl = document.querySelector("#updateStatus");

function renderUpdateStatus(status) {
  if (!updateButton || !updateStatusEl) return;
  const kind = status?.status;
  const version = status?.version || "";
  const message = status?.message || "unknown";
  let text = "";
  let tone = "";
  if (kind === "checking") text = t("update.checking");
  else if (kind === "upToDate") { text = t("update.latest"); tone = "ok"; }
  else if (kind === "available") text = t("update.available", { version });
  else if (kind === "downloaded") { text = t("update.downloaded", { version }); tone = "ok"; }
  else if (kind === "error") { text = t("update.error", { message }); tone = "error"; }
  else if (kind === "unavailable") text = t("update.unavailable");

  // 检测到新版本才亮出「检查更新」入口（默认隐藏，不打扰用户）。
  if (kind === "available" || kind === "downloaded") {
    updateButton.hidden = false;
  }

  // 状态文本：有新版本或手动检查中时显示；无更新/出错静默。
  const showStatus = kind === "available" || kind === "downloaded" || kind === "checking";
  if (!text || !showStatus) {
    updateStatusEl.hidden = true;
    return;
  }
  updateStatusEl.textContent = text;
  updateStatusEl.hidden = false;
  updateStatusEl.classList.toggle("update-error", tone === "error");
  updateStatusEl.classList.toggle("update-ok", tone === "ok");
}

function initializeUpdateWidget() {
  if (!updateButton || !updateStatusEl) {
    if (window.flyingMouseFormat && appVersionEl) {
      window.flyingMouseFormat.getAppVersion()
        .then((version) => { if (version) appVersionEl.textContent = `v${version}`; })
        .catch(() => {});
    }
    return;
  }
  if (!window.flyingMouseFormat) {
    updateButton.hidden = true;
    return;
  }
  window.flyingMouseFormat.getAppVersion()
    .then((version) => {
      if (version) appVersionEl.textContent = `v${version}`;
    })
    .catch(() => {});
  window.flyingMouseFormat.onUpdateStatus((status) => renderUpdateStatus(status));
  updateButton.addEventListener("click", async () => {
    updateButton.disabled = true;
    renderUpdateStatus({ status: "checking" });
    try {
      const result = await window.flyingMouseFormat.checkForUpdates();
      renderUpdateStatus(result);
    } catch (error) {
      renderUpdateStatus({ status: "error", message: String(error?.message || "") });
    } finally {
      updateButton.disabled = false;
    }
  });
}

initializeApp().catch((error) => {
  setMouseState("error");
  setHealthText(t("health.failed"), false);
  setStatus(error.message, "error");
  rendererLog("error", "能力检测失败", error);
});
