import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { assetPath } from "../src/assets.js";
import {
  readFeedback,
  readFeedbackIfExists,
  writeFeedback,
} from "../src/feedback/feedbackFile.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

describe("feedback files (.brson)", () => {
  it("bundled parts are readable Resonite objects", () => {
    for (const part of [
      "core/ResFeedback.brson",
      "frame/simpleFrame/ResFeedback.brson",
      "frame/installFrame/ResFeedback.brson",
      "unit/emptyFeedback.brson",
    ]) {
      const context = readFeedback(assetPath(part));
      assert.equal(typeof context.VersionNumber, "string", part);
    }
  });

  it("writeFeedback and readFeedback round-trip", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mirage-x-"));
    try {
      const file = path.join(dir, "ResFeedback.brson");
      const original = readFeedback(assetPath("unit/emptyFeedback.brson"));
      writeFeedback(file, original);
      assert.deepEqual(readFeedback(file), original);
      assert.deepEqual(readFeedbackIfExists(file), original);
      assert.equal(
        readFeedbackIfExists(path.join(dir, "missing.brson")),
        undefined,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a unit without feedback starts from the empty template", () => {
    const config = generateUnitConfig({
      code: "Test/NoFeedback",
      propsConfig: { size: UnitProp.Float(1) },
    });
    const unit = generateMirrorUnitFromFeedback({
      config,
      rawFeedback: readFeedbackIfExists("does-not-exist.brson"),
    });
    assert.equal(unit.object.name.asPrimitive(), "Test/NoFeedback");
  });
});
