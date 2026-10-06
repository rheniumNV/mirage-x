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
  /**
   * Messages about parts that are far apart, flags that are left out or
   * differ, and types whose `TypeVersions` differ.
   */
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
      const value = Math.min(...(values as number[]));
      featureFlags.push({ name, value });
      if (values.some((v) => v !== value)) {
        warnings.push(
          `FeatureFlag ${name} differs between parts; the output uses ${value}: ` +
            flagsOf.map(({ label, flags }) => `${label} ${flags.get(name)}`).join(", "),
        );
      }
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
  // Not changed in the output (the destination's are kept on import); only
  // reported. A type without a TypeVersions entry is at version 0.
  const typeVersionsOf = parts.map(({ label, doc }) => ({
    label,
    versions: new Map(doc.types().map((t) => [t, doc.typeVersion(t) ?? 0])),
  }));
  const allTypes = new Set(
    typeVersionsOf.flatMap(({ versions }) => [...versions.keys()]),
  );
  for (const type of [...allTypes].sort()) {
    const having = typeVersionsOf.filter(({ versions }) => versions.has(type));
    const distinct = new Set(having.map(({ versions }) => versions.get(type)));
    if (distinct.size > 1) {
      warnings.push(
        `TypeVersion of ${type} differs between parts: ` +
          having.map(({ label, versions }) => `${label} ${versions.get(type)}`).join(", "),
      );
    }
  }

  return { versionNumber: oldest.versionNumber, featureFlags, warnings };
};
