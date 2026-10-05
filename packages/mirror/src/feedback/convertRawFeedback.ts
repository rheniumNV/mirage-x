import { randomUUID } from "node:crypto";

type Obj =
  | {
      [key: string]: Obj;
    }
  | Obj[]
  | string
  | number
  | boolean
  | null;

const replaceObj = (obj: Obj, path: string[], newValue: Obj): Obj => {
  if (!path[0]) {
    return newValue;
  }
  const [first, ...rest] = path;
  if (typeof obj === "object" && obj != null) {
    if (Array.isArray(obj)) {
      const index = parseInt(first, 10);
      if (Number.isNaN(index)) {
        throw new Error(`invalid index: ${first}`);
      }
      const newArray = [...obj];
      if (newArray[index]) {
        newArray[index] = replaceObj(newArray[index], rest, newValue);
      }
      return newArray;
    } else {
      if (!obj[first]) {
        return obj;
      }
      return {
        ...obj,
        [first]: replaceObj(obj[first], rest, newValue),
      };
    }
  } else {
    throw new Error(`invalid path: ${path.join(".")}`);
  }
};

const EMPTY = "";

const isDebugUrl = (url: string) =>
  url.includes("http://") || url.includes("ws://");

const convertLocalId = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "Type" in value &&
    typeof value["Type"] === "string" &&
    "Data" in value &&
    value["Data"]
  ) {
    const componentType = value["Type"];
    const valueData = value["Data"] as {
      [key: string]: { ID: string; Data: unknown };
    };
    if (
      componentType.startsWith("FrooxEngine.DynamicValueVariable`") &&
      "VariableName" in valueData
    ) {
      const variableName = valueData["VariableName"]?.["Data"];
      if (variableName === "Static.Web.Host") {
        return replaceObj(value as Obj, ["Data", "Value", "Data"], EMPTY);
      }
      if (variableName === "Static.Web.Url.Ws") {
        return replaceObj(value as Obj, ["Data", "Value", "Data"], EMPTY);
      }
      if (variableName === "Env.Host.Fallback") {
        return replaceObj(value as Obj, ["Data", "Value", "Data"], EMPTY);
      }
      if (variableName === "Static.Web.Url.Http") {
        return replaceObj(value as Obj, ["Data", "Value", "Data"], EMPTY);
      }
    }
    if (componentType.startsWith("FrooxEngine.CloudValueVariable`")) {
      const variableName = valueData["VariableName"]?.["Data"];
      if (variableName === "Env.Host.Fallback") {
        return replaceObj(value as Obj, ["Data", "Value", "Data"], EMPTY);
      }
    }
    if (componentType.startsWith("FrooxEngine.CloudValueVariableDriver`")) {
      const fallbackValue = valueData["FallbackValue"]?.["Data"];
      if (typeof fallbackValue === "string" && isDebugUrl(fallbackValue)) {
        return replaceObj(
          value as Obj,
          ["Data", "FallbackValue", "Data"],
          EMPTY,
        );
      }
    }
    if (componentType.startsWith("FrooxEngine.StaticBinary")) {
      const url = valueData["URL"]?.["Data"];
      if (typeof url === "string" && isDebugUrl(url)) {
        return replaceObj(value as Obj, ["Data", "URL", "Data"], EMPTY);
      }
    }
    if (componentType.startsWith("FrooxEngine.WebsocketClient")) {
      const url = valueData["URL"]?.["Data"];
      if (typeof url === "string" && isDebugUrl(url)) {
        return replaceObj(
          replaceObj(value as Obj, ["Data", "URL", "Data"], EMPTY),
          ["Data", "IsConnected", "Data"],
          false,
        );
      }
    }
  }
  return value;
};

const convertRandomId = (map: Map<string, string>) => (value: unknown) => {
  if (
    typeof value === "string" &&
    value.match(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/)
  ) {
    if (!map.has(value)) {
      map.set(value, randomUUID());
    }
    return map.get(value);
  }
  return value;
};

export const convertRawFeedback = (rawFeedback: unknown): string => {
  const map = new Map<string, string>();
  return JSON.stringify(rawFeedback, (_key, value: unknown) =>
    convertLocalId(convertRandomId(map)(value)),
  );
};
