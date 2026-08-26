import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchFeedback } from "@mirage-x/mirror";

const feedbackDir = path.dirname(fileURLToPath(import.meta.url));
const link = process.env.FEEDBACK_LINK;

if (!link) {
  throw new Error(
    "Set FEEDBACK_LINK to a Resonite folder record (resrec:///...).",
  );
}

await fetchFeedback({ link, outputPath: feedbackDir });
