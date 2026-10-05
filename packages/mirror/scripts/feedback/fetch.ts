import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchFeedback } from "../../src/feedback/fetchFeedback.js";

const feedbackDir = path.dirname(fileURLToPath(import.meta.url));
const link = process.env.FEEDBACK_LINK;

if (!link) {
  throw new Error(
    "Set FEEDBACK_LINK in packages/mirror/.env (resrec:///... folder link).",
  );
}

await fetchFeedback({ link, outputPath: feedbackDir });
