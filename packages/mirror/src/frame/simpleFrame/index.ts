import type { VirtualContext } from "@mirage-x/virtual-object";
import { VirtualContext as VC } from "@mirage-x/virtual-object";
import { assetPath } from "../../assets.js";
import { readFeedback } from "../../feedback/feedbackFile.js";

export const generateSimpleFrame = (option: {
  appCode: string;
  core: VirtualContext;
  generateEnv: () => VirtualContext;
}) => {
  const frameContextResult = VC.generate(
    readFeedback(assetPath("frame/simpleFrame/ResFeedback.brson")),
  );
  if (frameContextResult.status === "FAILED") {
    throw new Error("Failed to generate frame context", {
      cause: frameContextResult.reason,
    });
  }
  const { context: frameContext, warnings: frameContextWarnings } =
    frameContextResult.data;

  if (frameContextWarnings.length > 0) {
    console.warn("frameContextWarnings", frameContextWarnings);
  }

  frameContext.object.name.data.data = option.appCode;

  const oldCoreRef = frameContext.object.components.find(
    (comp) =>
      comp.type ===
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
      comp.data.VariableName?.asPrimitive() === "Static.AppRoot",
  )?.data["Reference"]?.data;
  if (
    !oldCoreRef ||
    oldCoreRef.type !== "Slot" ||
    oldCoreRef.data.type !== "Ref" ||
    !oldCoreRef.data.target
  ) {
    throw new Error("Static.AppRoot not found in FrameTemplate");
  }
  if (!oldCoreRef.data.target.parent) {
    throw new Error("Static.AppRoot parent not found in FrameTemplate");
  }
  const oldCoreSlot = oldCoreRef.data.target;
  option.core.object.setParent(oldCoreRef.data.target.parent);
  oldCoreSlot.children.forEach((child) => {
    child.setParent(option.core.object);
  });
  oldCoreSlot.destroy();

  const frameDVSlot = frameContext.object.children.find(
    (child) => child.name.asPrimitive() === "DV",
  );
  if (!frameDVSlot) {
    throw new Error("DV slot not found");
  }
  option.generateEnv().object.setParent(frameDVSlot);

  const dvStaticCore = frameContext.object.components.find(
    (comp) =>
      comp.type ===
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
      comp.data.VariableName?.asPrimitive() === "Static.AppRoot",
  );
  if (!dvStaticCore || !dvStaticCore.data.Reference?.data) {
    throw new Error("Static.AppRoot not found");
  }
  dvStaticCore.data.Reference.data = {
    type: "Slot",
    data: {
      type: "Ref",
      target: option.core.object,
    },
  };

  const dvStaticAppRoot = option.core.object.components.find(
    (comp) =>
      comp.type ===
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
      comp.data.VariableName?.asPrimitive() === "Static.FrameRoot",
  );
  if (!dvStaticAppRoot || !dvStaticAppRoot.data.Reference?.data) {
    throw new Error("Static.FrameRoot not found");
  }
  dvStaticAppRoot.data.Reference.data = {
    type: "Slot",
    data: {
      type: "Ref",
      target: frameContext.object,
    },
  };

  return frameContext;
};
