import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { compare, type Document } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { assetPath } from "../src/assets.js";
import { readFeedback } from "../src/feedback/feedbackFile.js";
import { str } from "../src/frdt/util.js";
import {
  generateClient,
  generateInstallFrame,
  generateInstallFrameFromFeedback,
  generateMirrorUnitFromFeedback,
  generateSimpleFrame,
  generateSimpleFrameFromFeedback,
  parentOf,
  placeCore,
  type GenerateFrame,
} from "../src/index.js";

const client = (generateFrame: GenerateFrame): Document => {
  const output = generateClient({
    appCode: "TestApp",
    hostCVPath: "",
    useSSLCVPath: "",
    cvOwnerId: "",
    fallbackHost: "",
    fallbackUseSSL: false,
    currentVersion: "1",
    hostAccessReason: { ja: "", en: "", ko: "" },
    resetOnSave: true,
    units: {
      Test: {
        Panel: generateMirrorUnitFromFeedback({
          config: generateUnitConfig({
            code: "Test/Panel",
            propsConfig: { size: UnitProp.Float(1) },
          }),
        }),
      },
    },
    generateFrame,
  });
  output.renumberIds(0);
  return output;
};

const SIMPLE = assetPath("frame/simpleFrame/ResFeedback.brson");
const INSTALL = assetPath("frame/installFrame/ResFeedback.brson");

describe("frames from your own feedback", () => {
  it("generateSimpleFrameFromFeedback(path) builds what generateSimpleFrame builds", () => {
    assert.deepEqual(
      compare(client(generateSimpleFrame), client(generateSimpleFrameFromFeedback(SIMPLE))),
      [],
    );
  });

  it("generateInstallFrameFromFeedback(path) builds what generateInstallFrame builds", () => {
    assert.deepEqual(
      compare(client(generateInstallFrame), client(generateInstallFrameFromFeedback(INSTALL))),
      [],
    );
  });

  it("takes a file URL", () => {
    assert.deepEqual(
      compare(client(generateSimpleFrame), client(generateSimpleFrameFromFeedback(pathToFileURL(SIMPLE)))),
      [],
    );
  });

  it("takes a Document, leaves it unchanged, and can build twice", () => {
    const feedback = readFeedback(SIMPLE);
    feedback.renumberIds(0);
    const before = feedback.writeBrson();
    const generateFrame = generateSimpleFrameFromFeedback(feedback);
    const first = client(generateFrame);
    const second = client(generateFrame);
    assert.ok(feedback.writeBrson().equals(before));
    assert.deepEqual(compare(first, second), []);
    assert.deepEqual(compare(client(generateSimpleFrame), first), []);
  });

  it("placeCore and parentOf build a custom frame", () => {
    const custom: GenerateFrame = ({ appCode, core, env }) => {
      const frame = readFeedback(SIMPLE);
      frame.root().set("Name", str(appCode));
      return placeCore(frame, { core, env }, (placeholder) => {
        const parent = parentOf(frame, placeholder);
        if (!parent) throw new Error("no parent");
        return parent;
      });
    };
    assert.deepEqual(compare(client(generateSimpleFrame), client(custom)), []);
  });
});
