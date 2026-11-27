import { createContext, type ReactElement } from "react";
import Reconciler from "react-reconciler";
import {
  DefaultEventPriority,
  LegacyRoot,
  NoEventPriority,
} from "react-reconciler/constants.js";

/**
 * A renderer with no host output. Units report their changes from effects
 * (see `generateMain`), so React only has to run the components; every host
 * hook here is a no-op.
 */

const emptyObject = {};
Object.freeze(emptyObject);

type DummyInstance = object;
const dummyInstance: DummyInstance = {};

type DummyTextInstance = object;
const dummyTextInstance: DummyTextInstance = {};

type DummyContext = object;

let currentUpdatePriority: number = NoEventPriority;

const TinyDOMRenderer = Reconciler({
  rendererPackageName: "@mirage-x/server",
  rendererVersion: "0.0.0",
  extraDevToolsConfig: null,
  bindToConsole: (methodName: string, args: unknown[]) =>
    (console[methodName as "log"] as (...a: unknown[]) => void).bind(
      console,
      ...args,
    ),

  supportsMutation: false,
  supportsHydration: false,
  supportsPersistence: false,
  isPrimaryRenderer: true,

  createInstance: (
    _type: string,
    _props: object,
    _rootContainer: DummyInstance,
    _hostContext: DummyContext,
  ) => dummyInstance,
  createTextInstance: () => dummyTextInstance,
  finalizeInitialChildren: () => false,
  appendInitialChild: () => {},
  shouldSetTextContent: () => false,
  getRootHostContext: () => emptyObject,
  getChildHostContext: () => emptyObject,
  getPublicInstance: (ins: DummyInstance) => ins,
  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  preparePortalMount: () => {},
  clearContainer: () => {},
  detachDeletedInstance: () => {},

  scheduleTimeout: () => {},
  cancelTimeout: () => {},
  noTimeout: -1,

  getInstanceFromNode: () => null,
  getInstanceFromScope: () => dummyInstance,
  prepareScopeUpdate: () => {},
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},

  // Update priority (React 19).
  setCurrentUpdatePriority: (priority: number) => {
    currentUpdatePriority = priority;
  },
  getCurrentUpdatePriority: () => currentUpdatePriority,
  resolveUpdatePriority: () =>
    currentUpdatePriority !== NoEventPriority
      ? currentUpdatePriority
      : DefaultEventPriority,
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  trackSchedulerEvent: () => {},
  shouldAttemptEagerTransition: () => false,
  requestPostPaintCallback: () => {},

  // Transitions and forms (React 19). Not used by MirageX.
  NotPendingTransition: null,
  HostTransitionContext: createContext(null),
  resetFormInstance: () => {},

  // Suspending a commit (React 19). Nothing to wait for here.
  maySuspendCommit: () => false,
  maySuspendCommitOnUpdate: () => false,
  maySuspendCommitInSyncRender: () => false,
  preloadInstance: () => true,
  startSuspendingCommit: () => null,
  suspendInstance: () => {},
  suspendOnActiveViewTransition: () => {},
  waitForCommitToBeReady: () => null,
  getSuspendedCommitReason: () => null,
});

export const DummyReactRenderer = {
  render(element: ReactElement) {
    const logError = (err: unknown) => {
      console.error(err);
    };
    const newRoot = TinyDOMRenderer.createContainer(
      dummyInstance,
      LegacyRoot,
      null,
      // Not strict: React 19 would mount every effect twice in development,
      // and units emit their sync events from effects.
      false,
      null,
      "",
      logError,
      logError,
      logError,
      () => {},
      null,
    );
    TinyDOMRenderer.updateContainer(element, newRoot, null);
    return newRoot;
  },
};
