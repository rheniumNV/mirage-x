import type { ObjectContext } from "@mirage-x/virtual-object";
import { DeCompress } from "brson.js";
import fs from "node:fs";
import path from "node:path";
import {
  generateClient,
  type GenerateFrame,
  type MirrorUnits,
} from "./generateClient.js";
import { readFileSync } from "./util/readFileSync.js";
import { res2yaml } from "./util/res2yaml.js";

const currentVersion = `${new Date().getTime()}`;

export const build = async (
  config: {
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
  },
  units: MirrorUnits,
  generateFrame: GenerateFrame,
) => {
  console.debug(`start generating version ${currentVersion}`);
  const outputDocument = generateClient({
    appCode: config.appCode,
    hostCVPath: config.cv.mirage.host.path,
    useSSLCVPath: config.cv.mirage.useSsl.path,
    cvOwnerId: config.cv.mirage.host.ownerId,
    fallbackHost: config.cv.mirage.host.fallback,
    fallbackUseSSL: config.cv.mirage.useSsl.fallback,
    currentVersion,
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
  const outputBrson = outputDocument.writeBrson();
  console.debug(`end generating version ${currentVersion}`);

  // The yaml (ids renumbered) is only for the change check below; #11
  // replaces it with a byte comparison after renumberIds.
  const output = JSON.parse(DeCompress(outputBrson)) as ObjectContext;

  const outputYaml = res2yaml(output);

  const prevOutputYamlOutput = readFileSync({
    path: path.resolve(config.outputPath, "output.yaml"),
  });
  const prevOutputYaml =
    prevOutputYamlOutput.status === "SUCCESS"
      ? prevOutputYamlOutput.data
      : "{}";

  const prevVersionResult = readFileSync({
    path: path.resolve(config.outputPath, "version.json"),
  });
  const prevVersion = JSON.parse(
    prevVersionResult.status === "SUCCESS" ? prevVersionResult.data : "{}",
  ).version;

  const fixedPrevOutput = prevOutputYaml.replace(
    new RegExp(prevVersion, "g"),
    currentVersion,
  );

  if (outputYaml === fixedPrevOutput) {
    console.info(`no change in output`);
    process.exit(0);
  }

  const newOutput = JSON.stringify(output, null, 0);

  fs.mkdirSync(config.outputPath, { recursive: true });

  fs.writeFileSync(path.resolve(config.outputPath, "output.json"), newOutput);

  fs.writeFileSync(path.resolve(config.outputPath, "output.yaml"), outputYaml);

  fs.writeFileSync(
    path.resolve(config.outputPath, "output.brson"),
    outputBrson,
  );

  fs.writeFileSync(
    path.resolve(config.outputPath, "version.json"),
    JSON.stringify({ version: currentVersion }, null, 2),
  );

  console.info(`generated version ${currentVersion}`);
};
