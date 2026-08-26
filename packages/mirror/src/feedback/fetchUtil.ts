import axios from "axios";
import { DeCompress } from "brson.js";

export type RecordInfo = {
  id: string;
  path: string;
  name: string;
  recordType: string;
  ownerType: "users" | "groups";
  ownerId: string;
  creationTime: string;
  assetUri: string;
};

export const getRecordInfo = async (
  recordLink: string,
): Promise<RecordInfo> => {
  const [, ownerId, recordId] =
    recordLink.match(/resrec:\/\/\/(.+)\/(.+)/) ?? [];
  if (!ownerId || !recordId) {
    throw new Error("invalid record link");
  }
  const ownerType = ownerId.startsWith("U-") ? "users" : "groups";

  const {
    data: { id, path, name, recordType, creationTime, assetUri },
  } = await axios.get(
    `https://api.resonite.com/${ownerType}/${ownerId}/records/${recordId}`,
  );

  return {
    id,
    path,
    name,
    recordType,
    ownerType,
    ownerId,
    creationTime,
    assetUri,
  };
};

export const getRecords = async (recordUrl: string): Promise<RecordInfo[]> => {
  const { ownerId, ownerType, path, name } = await getRecordInfo(recordUrl);
  const { data } = await axios.get(
    `https://api.resonite.com/${ownerType}/${ownerId}/records?path=${path}\\${name}`,
  );

  return (data as RecordInfo[]).sort((a, b) =>
    a.creationTime.localeCompare(b.creationTime),
  );
};

export const pickLatestObject = (
  records: RecordInfo[],
): RecordInfo | undefined => {
  return records
    .filter((x) => x.recordType === "object")
    .sort((x, y) => x.creationTime.localeCompare(y.creationTime))
    .pop();
};

export const getJson = async (assetUri: string): Promise<string> => {
  const [, assetId] = assetUri.match(/resdb:\/\/\/(.+)\.brson/) ?? [];
  if (!assetId) {
    throw new Error(`invalid asset uri: ${assetUri}`);
  }

  const { data } = await axios.get(`https://assets.resonite.com/${assetId}`, {
    responseType: "arraybuffer",
  });

  return DeCompress(data);
};
