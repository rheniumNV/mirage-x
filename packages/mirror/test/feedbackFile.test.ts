import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { compare } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import { assetPath } from "../src/assets.js";
import {
  readFeedback,
  readFeedbackIfExists,
  writeFeedback,
  writeFeedbackIfChanged,
} from "../src/feedback/feedbackFile.js";
import { requireChild, requireReference } from "../src/frdt/util.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

describe("feedback files (.brson)", () => {
  it("bundled parts open as Resonite documents", () => {
    for (const part of [
      "core/ResFeedback.brson",
      "frame/simpleFrame/ResFeedback.brson",
      "frame/installFrame/ResFeedback.brson",
    ]) {
      const doc = readFeedback(assetPath(part));
      assert.match(doc.versionNumber(), /^\d+\.\d+\.\d+/, part);
      assert.ok(doc.slotCount() > 0, part);
    }
  });

  it("writeFeedback and readFeedback round-trip", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mirage-x-"));
    try {
      const file = path.join(dir, "ResFeedback.brson");
      const original = readFeedback(assetPath("frame/simpleFrame/ResFeedback.brson"));
      writeFeedback(file, original);
      assert.deepEqual(compare(readFeedback(file), original), []);
      assert.ok(readFeedbackIfExists(file));
      assert.equal(
        readFeedbackIfExists(path.join(dir, "missing.brson")),
        undefined,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a unit without feedback starts with an empty Main", () => {
    const config = generateUnitConfig({
      code: "Test/NoFeedback",
      propsConfig: { size: UnitProp.Float(1) },
    });
    const unit = generateMirrorUnitFromFeedback({
      config,
      rawFeedback: readFeedbackIfExists("does-not-exist.brson"),
    });
    assert.equal(unit.root().name(), "Test/NoFeedback");
    // Nothing in it was saved by Resonite: it takes the core's version.
    const core = readFeedback(assetPath("core/ResFeedback.brson"));
    assert.equal(unit.versionNumber(), core.versionNumber());
    assert.deepEqual(unit.featureFlags(), core.featureFlags());
    const ref = unit.slotById(
      requireReference(requireChild(unit.root(), "DV"), "Static.Ref"),
    );
    const main = requireChild(ref, "Main");
    const dvStatic = requireChild(ref, "DV/Static");
    assert.equal(requireReference(dvStatic, "Static.Main"), main.id());
    assert.equal(requireReference(dvStatic, "Static.ChildrenParent"), main.id());
  });

  it("writeFeedbackIfChanged writes only when the content changes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mirage-x-"));
    try {
      const file = path.join(dir, "ResFeedback.brson");
      const template = () =>
        readFeedback(assetPath("frame/simpleFrame/ResFeedback.brson"));
      assert.equal(writeFeedbackIfChanged(file, template()), true);
      // Same content (ids may differ): not written again.
      assert.equal(writeFeedbackIfChanged(file, template()), false);

      const changed = template();
      changed.root().set("Name", { kind: "string", value: "Changed" });
      assert.equal(writeFeedbackIfChanged(file, changed), true);
      assert.equal(readFeedback(file).root().name(), "Changed");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
