import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { useMainRootContext } from "../../main/index.js";
import {
  isMirrorRef,
  useMirrorRefSnapshot,
  type MirrorRef,
  type MirrorRefBindMeta,
} from "../../common/useMirrorRef.js";
import {
  type DetailBase,
  type UnitConfig,
  type getMainProps,
} from "../common/index.js";

export const UnitContext = createContext<{ id: string }>({ id: "root" });

const useUnitId = () => useMemo(() => uuidv4(), []);

const solveProp = <C extends DetailBase>(
  propConfig: UnitConfig<C>["syncPropConfigList"][number],
  value: unknown,
  functionSolver: (func: (...args: unknown[]) => unknown) => string,
): {
  key: string;
  type: string;
  value: unknown;
  option: unknown;
} => {
  switch (propConfig.type) {
    case "Function":
      return {
        key: propConfig.name,
        type: propConfig.type,
        value: functionSolver(value as (...args: unknown[]) => unknown),
        option: {},
      };
    case "Enum":
      return {
        key: propConfig.name,
        type: propConfig.type,
        value:
          typeof value === "string"
            ? (propConfig.enumKeys?.indexOf(value) ?? value)
            : value,
        option: { enum: propConfig.enumType },
      };
    case "Reference": {
      if (isMirrorRef(value)) {
        return {
          key: propConfig.name,
          type: "Reference",
          value: value.getUnitId(),
          option: value.getOption(),
        };
      }
      return {
        key: propConfig.name,
        type: "Reference",
        value: typeof value === "string" ? value : "",
        option: { refType: "RootSlot" },
      };
    }
    default:
      return {
        key: propConfig.name,
        type: propConfig.type,
        value: value ?? "",
        option: {},
      };
  }
};

const useSyncProp = <C extends DetailBase>(
  unitId: string,
  value: unknown,
  propConfig: UnitConfig<C>["syncPropConfigList"][number],
  defaultValue: unknown,
) => {
  const { eventEmitter, functionMap } = useMainRootContext();
  const functionIdRef = useRef<string | undefined>(undefined);
  const isFirstTimeRef = useRef(true);
  const prevValueRef = useRef<unknown>(defaultValue);

  const mirrorRef =
    propConfig.type === "Reference" ? (value as MirrorRef | null) : null;
  const referenceSnapshot = useMirrorRefSnapshot(mirrorRef);
  const resolvedValue =
    propConfig.type === "Reference" ? referenceSnapshot : value;

  useEffect(() => {
    if (!eventEmitter || !functionMap) {
      return;
    }

    if (isFirstTimeRef.current) {
      isFirstTimeRef.current = false;
      const unboundReference =
        propConfig.type === "Reference" &&
        (resolvedValue === "" ||
          (typeof resolvedValue === "string" &&
            resolvedValue.startsWith("|")));
      if (
        unboundReference ||
        resolvedValue === defaultValue ||
        (Array.isArray(resolvedValue) &&
          `${resolvedValue}` === `${defaultValue}`)
      ) {
        return;
      }
    }

    if (
      Array.isArray(resolvedValue) &&
      `${resolvedValue}` === `${prevValueRef.current}`
    ) {
      return;
    }
    if (resolvedValue === prevValueRef.current) {
      return;
    }
    prevValueRef.current = resolvedValue;

    const event = solveProp(propConfig, value, (func) => {
      if (functionIdRef.current) {
        functionMap.delete(functionIdRef.current);
      }
      functionIdRef.current = uuidv4();
      functionMap.set(functionIdRef.current, func);
      return functionIdRef.current;
    });

    eventEmitter({
      type: "updateProp",
      unit: {
        id: unitId,
        prop: event,
      },
    });
  }, [
    defaultValue,
    eventEmitter,
    functionMap,
    propConfig,
    resolvedValue,
    unitId,
    value,
  ]);
};

const useBindMirrorRef = (
  unitId: string,
  handle: MirrorRef | null | undefined,
  meta: MirrorRefBindMeta,
) => {
  const refType = meta.refType;
  const refKey = meta.refType === "Slot" ? meta.refKey : "";

  useEffect(() => {
    if (!isMirrorRef(handle)) {
      return;
    }
    const bindMeta: MirrorRefBindMeta =
      refType === "RootSlot"
        ? { refType: "RootSlot" }
        : { refType: "Slot", refKey };
    handle.bind(unitId, bindMeta);
    return () => {
      handle.clearIf(unitId);
    };
  }, [handle, refKey, refType, unitId]);
};

const GeneralUnit = ({
  id,
  unitCode,
  defaultProps,
  children,
}: {
  id: string;
  unitCode: string;
  defaultProps: {
    key: string;
    type: string;
    value: unknown;
    option: unknown;
  }[];
  children?: ReactNode;
}) => {
  const { id: parentId } = useContext(UnitContext);
  const { eventEmitter } = useMainRootContext();

  useEffect(() => {
    eventEmitter({
      type: "generateUnit",
      unit: { id, parentId, code: unitCode, defaultProps },
    });
    return () => {
      eventEmitter({ type: "destroyUnit", unit: { id } });
    };
  }, [defaultProps, eventEmitter, id, parentId, unitCode]);

  return <UnitContext.Provider value={{ id }}>{children}</UnitContext.Provider>;
};

const ROOT_SLOT_META: MirrorRefBindMeta = { refType: "RootSlot" };

export const generateMain = <C extends DetailBase>(config: UnitConfig<C>) => {
  const Comp = (rawProps: getMainProps<C>) => {
    const unitId = useUnitId();

    config.syncPropConfigList.forEach((propConfig) => {
      // Hooks are called in a fixed order for a given UnitConfig.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useSyncProp(
        unitId,
        rawProps[propConfig.name as keyof typeof rawProps] === undefined
          ? config.defaultProps[propConfig.name]
          : rawProps[propConfig.name as keyof typeof rawProps],
        propConfig,
        config.defaultProps[propConfig.name],
      );
    });

    // Every Unit can export its root Slot.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useBindMirrorRef(
      unitId,
      (rawProps as { rootSlotRef?: MirrorRef | null }).rootSlotRef,
      ROOT_SLOT_META,
    );

    config.refsConfigList.forEach((refConfig) => {
      const propName = `${refConfig.name}Ref` as keyof typeof rawProps;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useBindMirrorRef(
        unitId,
        rawProps[propName] as MirrorRef | null | undefined,
        { refType: "Slot", refKey: refConfig.name },
      );
    });

    const defaultProps = useMemo(
      () =>
        config.syncPropConfigList.map((propConfig) =>
          solveProp(
            propConfig,
            config.defaultProps[propConfig.name],
            () => "EMPTY",
          ),
        ),
      [],
    );

    return (
      <GeneralUnit
        defaultProps={defaultProps}
        id={unitId}
        unitCode={config.code}
      >
        {rawProps.children as ReactNode}
      </GeneralUnit>
    );
  };
  Comp.displayName = "GeneratedMain";
  return Comp;
};
