import fs from "node:fs";
import path from "node:path";

import {
  VirtualContext,
  deleteHolder,
} from "@mirage-x/virtual-object";

import { res2yaml } from "../util/res2yaml.js";
import { writeFeedback } from "./feedbackFile.js";

export type AttachUnitsOptions = {
  /** Directory containing ResFeedbackOriginal.json / ResFeedbackMetaOriginal.json */
  feedbackDir: string;
  /** Root of unit packages (e.g. examples/basic/src/unit) */
  unitsRoot: string;
  /** Full regex for `Package/Unit` (e.g. `PrimitiveUix/PrimitiveImage` or `PrimitiveUix/.+`) */
  matchPattern: string;
};

export const attachUnits = (options: AttachUnitsOptions): void => {
  const unitFilterRegex = new RegExp(`^${options.matchPattern}$`);
  console.info(`matchPattern=${options.matchPattern}`);

  const originalPath = path.resolve(
    options.feedbackDir,
    "ResFeedbackOriginal.json",
  );
  const metaPath = path.resolve(
    options.feedbackDir,
    "ResFeedbackMetaOriginal.json",
  );

  if (!fs.existsSync(originalPath)) {
    throw new Error(`Missing ${originalPath}. Run feedback:fetch first.`);
  }
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Missing ${metaPath}. Run feedback:fetch first.`);
  }

  const ResFeedbackOriginalJson = JSON.parse(
    fs.readFileSync(originalPath, "utf-8"),
  ) as unknown;
  const ResFeedbackMetaOriginal = fs.readFileSync(metaPath, "utf-8");

  const targets = fs.readdirSync(options.unitsRoot).flatMap((packageName) => {
    const packagePath = path.resolve(options.unitsRoot, packageName);
    if (!fs.statSync(packagePath).isDirectory()) {
      return [];
    }
    const units = fs.readdirSync(packagePath).flatMap((fileName) => {
      const unitPath = path.resolve(packagePath, fileName);
      return fs.statSync(unitPath).isDirectory() ? [fileName] : [];
    });
    return [{ packageName, units }];
  });

  const filteredTargets = targets.map(({ packageName, units }) => ({
    packageName,
    units: units.filter(
      (unit) => `${packageName}/${unit}`.match(unitFilterRegex) !== null,
    ),
  }));

  const matchedCount = filteredTargets.reduce(
    (sum, t) => sum + t.units.length,
    0,
  );
  const totalCount = targets.reduce((sum, t) => sum + t.units.length, 0);
  console.log("unit:", matchedCount, "/", totalCount);

  for (const { packageName, units } of filteredTargets) {
    for (const unit of units) {
      const unitContextResult = VirtualContext.generate(
        ResFeedbackOriginalJson as never,
      );
      if (unitContextResult.status === "FAILED") {
        throw new Error(
          `Failed to generate unit context: ${unitContextResult.code}`,
        );
      }
      const { context: unitContext, warnings: unitContextGenerateWarnings } =
        unitContextResult.data;

      if (unitContextGenerateWarnings.length > 0) {
        console.warn(`warnings: ${unitContextGenerateWarnings.join("\n")}`);
      }
      deleteHolder(unitContext);

      const coreRef = unitContext.object.components.find(
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
      const mainSlot = coreRef.data.target.children.find(
        (child) => child.name.asPrimitive() === "Main",
      );
      if (!mainSlot) {
        throw new Error("Main slot not found");
      }
      const packageSlot = mainSlot.children.find(
        (child) => child.name.asPrimitive() === "Package",
      );
      if (!packageSlot) {
        throw new Error("Package slot not found");
      }

      const targetUnit = packageSlot.children
        .find((slot) => slot.name.data.data === packageName)
        ?.children.find(
          (slot) => slot.name.data.data === `${packageName}/${unit}`,
        );

      const unitDir = path.resolve(options.unitsRoot, packageName, unit);

      if (targetUnit) {
        unitContext.setRootObject(targetUnit);
        const { context: unitObjectResult, warnings: unitObjectWarnings } =
          unitContext.export();
        if (unitObjectWarnings.length > 0) {
          console.warn(`warnings: ${unitObjectWarnings.join("\n")}`);
        }
        const unitObjectYaml = res2yaml(unitObjectResult);

        const prevYamlPath = path.resolve(unitDir, "ResFeedback.yaml");
        const prevUnitObjectYaml = fs.existsSync(prevYamlPath)
          ? fs.readFileSync(prevYamlPath, "utf-8")
          : "";

        if (prevUnitObjectYaml === unitObjectYaml) {
          console.info(`no change in ${packageName}/${unit}`);
          continue;
        }

        writeFeedback(
          path.resolve(unitDir, "ResFeedback.brson"),
          unitObjectResult,
        );
        fs.writeFileSync(prevYamlPath, unitObjectYaml);
        fs.writeFileSync(
          path.resolve(unitDir, "ResFeedbackMeta.json"),
          ResFeedbackMetaOriginal,
        );

        console.info(`attached to ${packageName}/${unit}`);
      } else {
        console.info(`not found ${packageName}/${unit}`);
      }
    }
  }
};
