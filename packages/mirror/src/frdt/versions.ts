import {
  compareVersions,
  versionDate,
  type Document,
  type FeatureFlag,
} from "@frdt/frdt";

/** A document that goes into the output, named for messages. */
export type Part = { label: string; doc: Document };

/**
 * Where the output's `VersionNumber` and `FeatureFlags` come from:
 * - `"oldest"`: the oldest part's version and the flags every part has, so
 *   Resonite converts data saved by older versions when it loads the output.
 * - `"frame"`: the frame's, as they are (the first part). Data saved by older
 *   versions in other parts is not converted.
 */
export type VersionSource = "oldest" | "frame";

export type PartVersions = {
  /**
   * `"oldest"`: the oldest `VersionNumber` among the parts.
   * `"frame"`: the first part's.
   */
  versionNumber: string;
  /**
   * `"oldest"`: the flags every part has, in the order of the first part;
   * when the parts disagree on a flag's value, the smallest.
   * `"frame"`: the first part's.
   */
  featureFlags: FeatureFlag[];
  /** Messages about parts that are far apart and flags left out or differing. */
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
 * The version and flags to write on a document made of `parts`. The first
 * part is the frame. See `VersionSource`.
 */
export const partVersions = (
  parts: Part[],
  source: VersionSource = "oldest",
): PartVersions => {
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
    const uses =
      source === "frame"
        ? `the ${first.label}'s (${first.doc.versionNumber()})`
        : `the oldest (${oldest.versionNumber})`;
    warnings.push(
      `Parts were saved by Resonite versions more than ${VERSION_SPAN_WARNING_DAYS} days apart; the output uses ${uses}: ` +
        sorted.map((v) => `${v.label} ${v.versionNumber}`).join(", "),
    );
  }

  if (source === "frame") {
    return {
      versionNumber: first.doc.versionNumber(),
      featureFlags: first.doc.featureFlags(),
      warnings: [...warnings, ...frameFlagWarnings(parts)],
    };
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
  return { versionNumber: oldest.versionNumber, featureFlags, warnings };
};

/** With `"frame"`: flags that other parts lack, have with another value, or have but the frame does not. */
const frameFlagWarnings = (parts: Part[]): string[] => {
  const [frame, ...rest] = parts;
  if (!frame) return [];
  const frameFlags = new Map(frame.doc.featureFlags().map((f) => [f.name, f.value]));
  const restFlags = rest.map(({ label, doc }) => ({
    label,
    flags: new Map(doc.featureFlags().map((f) => [f.name, f.value])),
  }));
  const warnings: string[] = [];
  for (const [name, value] of frameFlags) {
    const differing = restFlags
      .filter(({ flags }) => flags.get(name) !== value)
      .map(({ label, flags }) => `${label} ${flags.get(name) ?? "(none)"}`);
    if (differing.length > 0) {
      warnings.push(
        `FeatureFlag ${name} is the ${frame.label}'s (${value}) in the output but differs in: ${differing.join(", ")}`,
      );
    }
  }
  const others = new Set(restFlags.flatMap(({ flags }) => [...flags.keys()]));
  for (const name of others) {
    if (frameFlags.has(name)) continue;
    const having = restFlags.filter(({ flags }) => flags.has(name)).map(({ label }) => label);
    warnings.push(
      `FeatureFlag ${name} is left out because the ${frame.label} does not have it: ${having.join(", ")}`,
    );
  }
  return warnings;
};

/**
 * Types whose `TypeVersions` entry in `parts` differs from the one written in
 * `output`. The output keeps its own entries when parts are imported, so
 * Resonite treats those components as saved by the output's type version.
 * A type without an entry is at version 0.
 */
export const typeVersionWarnings = (output: Document, parts: Part[]): string[] => {
  const written = new Map(
    output.types().map((t) => [t, output.typeVersion(t) ?? 0]),
  );
  const warnings: string[] = [];
  for (const [type, version] of [...written].sort(([a], [b]) => a.localeCompare(b))) {
    const differing = parts.flatMap(({ label, doc }) => {
      if (!doc.types().includes(type)) return [];
      const own = doc.typeVersion(type) ?? 0;
      return own === version ? [] : [`${label} ${own}`];
    });
    if (differing.length > 0) {
      warnings.push(
        `TypeVersion of ${type} is ${version} in the output but differs in: ${differing.join(", ")}`,
      );
    }
  }
  return warnings;
};
