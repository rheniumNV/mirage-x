import fs from "node:fs";
import path from "node:path";

import { getAsset, getRecords, pickLatestObject } from "./fetchUtil.js";
import { STAGED_FEEDBACK, STAGED_META } from "./staging.js";

/**
 * Download the latest object in the Resonite folder `link` to
 * `<outputPath>/ResFeedbackOriginal.brson` as it is, with its record in
 * `ResFeedbackMetaOriginal.json`. Nothing is downloaded when that record is
 * already there.
 */
export const fetchFeedback = async (option: {
  link: string;
  outputPath: string;
}): Promise<void> => {
  const feedbackPath = path.resolve(option.outputPath, STAGED_FEEDBACK);
  const metaPath = path.resolve(option.outputPath, STAGED_META);
  const prevInfo = (() => {
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as {
        id?: string;
        creationTime?: string;
      };
    } catch {
      return {};
    }
  })();

  const records = await getRecords(option.link);
  const latestObject = pickLatestObject(records);
  if (!latestObject) {
    console.info("not found feedback");
    return;
  }
  if (latestObject.id === prevInfo.id && fs.existsSync(feedbackPath)) {
    console.info(
      "no new feedback",
      `latestFeedbackTime=${latestObject.creationTime}`,
    );
    return;
  }

  const bytes = await getAsset(latestObject.assetUri);

  fs.mkdirSync(option.outputPath, { recursive: true });
  fs.writeFileSync(feedbackPath, bytes);
  fs.writeFileSync(
    metaPath,
    JSON.stringify({
      id: latestObject.id,
      creationTime: latestObject.creationTime,
    }),
  );
  console.info(
    "updated ",
    `${prevInfo.creationTime ?? "(none)"} --> ${latestObject.creationTime}`,
  );
};
