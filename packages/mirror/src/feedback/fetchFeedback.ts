import fs from "node:fs";
import path from "node:path";

import { convertRawFeedback } from "./convertRawFeedback.js";
import { getJson, getRecords, pickLatestObject } from "./fetchUtil.js";

export const fetchFeedback = async (option: {
  link: string;
  outputPath: string;
}): Promise<void> => {
  const metaPath = path.resolve(option.outputPath, "ResFeedbackMetaOriginal.json");
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
  if (latestObject.id === prevInfo.id) {
    console.info(
      "no new feedback",
      `latestFeedbackTime=${latestObject.creationTime}`,
    );
    return;
  }

  const rawJson = await getJson(latestObject.assetUri);
  const json = convertRawFeedback(JSON.parse(rawJson));

  fs.mkdirSync(option.outputPath, { recursive: true });
  fs.writeFileSync(
    path.resolve(option.outputPath, "ResFeedbackOriginal.json"),
    json,
  );
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
