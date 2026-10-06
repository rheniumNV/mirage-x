import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { Document, summarize } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { build, type BuildConfig } from "../src/build.js";
import { addValueVariable } from "../src/frdt/util.js";
import { generateSimpleFrame } from "../src/frame/simpleFrame/index.js";
import { generateClient } from "../src/generateClient.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const unitsWith = (propsConfig: Parameters<typeof generateUnitConfig>[0]["propsConfig"]) => ({
  Test: {
    Panel: generateMirrorUnitFromFeedback({
      config: generateUnitConfig({ code: "Test/Panel", propsConfig }),
    }),
  },
});

const dirs: string[] = [];
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mirage-x-build-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const configFor = (outputPath: string): BuildConfig => ({
  appCode: "TestApp",
  cv: {
    mirage: {
      host: { path: "", ownerId: "", fallback: "localhost:3100" },
      useSsl: { path: "", fallback: false },
    },
  },
  outputPath,
});

const versionsIn = (file: string) =>
  summarize(fs.readFileSync(file))
    .dynamicVariables.filter((v) => v.variableName === "Env.Version.Current")
    .map((v) => (v.value?.kind === "string" ? v.value.value : undefined));

describe("build", () => {
  it("writes the same bytes for the same inputs", () => {
    const write = () => {
      const doc: Document = generateClient({
        appCode: "TestApp",
        hostCVPath: "",
        useSSLCVPath: "",
        cvOwnerId: "",
        fallbackHost: "localhost:3100",
        fallbackUseSSL: false,
        currentVersion: "1",
        hostAccessReason: { ja: "", en: "", ko: "" },
        resetOnSave: true,
        units: unitsWith({ size: UnitProp.Float(1) }),
        generateFrame: generateSimpleFrame,
      });
      doc.renumberIds(0);
      return doc.writeBrson();
    };
    assert.ok(write().equals(write()));
  });

  it("writes output.brson and version.json only, then reports no change", async () => {
    const dir = tempDir();
    const units = () => unitsWith({ size: UnitProp.Float(1) });

    const first = await build(configFor(dir), units(), generateSimpleFrame);
    assert.equal(first.changed, true);
    assert.deepEqual(fs.readdirSync(dir).sort(), ["output.brson", "version.json"]);
    const bytes = fs.readFileSync(path.join(dir, "output.brson"));
    assert.deepEqual(versionsIn(path.join(dir, "output.brson")), [
      first.version,
      first.version,
    ]);

    const second = await build(configFor(dir), units(), generateSimpleFrame);
    assert.deepEqual(second, { changed: false, version: first.version });
    assert.ok(fs.readFileSync(path.join(dir, "output.brson")).equals(bytes));
  });

  it("detects a change in a unit definition and bumps the version", async () => {
    const dir = tempDir();
    const first = await build(
      configFor(dir),
      unitsWith({ size: UnitProp.Float(1) }),
      generateSimpleFrame,
    );
    await new Promise((resolve) => setTimeout(resolve, 5)); // a new timestamp

    const second = await build(
      configFor(dir),
      unitsWith({ size: UnitProp.Float(1), label: UnitProp.String("") }),
      generateSimpleFrame,
    );
    assert.equal(second.changed, true);
    assert.notEqual(second.version, first.version);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(dir, "version.json"), "utf-8")).version,
      second.version,
    );
    assert.deepEqual(versionsIn(path.join(dir, "output.brson")), [
      second.version,
      second.version,
    ]);
  });

  it("updates the version only in MirageX's ENV slots", async () => {
    const dir = tempDir();
    // A unit with its own variable of the same name.
    const unitsWithOwnVersion = () => {
      const units = unitsWith({ size: UnitProp.Float(1) });
      const unit = units.Test.Panel;
      addValueVariable(unit, unit.root(), "Env.Version.Current", {
        kind: "string",
        value: "unit-own",
      });
      return units;
    };
    await build(configFor(dir), unitsWithOwnVersion(), generateSimpleFrame);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await build(
      configFor(dir),
      { ...unitsWithOwnVersion(), Extra: unitsWith({}).Test },
      generateSimpleFrame,
    );
    assert.equal(second.changed, true);
    const values = versionsIn(path.join(dir, "output.brson"));
    assert.equal(values.filter((v) => v === second.version).length, 2);
    assert.ok(values.includes("unit-own"));
  });
});
