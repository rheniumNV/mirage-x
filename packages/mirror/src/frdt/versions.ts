import {
  compareVersions,
  versionDate,
  type Document,
  type FeatureFlag,
} from "@frdt/frdt";

/** A document that goes into the output, named for messages. */
export type Part = { label: string; doc: Document };

export type PartVersions = {
  /** The oldest `VersionNumber` among the parts. */
  versionNumber: string;
  /**
   * The flags every part has, in the order of the first part; when the
   * parts disagree on a flag's value, the smallest.
   */
  featureFlags: FeatureFlag[];
  /** Messages about parts that differ much or lack flags. */
  warnings: string[];
};

/** Parts further apart than this are reported. */
export const VERSION_SPAN_WARNING_DAYS = 90;

const dayOf = (versionNumber: string): number | null => {
  const date = versionDate(versionNumber);
  if (!date) return null;
  const [year = 0, month = 1, day = 1] = date;
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

/**
 * The version and flags to write on a document made of `parts`: those of the
 * oldest part, so that Resonite converts data saved by older versions when
 * it loads the result.
 */
export const partVersions = (parts: Part[]): PartVersions => {
  const [first] = parts;
  if (!first) {
    throw new Error("partVersions needs at least one part");
  }
  const versions = parts.map(({ label, doc }) => ({
    label,
    versionNumber: doc.versionNumber(),
  }));
  const sorted = [...versions].sort((a, b) =>
    compareVersions(a.versionNumber, b.versionNumber),
  );
  const oldest = sorted[0]!;
  const newest = sorted[sorted.length - 1]!;

  const warnings: string[] = [];
  const oldestDay = dayOf(oldest.versionNumber);
  const newestDay = dayOf(newest.versionNumber);
  if (
    oldestDay !== null &&
    newestDay !== null &&
    newestDay - oldestDay > VERSION_SPAN_WARNING_DAYS
  ) {
    warnings.push(
      `Parts were saved by Resonite versions more than ${VERSION_SPAN_WARNING_DAYS} days apart; the output uses the oldest (${oldest.versionNumber}): ` +
        sorted.map((v) => `${v.label} ${v.versionNumber}`).join(", "),
    );
  }

  const flagsOf = parts.map(({ label, doc }) => ({
    label,
    flags: new Map(doc.featureFlags().map((f) => [f.name, f.value])),
  }));
  const allNames = new Set(flagsOf.flatMap(({ flags }) => [...flags.keys()]));
  const featureFlags: FeatureFlag[] = [];
  for (const { name } of first.doc.featureFlags()) {
    const values = flagsOf.map(({ flags }) => flags.get(name));
    if (values.every((v) => v !== undefined)) {
      featureFlags.push({ name, value: Math.min(...(values as number[])) });
    }
  }
  for (const name of allNames) {
    if (featureFlags.some((f) => f.name === name)) continue;
    const lacking = flagsOf
      .filter(({ flags }) => !flags.has(name))
      .map(({ label }) => label);
    warnings.push(
      `FeatureFlag ${name} is left out because some parts do not have it: ${lacking.join(", ")}`,
    );
  }
  return { versionNumber: oldest.versionNumber, featureFlags, warnings };
};
