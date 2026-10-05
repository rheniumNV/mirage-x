import type { VirtualContext } from "@mirage-x/virtual-object";
import {
  VirtualContext as VC,
  dynamicValueVariable,
} from "@mirage-x/virtual-object";
import { assetPath } from "./assets.js";
import { readFeedback } from "./feedback/feedbackFile.js";

export const generateClient = ({
  appCode,
  hostCVPath,
  useSSLCVPath,
  cvOwnerId,
  fallbackHost,
  fallbackUseSSL,
  currentVersion,
  hostAccessReason,
  units,
  generateFrame,
  developCode,
  resetOnSave,
}: {
  appCode: string;
  hostCVPath: string;
  useSSLCVPath: string;
  cvOwnerId: string;
  fallbackHost: string;
  fallbackUseSSL: boolean;
  currentVersion: string;
  hostAccessReason: {
    ja: string;
    en: string;
    ko: string;
  };
  developCode?: string;
  resetOnSave: boolean;
  units: {
    [key: string]: { [key: string]: VirtualContext };
  };
  generateFrame: (option: {
    appCode: string;
    core: VirtualContext;
    generateEnv: () => VirtualContext;
  }) => VirtualContext;
}): VirtualContext => {
  const result = VC.generate(readFeedback(assetPath("core/ResFeedback.brson")));
  if (result.status === "FAILED") {
    throw new Error(`${result.code} ${result.reason}`);
  }
  const { context: coreContext, warnings: coreContextWarnings } = result.data;

  if (coreContextWarnings.length > 0) {
    console.warn("coreContextWarnings", coreContextWarnings);
  }

  const { context: envContext, warnings: envContextWarnings } =
    VC.createEmpty();
  if (envContextWarnings.length > 0) {
    console.warn("envContextWarnings", envContextWarnings);
  }
  envContext.object.name.data.data = "ENV";
  const slotEnv = envContext.object;
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: hostCVPath },
      variableName: "Env.Host.CVPath",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: fallbackHost },
      variableName: "Env.Host.Fallback",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: useSSLCVPath },
      variableName: "Env.UseSSL.CVPath",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: cvOwnerId },
      variableName: "Env.CVOwnerID",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "bool", value: fallbackUseSSL },
      variableName: "Env.UseSSL.Fallback",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: currentVersion },
      variableName: "Env.Version.Current",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: appCode },
      variableName: "Env.AppCode",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "bool", value: true },
      variableName: "Env._IsCompatibleWithGeneralHub",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: hostAccessReason.ja },
      variableName: "ENV.HostAccessReason.Ja",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: hostAccessReason.en },
      variableName: "ENV.HostAccessReason.En",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: hostAccessReason.ko },
      variableName: "ENV.HostAccessReason.Ko",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "string", value: developCode ?? "" },
      variableName: "ENV.DEVELOP_CODE",
    }),
  );
  slotEnv.createComponent(
    dynamicValueVariable({
      typeValue: { type: "bool", value: resetOnSave },
      variableName: "ENV.ResetOnSave",
    }),
  );

  const slotPackage = coreContext.object.children
    .find((child) => child.name.asPrimitive() === "Main")
    ?.children.find((slot) => slot.name.data.data === "Package");
  if (!slotPackage) {
    throw new Error("Package not found");
  }
  Object.entries(units).forEach(([key, category]) => {
    const unitCategory = slotPackage.createChild({ name: key });
    Object.entries(category).forEach(([, unit]) => {
      try {
        unit.object.setParent(unitCategory);
      } catch (e) {
        console.error("Failed to set parent", category, key);
        throw e;
      }
    });
  });

  const coreMainDVSlot = coreContext.object.children
    .find((child) => child.name.asPrimitive() === "Main")
    ?.children.find((child) => child.name.asPrimitive() === "DV");
  if (!coreMainDVSlot) {
    throw new Error("Main/DV slot not found");
  }

  const generateEnv = (): VirtualContext => {
    const { context: envJson, warnings: envJsonWarnings } = envContext.export();
    if (envJsonWarnings.length > 0) {
      console.warn("envJsonWarnings", envJsonWarnings);
    }

    const envResult = VC.generate(envJson);
    if (envResult.status === "FAILED") {
      throw new Error(`${envResult.code} ${envResult.reason}`);
    }
    const { context: duplicatedEnvContext, warnings: envDupWarnings } =
      envResult.data;

    if (envDupWarnings.length > 0) {
      console.warn("envContextWarnings", envDupWarnings);
    }
    return duplicatedEnvContext;
  };

  const frameContext = generateFrame({
    appCode,
    core: coreContext,
    generateEnv,
  });

  envContext.object.setParent(coreMainDVSlot);

  return frameContext;
};
