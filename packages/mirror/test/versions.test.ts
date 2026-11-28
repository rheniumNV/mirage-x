import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Document, type FeatureFlag } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import {
  partVersions,
  typeVersionWarnings,
  type VersionSource,
} from "../src/frdt/versions.js";
import { generateSimpleFrame } from "../src/frame/simpleFrame/index.js";
import { generateClient } from "../src/generateClient.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const flags = (...names: Array<string | [string, number]>): FeatureFlag[] =>
  names.map((n) => (typeof n === "string" ? { name: n, value: 0 } : { name: n[0], value: n[1] }));

const part = (label: string, version: string, featureFlags: FeatureFlag[]) => ({
  label,
  doc: Document.empty(label, version, featureFlags),
});

describe("partVersions", () => {
  it("takes the oldest version and the flags every part has", () => {
    const result = partVersions([
      part("frame", "2026.9.18.82", flags("A", ["B", 2], "C")),
      part("core", "2026.8.1.10", flags("A", ["B", 1])),
      part("unit", "2026.9.1.5", flags(["B", 3], "A", "C", "D")),
    ]);
    assert.equal(result.versionNumber, "2026.8.1.10");
    assert.deepEqual(result.featureFlags, flags("A", ["B", 1]));
    // Within the span: the differing and dropped flags are reported.
    assert.deepEqual(result.warnings.length, 3);
    assert.match(result.warnings[0]!, /FeatureFlag B differs .* uses 1: frame 2, core 1, unit 3$/);
    assert.match(result.warnings[1]!, /FeatureFlag C .*: core$/);
    assert.match(result.warnings[2]!, /FeatureFlag D .*: frame, core$/);
  });

  it("compares versions as numbers", () => {
    const result = partVersions([
      part("a", "2026.10.1.1", flags()),
      part("b", "2026.9.30.100", flags()),
    ]);
    assert.equal(result.versionNumber, "2026.9.30.100");
  });

  it("warns when parts are far apart", () => {
    const result = partVersions([
      part("frame", "2026.9.18.82", flags("A")),
      part("unit", "2026.1.2.3", flags("A")),
    ]);
    assert.equal(result.versionNumber, "2026.1.2.3");
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0]!, /unit 2026\.1\.2\.3, frame 2026\.9\.18\.82/);
  });

  it("names a few parts in a warning and all of them in the details", () => {
    const units = Array.from({ length: 10 }, (_, i) =>
      part(`Test/Unit${i}`, `2024.7.${i + 1}.1`, flags()),
    );
    const result = partVersions([
      part("frame", "2026.9.18.82", flags("A")),
      ...units,
    ]);
    assert.deepEqual(result.warnings, [
      "Parts were saved by Resonite versions more than 90 days apart " +
        "(2024.7.1.1 to 2026.9.18.82); the output uses the oldest " +
        "(2024.7.1.1); oldest first: 11 parts: Test/Unit0 2024.7.1.1, " +
        "Test/Unit1 2024.7.2.1, Test/Unit2 2024.7.3.1, … and 8 more",
      "FeatureFlag A is left out because some parts do not have it: " +
        "10 parts: Test/Unit0, Test/Unit1, Test/Unit2, … and 7 more",
    ]);
    assert.equal(result.details.length, 2);
    assert.match(result.details[0]!, /Test\/Unit9 2024\.7\.10\.1, frame 2026/);
    assert.match(result.details[1]!, /Test\/Unit8, Test\/Unit9$/);
  });

  it("is quiet when the parts agree", () => {
    const result = partVersions([
      part("frame", "2026.9.18.82", flags("A", "B")),
      part("core", "2026.9.18.82", flags("A", "B")),
    ]);
    assert.deepEqual(result, {
      versionNumber: "2026.9.18.82",
      featureFlags: flags("A", "B"),
      warnings: [],
      details: [],
    });
  });
});

describe("typeVersionWarnings", () => {
  const GRABBABLE = "[FrooxEngine]FrooxEngine.Grabbable";
  const withType = (label: string, typeVersion: number | null) => {
    const p = part(label, "2026.9.18.82", flags());
    p.doc.addComponent(p.doc.root(), GRABBABLE, typeVersion, []);
    return p;
  };

  it("lists the parts whose entry differs from the output's", () => {
    const output = withType("output", 2).doc;
    assert.deepEqual(
      typeVersionWarnings(output, [
        withType("core", 2),
        withType("Test/A", null),
        withType("Test/B", 1),
        part("Test/C", "2026.9.18.82", flags()),
      ]).warnings,
      [`TypeVersion of ${GRABBABLE} is 2 in the output but differs in: Test/A 0, Test/B 1`],
    );
  });

  it("is quiet when the entries match", () => {
    assert.deepEqual(
      typeVersionWarnings(withType("output", null).doc, [withType("core", null)])
        .warnings,
      [],
    );
  });
});

describe("generateClient versions", () => {
  const client = (
    units: Record<string, Document>,
    versionSource?: VersionSource,
  ) =>
    generateClient({
      appCode: "TestApp",
      hostCVPath: "",
      useSSLCVPath: "",
      cvOwnerId: "",
      fallbackHost: "",
      fallbackUseSSL: false,
      currentVersion: "1",
      hostAccessReason: { ja: "", en: "", ko: "" },
      resetOnSave: true,
      units: { Test: units },
      generateFrame: generateSimpleFrame,
      versionSource,
    });
  const config = generateUnitConfig({
    code: "Test/Panel",
    propsConfig: { size: UnitProp.Float(1) },
  });

  it("units without feedback do not change the output's version", () => {
    const withUnit = client({ Panel: generateMirrorUnitFromFeedback({ config }) });
    const without = client({});
    assert.equal(withUnit.versionNumber(), without.versionNumber());
    assert.deepEqual(withUnit.featureFlags(), without.featureFlags());
  });

  it("an older unit feedback sets the output's version and flags", () => {
    const saved = generateMirrorUnitFromFeedback({ config });
    saved.setVersionNumber("2025.12.1.1");
    saved.setFeatureFlags(saved.featureFlags().slice(0, 3));
    const output = client({
      Panel: generateMirrorUnitFromFeedback({ config, rawFeedback: saved }),
    });
    assert.equal(output.versionNumber(), "2025.12.1.1");
    assert.deepEqual(output.featureFlags(), saved.featureFlags());
  });

  it('versionSource "frame" keeps the frame\'s version and flags', () => {
    const saved = generateMirrorUnitFromFeedback({ config });
    saved.setVersionNumber("2025.12.1.1");
    saved.setFeatureFlags(saved.featureFlags().slice(0, 3));
    const unit = generateMirrorUnitFromFeedback({ config, rawFeedback: saved });
    const frame = client({}, "frame");
    const output = client({ Panel: unit }, "frame");
    assert.notEqual(output.versionNumber(), "2025.12.1.1");
    assert.equal(output.versionNumber(), frame.versionNumber());
    assert.deepEqual(output.featureFlags(), frame.featureFlags());
    // The default is unchanged.
    assert.equal(client({ Panel: unit }).versionNumber(), "2025.12.1.1");
  });
});

describe('partVersions with "frame"', () => {
  it("returns the first part's version and flags as they are", () => {
    const result = partVersions(
      [
        part("frame", "2026.9.18.82", flags("A", ["B", 2])),
        part("core", "2026.8.1.10", flags("A", ["B", 1], "C")),
        part("Test/Unit", "2026.9.1.5", flags(["B", 2])),
      ],
      "frame",
    );
    assert.equal(result.versionNumber, "2026.9.18.82");
    assert.deepEqual(result.featureFlags, flags("A", ["B", 2]));
    assert.deepEqual(result.warnings, [
      "FeatureFlag A is kept from the frame but is missing in: Test/Unit",
      "FeatureFlag B is the frame's (2) in the output but differs in: core 1",
      "FeatureFlag C is left out because the frame does not have it: core",
    ]);
  });

  it("names the frame's version when parts are far apart", () => {
    const result = partVersions(
      [
        part("frame", "2026.9.18.82", flags()),
        part("Test/Unit", "2026.1.2.3", flags()),
      ],
      "frame",
    );
    assert.equal(result.versionNumber, "2026.9.18.82");
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0]!, /the output uses the frame's \(2026\.9\.18\.82\)/);
  });
});

