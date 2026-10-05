import fs from "node:fs";
import path from "node:path";

import {
  VirtualContext,
  deleteHolder,
  type ObjectContext,
} from "@mirage-x/virtual-object";

import { res2yaml } from "../util/res2yaml.js";
import { writeFeedback } from "./feedbackFile.js";

export type AttachFeedbackPaths = {
  inputPath: string;
  outputPath: string;
};

const readOriginal = (inputPath: string): ObjectContext => {
  const originalPath = path.resolve(inputPath, "ResFeedbackOriginal.json");
  if (!fs.existsSync(originalPath)) {
    throw new Error(`Missing ${originalPath}. Run feedback:fetch first.`);
  }
  return JSON.parse(fs.readFileSync(originalPath, "utf-8")) as ObjectContext;
};

const writeIfChanged = (option: {
  inputPath: string;
  outputPath: string;
  exported: ObjectContext;
  label: string;
}): void => {
  const yaml = res2yaml(option.exported);
  const prevYamlPath = path.resolve(option.outputPath, "ResFeedback.yaml");
  const prevYaml = fs.existsSync(prevYamlPath)
    ? fs.readFileSync(prevYamlPath, "utf-8")
    : "";

  if (prevYaml === yaml) {
    console.info(`no change in ${option.label}`);
    return;
  }

  fs.mkdirSync(option.outputPath, { recursive: true });
  writeFeedback(
    path.resolve(option.outputPath, "ResFeedback.brson"),
    option.exported,
  );
  fs.writeFileSync(prevYamlPath, yaml);

  const metaSrc = path.resolve(option.inputPath, "ResFeedbackMetaOriginal.json");
  if (fs.existsSync(metaSrc)) {
    fs.copyFileSync(
      metaSrc,
      path.resolve(option.outputPath, "ResFeedbackMeta.json"),
    );
  }

  console.info(`attached to ${option.label}`);
};

export const attachCore = (option: AttachFeedbackPaths): void => {
  const result = VirtualContext.generate(readOriginal(option.inputPath));
  if (result.status === "FAILED") {
    throw new Error(`Failed to generate core context: ${result.code}`);
  }
  const { context, warnings } = result.data;
  if (warnings.length > 0) {
    console.warn("coreContextGenerateWarning", warnings);
  }
  deleteHolder(context);

  const coreRef = context.object.components.find(
    (comp) =>
      comp.type ===
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
      comp.data.VariableName?.asPrimitive() === "Static.AppRoot",
  )?.data["Reference"]?.data;
  if (
    !coreRef ||
    coreRef.type !== "Slot" ||
    coreRef.data.type !== "Ref" ||
    !coreRef.data.target
  ) {
    throw new Error("Static.AppRoot not found");
  }

  context.setRootObject(coreRef.data.target);

  const mainSlot = context.object.children.find(
    (child) => child.name.asPrimitive() === "Main",
  );
  if (!mainSlot) {
    throw new Error("Main slot not found");
  }
  context.object.children.forEach((child) => {
    if (child !== mainSlot) {
      child.destroy();
    }
  });

  const envSlot = mainSlot.children
    .find((child) => child.name.asPrimitive() === "DV")
    ?.children.find((child) => child.name.asPrimitive() === "ENV");
  if (!envSlot) {
    throw new Error("Env slot not found");
  }
  envSlot.destroy();

  const packageSlot = mainSlot.children.find(
    (child) => child.name.asPrimitive() === "Package",
  );
  if (!packageSlot) {
    throw new Error("Package slot not found");
  }
  packageSlot.children.forEach((child) => {
    child.destroy();
  });

  const { context: exported, warnings: exportWarnings } = context.export();
  if (exportWarnings.length > 0) {
    console.warn("coreContextExportWarnings", exportWarnings);
  }

  writeIfChanged({
    inputPath: option.inputPath,
    outputPath: option.outputPath,
    exported,
    label: "core",
  });
};

const attachFrame = (
  option: AttachFeedbackPaths & {
    expectedFrameCode: string;
    label: string;
  },
): void => {
  const result = VirtualContext.generate(readOriginal(option.inputPath));
  if (result.status === "FAILED") {
    throw new Error(`Failed to generate frame context: ${result.code}`);
  }
  const { context, warnings } = result.data;
  deleteHolder(context);
  if (warnings.length > 0) {
    console.warn("frameContextWarnings", warnings);
  }

  const frameCode = context.object.components
    .find(
      (comp) =>
        comp.type === "[FrooxEngine]FrooxEngine.DynamicValueVariable<string>" &&
        comp.data.VariableName?.asPrimitive() === "Static.FrameCode",
    )
    ?.data["Value"]?.asPrimitive();
  if (!frameCode) {
    throw new Error("FrameCode not found");
  }
  if (frameCode !== option.expectedFrameCode) {
    console.warn(
      `FrameCode is not ${option.expectedFrameCode}. FrameCode: ${frameCode}`,
    );
    return;
  }

  const appRootRef = context.object.components.find(
    (comp) =>
      comp.type ===
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
      comp.data.VariableName?.asPrimitive() === "Static.AppRoot",
  )?.data["Reference"]?.data;
  if (
    !appRootRef ||
    appRootRef.type !== "Slot" ||
    appRootRef.data.type !== "Ref" ||
    !appRootRef.data.target
  ) {
    throw new Error("Static.AppRoot not found");
  }

  const appRootMainSlot = appRootRef.data.target.children.find(
    (child) => child.name.asPrimitive() === "Main",
  );
  if (!appRootMainSlot) {
    throw new Error("AppRoot/Main slot not found");
  }
  appRootMainSlot.destroy();

  const envSlot = context.object.children
    .find((child) => child.name.asPrimitive() === "DV")
    ?.children.find((child) => child.name.asPrimitive() === "ENV");
  if (!envSlot) {
    throw new Error("Env slot not found");
  }
  envSlot.destroy();

  const { context: exported, warnings: exportWarnings } = context.export();
  if (exportWarnings.length > 0) {
    console.warn("frameContextExportWarnings", exportWarnings);
  }

  writeIfChanged({
    inputPath: option.inputPath,
    outputPath: option.outputPath,
    exported,
    label: option.label,
  });
};

export const attachSimpleFrame = (option: AttachFeedbackPaths): void => {
  attachFrame({
    ...option,
    expectedFrameCode: "Simple",
    label: "simple frame",
  });
};

export const attachInstallFrame = (option: AttachFeedbackPaths): void => {
  attachFrame({
    ...option,
    expectedFrameCode: "InstalledAvatar",
    label: "install frame",
  });
};
