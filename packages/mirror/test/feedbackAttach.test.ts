import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { Document, compare, type Slot } from "@frdt/frdt";
import { UnitProp, generateUnitConfig } from "@mirage-x/core";

import {
  attachCore,
  attachInstallFrame,
  attachSimpleFrame,
} from "../src/feedback/attachCoreAndFrames.js";
import { attachUnits } from "../src/feedback/attachUnits.js";
import { readFeedback } from "../src/feedback/feedbackFile.js";
import { sanitizeFeedback } from "../src/feedback/sanitize.js";
import { STAGED_FEEDBACK, STAGED_META } from "../src/feedback/staging.js";
import {
  allSlots,
  childNamed,
  importSlots,
  parentOf,
  referenceOf,
  requireChild,
  requireReference,
  setVariableValues,
  stringOf,
  str,
  bool,
} from "../src/frdt/util.js";
import { generateInstallFrame } from "../src/frame/installFrame/index.js";
import { generateSimpleFrame } from "../src/frame/simpleFrame/index.js";
import { generateClient, type GenerateFrame } from "../src/generateClient.js";
import { generateMirrorUnitFromFeedback } from "../src/unit/generateMirrorUnitFromFeedback.js";

const unit = (code: string) =>
  generateMirrorUnitFromFeedback({
    config: generateUnitConfig({
      code,
      propsConfig: { size: UnitProp.Float(1) },
    }),
  });

/** What a feedback saved from a running client looks like. */
const savedClient = (
  generateFrame: GenerateFrame = generateSimpleFrame,
): Document => {
  const doc = generateClient({
    appCode: "TestApp",
    hostCVPath: "",
    useSSLCVPath: "",
    cvOwnerId: "",
    fallbackHost: "localhost:3100",
    fallbackUseSSL: false,
    currentVersion: "1",
    hostAccessReason: { ja: "", en: "", ko: "" },
    resetOnSave: true,
    units: { Test: { Panel: unit("Test/Panel"), Other: unit("Test/Other") } },
    generateFrame,
  });
  // Saved from a local session (the bundled assets may already be clean).
  setVariableValues(doc, "Static.Web.Host", str("localhost:3100"));
  return doc;
};

const META = JSON.stringify({ id: "R-1", creationTime: "2026-01-01" });

const dirs: string[] = [];
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mirage-x-feedback-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A staging directory holding `doc` as the fetched feedback. */
const staged = (doc: Document) => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, STAGED_FEEDBACK), doc.writeBrson());
  fs.writeFileSync(path.join(dir, STAGED_META), META);
  return dir;
};

const names = (slot: Slot) => slot.children().map((child) => child.name());

const variableValues = (doc: Document, name: string) =>
  allSlots(doc.root()).flatMap((slot) =>
    slot.components().flatMap((_, i) =>
      stringOf(slot.tryComponentValue(i, "VariableName")) === name
        ? [stringOf(slot.tryComponentValue(i, "Value"))]
        : [],
    ),
  );

describe("feedback attach", () => {
  it("attachCore keeps AppRoot/Main without ENV and units", () => {
    const input = staged(savedClient());
    const output = tempDir();
    attachCore({ inputPath: input, outputPath: output });

    const core = readFeedback(path.join(output, "ResFeedback.brson"));
    const root = core.root();
    assert.equal(root.name(), "AppRoot");
    assert.deepEqual(names(root), ["Main"]);
    const main = requireChild(root, "Main");
    assert.equal(childNamed(requireChild(main, "DV"), "ENV"), undefined);
    assert.deepEqual(names(requireChild(main, "Package")), []);
    // The local host is cleared on attach.
    assert.deepEqual(
      [...new Set(variableValues(core, "Static.Web.Host").filter((v) => v !== null))],
      [""],
    );
    // Pointed at the frame it was saved in, which is not part of the core.
    assert.equal(referenceOf(root, "Static.FrameRoot"), null);
    assert.equal(
      fs.readFileSync(path.join(output, "ResFeedbackMeta.json"), "utf-8"),
      META,
    );
  });

  it("attachSimpleFrame removes the core and ENV; other frames are skipped", () => {
    const input = staged(savedClient());
    const simple = tempDir();
    attachSimpleFrame({ inputPath: input, outputPath: simple });

    const frame = readFeedback(path.join(simple, "ResFeedback.brson"));
    const root = frame.root();
    assert.equal(root.name(), "TestApp");
    assert.equal(childNamed(requireChild(root, "DV"), "ENV"), undefined);
    const appRoot = frame.slotById(requireReference(root, "Static.AppRoot"));
    assert.equal(childNamed(appRoot, "Main"), undefined);

    const install = tempDir();
    attachInstallFrame({ inputPath: input, outputPath: install });
    assert.deepEqual(fs.readdirSync(install), []);
  });

  it("attachInstallFrame removes the core and ENV; other frames are skipped", () => {
    const input = staged(savedClient(generateInstallFrame));
    const install = tempDir();
    attachInstallFrame({ inputPath: input, outputPath: install });

    const frame = readFeedback(path.join(install, "ResFeedback.brson"));
    const root = frame.root();
    assert.equal(root.name(), "TestAppRoot");
    assert.equal(childNamed(requireChild(root, "DV"), "ENV"), undefined);
    const appRoot = frame.slotById(requireReference(root, "Static.AppRoot"));
    assert.equal(appRoot.name(), "AppRoot");
    assert.equal(childNamed(appRoot, "Main"), undefined);
    assert.ok(
      variableValues(frame, "Static.Web.Host").every((v) => v === null || v === ""),
    );

    const simple = tempDir();
    attachSimpleFrame({ inputPath: input, outputPath: simple });
    assert.deepEqual(fs.readdirSync(simple), []);
  });

  it("attachUnits writes the matching units, once", () => {
    const input = staged(savedClient());
    const unitsRoot = tempDir();
    for (const name of ["Panel", "Other", "Missing"]) {
      fs.mkdirSync(path.join(unitsRoot, "Test", name), { recursive: true });
    }

    attachUnits({ feedbackDir: input, unitsRoot, matchPattern: "Test/(Panel|Missing)" });
    const panelFile = path.join(unitsRoot, "Test/Panel/ResFeedback.brson");
    const panel = readFeedback(panelFile);
    assert.equal(panel.root().name(), "Test/Panel");
    assert.deepEqual(fs.readdirSync(path.join(unitsRoot, "Test/Other")), []);
    assert.deepEqual(fs.readdirSync(path.join(unitsRoot, "Test/Missing")), []);

    // The same feedback again: the file is left as it is.
    const before = fs.readFileSync(panelFile);
    fs.rmSync(path.join(unitsRoot, "Test/Panel/ResFeedbackMeta.json"));
    attachUnits({ feedbackDir: input, unitsRoot, matchPattern: "Test/Panel" });
    assert.ok(fs.readFileSync(panelFile).equals(before));
    assert.equal(
      fs.existsSync(path.join(unitsRoot, "Test/Panel/ResFeedbackMeta.json")),
      false,
    );

    // The attached unit builds again.
    const config = generateUnitConfig({
      code: "Test/Panel",
      propsConfig: { size: UnitProp.Float(1) },
    });
    assert.equal(
      generateMirrorUnitFromFeedback({ config, rawFeedback: panel }).root().name(),
      "Test/Panel",
    );
  });

  it("a feedback wrapped in a Holder gives the same parts", () => {
    const client = savedClient();
    const holder = Document.empty(
      "Holder",
      client.versionNumber(),
      client.featureFlags(),
    );
    importSlots(holder, holder.root(), [client.root()]);

    const plain = tempDir();
    const wrapped = tempDir();
    attachCore({ inputPath: staged(client), outputPath: plain });
    attachCore({ inputPath: staged(holder), outputPath: wrapped });
    assert.deepEqual(
      compare(
        readFeedback(path.join(plain, "ResFeedback.brson")),
        readFeedback(path.join(wrapped, "ResFeedback.brson")),
      ),
      [],
    );
  });

  it("parts are written with stable ids", () => {
    const write = () => {
      const output = tempDir();
      attachCore({ inputPath: staged(savedClient()), outputPath: output });
      return fs.readFileSync(path.join(output, "ResFeedback.brson"));
    };
    assert.ok(write().equals(write()));
  });
});

describe("sanitizeFeedback", () => {
  it("clears the local host and debug URLs", () => {
    const doc = savedClient();
    const ws = allSlots(doc.root()).find((slot) => slot.name() === "WS");
    assert.ok(ws);
    const client = ws.components().findIndex(({ typeName }) =>
      typeName === "[FrooxEngine]FrooxEngine.WebsocketClient",
    );
    ws.setComponentValue(client, "URL", str("ws://localhost:3100/"));
    ws.setComponentValue(client, "IsConnected", bool(true));

    assert.ok(variableValues(doc, "Static.Web.Host").includes("localhost:3100"));
    assert.ok(sanitizeFeedback(doc) > 0);

    for (const name of ["Static.Web.Host", "Env.Host.Fallback"]) {
      const values = variableValues(doc, name).filter((v) => v !== null);
      assert.ok(values.length > 0, name);
      assert.deepEqual([...new Set(values)], [""], name);
    }
    assert.deepEqual(ws.componentValue(client, "URL"), str(""));
    assert.deepEqual(ws.componentValue(client, "IsConnected"), bool(false));
    // Other values are left alone.
    assert.deepEqual(variableValues(doc, "Env.Version.Current"), ["1", "1"]);
  });
});

describe("parentOf", () => {
  it("finds the parent from the tree, not from ParentReference", () => {
    const doc = Document.empty("Root", "2025.1.1", []);
    const a = doc.addSlot(doc.root(), "A");
    const b = doc.addSlot(a, "B");
    // A file saved by Resonite: ParentReference is not the parent's id.
    b.set("ParentReference", str("00004aa8-0000-0000-0000-000000000000"));
    assert.equal(parentOf(doc, b)?.id(), a.id());
    assert.equal(parentOf(doc, a)?.id(), doc.root().id());
    assert.equal(parentOf(doc, doc.root()), undefined);
  });
});
