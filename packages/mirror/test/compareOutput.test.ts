import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { compareOutput } from "../src/compareOutput.js";
import { setVariableValues, str } from "../src/frdt/util.js";
import { generateSimpleFrame } from "../src/frame/simpleFrame/index.js";
import { generateClient } from "../src/generateClient.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const output = (currentVersion: string, size = 1) =>
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
    generateFrame: generateSimpleFrame,
  });

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

  it("does not change the documents it compares", () => {
    const doc = output("7");
    doc.renumberIds(0);
    const before = doc.writeBrson();
    compareOutput(doc, output("8"));
    assert.ok(doc.writeBrson().equals(before));
  });
});
