import { Document } from "@frdt/frdt";

import { assetPath } from "./assets.js";
import { readFeedback } from "./feedback/feedbackFile.js";
import {
  addValueVariable,
  bool,
  importSlots,
  requireChild,
  str,
  type BoolValue,
  type StringValue,
} from "./frdt/util.js";

/** Units by category: `{ [category]: { [name]: unit } }`. */
export type MirrorUnits = {
  [category: string]: { [name: string]: Document };
};

export type GenerateFrame = (option: {
  appCode: string;
  /** The core with the units and its ENV in place. */
  core: Document;
  /** The ENV slot (a separate document) to place in the frame. */
  env: Document;
}) => Document;

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
  units: MirrorUnits;
  generateFrame: GenerateFrame;
}): Document => {
  const core = readFeedback(assetPath("core/ResFeedback.brson"));

  const env = Document.empty(
    "ENV",
    core.versionNumber(),
    core.featureFlags(),
  );
  const envVariables: Array<[string, StringValue | BoolValue]> = [
    ["Env.Host.CVPath", str(hostCVPath)],
    ["Env.Host.Fallback", str(fallbackHost)],
    ["Env.UseSSL.CVPath", str(useSSLCVPath)],
    ["Env.CVOwnerID", str(cvOwnerId)],
    ["Env.UseSSL.Fallback", bool(fallbackUseSSL)],
    ["Env.Version.Current", str(currentVersion)],
    ["Env.AppCode", str(appCode)],
    ["Env._IsCompatibleWithGeneralHub", bool(true)],
    ["ENV.HostAccessReason.Ja", str(hostAccessReason.ja)],
    ["ENV.HostAccessReason.En", str(hostAccessReason.en)],
    ["ENV.HostAccessReason.Ko", str(hostAccessReason.ko)],
    ["ENV.DEVELOP_CODE", str(developCode ?? "")],
    ["ENV.ResetOnSave", bool(resetOnSave)],
  ];
  for (const [name, value] of envVariables) {
    addValueVariable(env, env.root(), name, value);
  }

  const main = requireChild(core.root(), "Main");
  const packageSlot = requireChild(main, "Package");
  for (const [category, categoryUnits] of Object.entries(units)) {
    const categorySlot = core.addSlot(packageSlot, category);
    for (const [name, unit] of Object.entries(categoryUnits)) {
      importSlots(core, categorySlot, [unit.root()], {
        label: `Unit ${category}/${name} (${unit.root().name()})`,
      });
    }
  }

  // ENV goes to Main/DV of the core as well as to the frame.
  importSlots(core, requireChild(main, "DV"), [env.root()], {
    label: "ENV (core)",
  });

  return generateFrame({ appCode, core, env });
};
