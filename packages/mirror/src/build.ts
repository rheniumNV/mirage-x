import fs from "node:fs";
import path from "node:path";

import { setVariableValues, str } from "./frdt/util.js";
import {
  generateClient,
  type GenerateFrame,
  type MirrorUnits,
} from "./generateClient.js";

/** Seed for `renumberIds`, so that the same output writes the same bytes. */
const ID_SEED = 0;
const VERSION_VARIABLE = "Env.Version.Current";

export type BuildConfig = {
  appCode: string;
  cv: {
    mirage: {
      host: {
        path: string;
        ownerId: string;
        fallback: string;
      };
      useSsl: {
        path: string;
        fallback: boolean;
      };
    };
  };
  outputPath: string;
  hostAccessReason?: {
    ja: string;
    en: string;
    ko: string;
  };
  resetOnSave?: boolean;
  developCode?: string;
};

export type BuildResult = {
  /** false when the output is the same as the previous build. */
  changed: boolean;
  /** The version in `version.json` after this build. */
  version: string;
};

const readPreviousVersion = (outputPath: string): string | undefined => {
  try {
    const version = JSON.parse(
      fs.readFileSync(path.resolve(outputPath, "version.json"), "utf-8"),
    ).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
};

const readPrevious = (file: string): Buffer | undefined => {
  try {
    return fs.readFileSync(file);
  } catch {
    return undefined;
  }
};

/**
 * Build `output.brson` (and `version.json`) under `config.outputPath`.
 *
 * Ids are renumbered from a fixed seed, so the same inputs give the same
 * bytes. The output is compared with the previous one as built with the
 * previous version string; when nothing else changed, nothing is written and
 * the version stays (connected clients are not asked to reload).
 */
export const build = async (
  config: BuildConfig,
  units: MirrorUnits,
  generateFrame: GenerateFrame,
): Promise<BuildResult> => {
  const outputBrsonPath = path.resolve(config.outputPath, "output.brson");
  const previousVersion = readPreviousVersion(config.outputPath);
  const newVersion = `${Date.now()}`;

  console.debug("start generating");
  const output = generateClient({
    appCode: config.appCode,
    hostCVPath: config.cv.mirage.host.path,
    useSSLCVPath: config.cv.mirage.useSsl.path,
    cvOwnerId: config.cv.mirage.host.ownerId,
    fallbackHost: config.cv.mirage.host.fallback,
    fallbackUseSSL: config.cv.mirage.useSsl.fallback,
    // Built with the previous version first, so that it can be compared.
    currentVersion: previousVersion ?? newVersion,
    hostAccessReason: config.hostAccessReason ?? {
      ja: `${config.appCode}を使用するため`,
      en: `for use ${config.appCode}`,
      ko: `${config.appCode}을 사용하기 위해`,
    },
    developCode: config.developCode,
    resetOnSave: config.resetOnSave ?? true,
    units,
    generateFrame,
  });
  output.renumberIds(ID_SEED);
  console.debug("end generating");

  const previous = readPrevious(outputBrsonPath);
  if (previousVersion && previous?.equals(output.writeBrson())) {
    console.info("no change in output");
    return { changed: false, version: previousVersion };
  }

  if (previousVersion) {
    // Values only; ids and structure stay the same.
    setVariableValues(output, VERSION_VARIABLE, str(newVersion));
  }

  fs.mkdirSync(config.outputPath, { recursive: true });
  fs.writeFileSync(outputBrsonPath, output.writeBrson());
  fs.writeFileSync(
    path.resolve(config.outputPath, "version.json"),
    JSON.stringify({ version: newVersion }, null, 2),
  );

  console.info(`generated version ${newVersion}`);
  return { changed: true, version: newVersion };
};
