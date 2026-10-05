import path from "node:path";
import { fileURLToPath } from "node:url";

import { attachInstallFrame } from "../../src/feedback/attachCoreAndFrames.js";

const feedbackDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(feedbackDir, "../..");

attachInstallFrame({
  inputPath: feedbackDir,
  outputPath: path.resolve(packageRoot, "src/frame/installFrame"),
});
