import { createContext, type ReactElement } from "react";
import Reconciler from "react-reconciler";
import {
  DiscreteEventPriority,
  ConcurrentRoot,
  NoEventPriority,
} from "react-reconciler/constants.js";

/**
 * A renderer with no host output. Units report their changes from effects
 * (see `generateMain`), so React only has to run the components; every host
 * hook here is a no-op.
 *
 * MirageX renders synchronously: when `render()` or `flushSync()` returns,
 * the tree has been rendered and its effects have run (so the sync events have
 * been emitted and the props setter is registered). React 18's legacy root
 * rendered synchronously but ran effects later; React 19 has no legacy mode
 * (react-reconciler 0.31+ treats every root as concurrent and schedules
 * renders), so:
 * - `render()` uses `updateContainerSync` + `flushSyncWork`;
 * - every update that is not a transition gets the discrete (sync) priority,
 *   including updates made in effects. React renders those in a microtask
 *   (`scheduleMicrotask`) and runs their effects right after the commit;
 * - `flushSync(fn)` renders the updates made in `fn` before it returns, unless
 *   it is called while React is rendering or committing (then they are
 *   rendered at the end of that work).
 *
 * Transitions (`startTransition`, `useDeferredValue`) and Suspense retries
 * are still scheduled.
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
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,
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
  // Every update is a discrete (sync) update, even inside effects (which React
  // runs at the default priority); see the comment at the top. Transitions
  // take their own lanes and do not ask for this.
  resolveUpdatePriority: () => DiscreteEventPriority,
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
      // Ignored since react-reconciler 0.31: every root is concurrent.
      ConcurrentRoot,
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
    TinyDOMRenderer.updateContainerSync(element, newRoot, null, null);
    TinyDOMRenderer.flushSyncWork();
    return newRoot;
  },

  /** Run `fn` and render the updates it made before returning. */
  flushSync<R>(fn: () => R): R {
    return TinyDOMRenderer.flushSyncFromReconciler(fn);
  },
};
