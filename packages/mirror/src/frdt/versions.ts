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
  /**
   * Messages about parts that are far apart and flags left out or differing.
   * Each names at most a few parts (see `Warnings`).
   */
  warnings: string[];
  /** The same messages with every part named, for debug output. */
  details: string[];
};

/** How many parts a warning names before it says how many more there are. */
export const WARNING_PART_LIMIT = 3;

/**
 * Warnings that name a list of parts: `warnings` names at most
 * `WARNING_PART_LIMIT` of them (`205 parts: a, b, c, … and 202 more`),
 * `details` all of them.
 */
export class Warnings {
  readonly warnings: string[] = [];
  readonly details: string[] = [];

  add(message: string, parts: string[]) {
    const all = parts.join(", ");
    this.details.push(`${message}: ${all}`);
    if (parts.length <= WARNING_PART_LIMIT) {
      this.warnings.push(`${message}: ${all}`);
      return;
    }
    const shown = parts.slice(0, WARNING_PART_LIMIT).join(", ");
    const more = parts.length - WARNING_PART_LIMIT;
    this.warnings.push(
      `${message}: ${parts.length} parts: ${shown}, … and ${more} more`,
    );
  }

  addAll(other: Warnings) {
    this.warnings.push(...other.warnings);
    this.details.push(...other.details);
  }
}

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

  const warnings = new Warnings();
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
    warnings.add(
      `Parts were saved by Resonite versions more than ` +
        `${VERSION_SPAN_WARNING_DAYS} days apart (${oldest.versionNumber} to ` +
        `${newest.versionNumber}); the output uses ${uses}; oldest first`,
      sorted.map((v) => `${v.label} ${v.versionNumber}`),
    );
  }

  if (source === "frame") {
    warnings.addAll(frameFlagWarnings(parts));
    return {
      versionNumber: first.doc.versionNumber(),
      featureFlags: first.doc.featureFlags(),
      warnings: warnings.warnings,
      details: warnings.details,
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
        warnings.add(
          `FeatureFlag ${name} differs between parts; the output uses ${value}`,
          flagsOf.map(({ label, flags }) => `${label} ${flags.get(name)}`),
        );
      }
    }
  }
  for (const name of allNames) {
    if (featureFlags.some((f) => f.name === name)) continue;
    const lacking = flagsOf
      .filter(({ flags }) => !flags.has(name))
      .map(({ label }) => label);
    warnings.add(
      `FeatureFlag ${name} is left out because some parts do not have it`,
      lacking,
    );
  }
  return {
    versionNumber: oldest.versionNumber,
    featureFlags,
    warnings: warnings.warnings,
    details: warnings.details,
  };
};

/**
 * With `"frame"`: flags that other parts lack or have with another value,
 * and flags other parts have but the frame does not.
 */
const frameFlagWarnings = (parts: Part[]): Warnings => {
  const warnings = new Warnings();
  const [frame, ...rest] = parts;
  if (!frame) return warnings;
  const frameFlags = new Map(
    frame.doc.featureFlags().map((f) => [f.name, f.value]),
  );
  const restFlags = rest.map(({ label, doc }) => ({
    label,
    flags: new Map(doc.featureFlags().map((f) => [f.name, f.value])),
  }));
  for (const [name, value] of frameFlags) {
    const missing = restFlags
      .filter(({ flags }) => !flags.has(name))
      .map(({ label }) => label);
    const differing = restFlags
      .filter(({ flags }) => flags.has(name) && flags.get(name) !== value)
      .map(({ label, flags }) => `${label} ${flags.get(name)}`);
    if (missing.length > 0) {
      warnings.add(
        `FeatureFlag ${name} is kept from the ${frame.label} but is missing in`,
        missing,
      );
    }
    if (differing.length > 0) {
      warnings.add(
        `FeatureFlag ${name} is the ${frame.label}'s (${value}) in the output ` +
          "but differs in",
        differing,
      );
    }
  }
  const others = new Set(restFlags.flatMap(({ flags }) => [...flags.keys()]));
  for (const name of others) {
    if (frameFlags.has(name)) continue;
    const having = restFlags
      .filter(({ flags }) => flags.has(name))
      .map(({ label }) => label);
    warnings.add(
      `FeatureFlag ${name} is left out because the ${frame.label} does not ` +
        "have it",
      having,
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
export const typeVersionWarnings = (
  output: Document,
  parts: Part[],
): Warnings => {
  const written = new Map(
    output.types().map((t) => [t, output.typeVersion(t) ?? 0]),
  );
  const warnings = new Warnings();
  for (const [type, version] of [...written].sort(([a], [b]) => a.localeCompare(b))) {
    const differing = parts.flatMap(({ label, doc }) => {
      if (!doc.types().includes(type)) return [];
      const own = doc.typeVersion(type) ?? 0;
      return own === version ? [] : [`${label} ${own}`];
    });
    if (differing.length > 0) {
      warnings.add(
        `TypeVersion of ${type} is ${version} in the output but differs in`,
        differing,
      );
    }
  }
  return warnings;
};
