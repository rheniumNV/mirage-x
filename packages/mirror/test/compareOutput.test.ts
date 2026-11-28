import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { Document, type Slot } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { assetPath } from "../src/assets.js";
import {
  addValueVariable,
  childNamed,
  setVariableValues,
  str,
  stringOf,
} from "../src/frdt/util.js";
import { compareOutput } from "../src/compareOutput.js";
import {
  VERSION_VARIABLE,
  mirageXEnvSlots,
  setAppVersion,
} from "../src/frame/env.js";
import {
  generateSimpleFrame,
  generateSimpleFrameFromFeedback,
} from "../src/frame/simpleFrame/index.js";
import { generateClient } from "../src/generateClient.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const output = (
  currentVersion: string,
  size = 1,
  generateFrame = generateSimpleFrame,
) =>
  generateClient({
    appCode: "TestApp",
    hostCVPath: "",
    useSSLCVPath: "",
    cvOwnerId: "",
    fallbackHost: "localhost:3100",
    fallbackUseSSL: false,
    currentVersion,
    hostAccessReason: { ja: "", en: "", ko: "" },
    resetOnSave: true,
    units: {
      Test: {
        Panel: generateMirrorUnitFromFeedback({
          config: generateUnitConfig({
            code: "Test/Panel",
            propsConfig: { size: UnitProp.Float(size) },
          }),
        }),
      },
    },
    generateFrame,
  });

/** A frame whose `DV` already holds another app's ENV (before MirageX's). */
const frameWithForeignEnv = () => {
  const frame = Document.open(
    fs.readFileSync(assetPath("frame/simpleFrame/ResFeedback.brson")),
  );
  const dv = childNamed(frame.root(), "DV");
  assert.ok(dv);
  const env = frame.addSlot(dv, "ENV");
  addValueVariable(frame, env, VERSION_VARIABLE, str("foreign"));
  return generateSimpleFrameFromFeedback(frame);
};

/** The app version in `slot`'s ENV variables. */
const versionOf = (slot: Slot) =>
  slot
    .components()
    .map((_, i) => ({
      name: stringOf(slot.tryComponentValue(i, "VariableName")),
      value: stringOf(slot.tryComponentValue(i, "Value")),
    }))
    .find(({ name }) => name === VERSION_VARIABLE)?.value;

describe("compareOutput", () => {
  it("ignores the app version and ids", () => {
    assert.deepEqual(compareOutput(output("1"), output("2")), []);
  });

  it("reports other differences", () => {
    const changed = output("1");
    setVariableValues(changed, "Env.AppCode", str("Other"), (s) => s.name() === "ENV");
    const differences = compareOutput(output("1"), changed);
    assert.ok(differences.length > 0);
    assert.ok(differences.every((d) => d.right === '"Other"'));
  });

  it("compares the version of another app's ENV", () => {
    const withEmbedded = (version: string) => {
      const doc = output("1");
      const env = doc.addSlot(doc.addSlot(doc.root(), "Embedded"), "ENV");
      addValueVariable(doc, env, "Env.Version.Current", str(version));
      return doc;
    };
    const differences = compareOutput(withEmbedded("a"), withEmbedded("b"));
    assert.equal(differences.length, 1);
  });

  it("finds the frame's and the core's ENV", () => {
    assert.equal(mirageXEnvSlots(output("1")).length, 2);
  });

  it("finds MirageX's ENV, not another app's placed first in the DV", () => {
    const doc = output("1", 1, frameWithForeignEnv());
    const slots = mirageXEnvSlots(doc);
    assert.equal(slots.length, 2);
    assert.deepEqual(slots.map(versionOf), ["1", "1"]);

    assert.deepEqual(setAppVersion(doc, "2"), { envSlots: 2, updated: 2 });
    const dv = childNamed(doc.root(), "DV");
    assert.ok(dv);
    const envs = dv.children().filter((child) => child.name() === "ENV");
    assert.deepEqual(envs.map(versionOf), ["foreign", "2"]);
  });

  it("does not change the documents it compares", () => {
    const doc = output("7");
    doc.renumberIds(0);
    const before = doc.writeBrson();
    compareOutput(doc, output("8"));
    assert.ok(doc.writeBrson().equals(before));
  });
});
