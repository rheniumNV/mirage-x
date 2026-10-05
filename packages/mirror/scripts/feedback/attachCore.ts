import path from "node:path";
import { fileURLToPath } from "node:url";

import { attachCore } from "../../src/feedback/attachCoreAndFrames.js";

const feedbackDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(feedbackDir, "../..");

attachCore({
  inputPath: feedbackDir,
  outputPath: path.resolve(packageRoot, "assets/core"),
});
