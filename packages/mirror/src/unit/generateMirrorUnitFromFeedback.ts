import type { DetailBase, UnitConfig } from "@mirage-x/core";
import type {
  FieldDataPrimitive,
  ObjectContext,
  VirtualContext,
} from "@mirage-x/virtual-object";
import {
  VirtualContext as VC,
  dynamicField,
  dynamicReferenceVariable,
  dynamicVariableSpace,
} from "@mirage-x/virtual-object";
import { assetPath } from "../assets.js";
import { readFeedback } from "../feedback/feedbackFile.js";

export const generateMirrorUnitFromFeedback = <C extends DetailBase>({
  config,
  rawFeedback,
}: {
  /**
   * The unit's feedback (`readFeedbackIfExists(...)`). When it is missing or
   * not a Resonite object, the empty unit template is used.
   */
  rawFeedback?: unknown;
  config: UnitConfig<C>;
}): VirtualContext => {
  const isObjectContext = (value: unknown): value is ObjectContext =>
    typeof (value as { VersionNumber?: unknown } | null | undefined)
      ?.VersionNumber === "string";
  const result = VC.generate(
    isObjectContext(rawFeedback)
      ? rawFeedback
      : readFeedback(assetPath("unit/emptyFeedback.brson")),
  );
  if (result.status !== "SUCCESS") {
    throw new Error(`${result.code} ${result.reason}`);
  }
  const { context: feedback, warnings: feedbackGenerateWarnings } = result.data;

  if (feedbackGenerateWarnings.length > 0) {
    console.warn("feedbackGenerateWarnings", feedbackGenerateWarnings);
  }
  const feedbackDvRef = feedback.object.children
    .find((slot) => slot.name.asPrimitive() === "DV")
    ?.components.find(
      (component) =>
        component.type ===
          "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<[FrooxEngine]FrooxEngine.Slot>" &&
        component.data.VariableName?.asPrimitive() === "Static.Ref",
    )?.data.Reference?.data;
  if (
    !(
      feedbackDvRef &&
      feedbackDvRef.type === "Slot" &&
      feedbackDvRef.data.type === "Ref" &&
      feedbackDvRef.data.target
    )
  ) {
    throw new Error("Feedback Ref not found");
  }
  const feedbackSlotRef = feedbackDvRef.data.target;
  const feedbackSlotDvProps = feedbackSlotRef.children.find(
    (slot) => slot.name.data.data === "DV/Props",
  );
  const feedbackSlotDvStatic = feedbackSlotRef.children.find(
    (slot) => slot.name.data.data === "DV/Static",
  );

  const feedbackDvMain = feedbackSlotDvStatic?.components.find(
    (component) => component.data.VariableName?.asPrimitive() === "Static.Main",
  )?.data.Reference?.data;
  if (
    !(
      feedbackDvMain &&
      feedbackDvMain.type === "Slot" &&
      feedbackDvMain.data.type === "Ref" &&
      feedbackDvMain.data.target
    )
  ) {
    throw new Error("Feedback Main not found");
  }
  const feedbackSlotMain = feedbackDvMain.data.target;
  if (!feedbackSlotMain) {
    throw new Error("Feedback Main not found");
  }
  const feedbackDvChildrenParent = feedbackSlotDvStatic?.components.find(
    (component) =>
      component.data.VariableName?.asPrimitive() === "Static.ChildrenParent",
  )?.data.Reference?.data;
  if (
    !(
      feedbackDvChildrenParent &&
      feedbackDvChildrenParent.type === "Slot" &&
      feedbackDvChildrenParent.data.type === "Ref" &&
      feedbackDvChildrenParent.data.target
    )
  ) {
    throw new Error("Feedback ChildrenParent not found");
  }
  const feedbackSlotChildrenParent = feedbackDvChildrenParent.data.target;

  const { context, warnings: contextGenerateWarnings } = VC.createEmpty();
  if (contextGenerateWarnings.length > 0) {
    console.warn("contextGenerateWarnings", contextGenerateWarnings);
  }
  context.object.name.data.data = config.code;
  context.object.createComponent(dynamicVariableSpace({}));

  const slotDv = context.object.createChild({ name: "DV" });
  const dvStaticRef = slotDv.createComponent(
    dynamicReferenceVariable({
      type: "[FrooxEngine]FrooxEngine.Slot",
      variableName: "Static.Ref",
    }),
  ).data.Reference;
  if (!dvStaticRef) {
    throw new Error("dvStaticRef not found");
  }

  const slotRef = context.object.createChild({ name: "Ref" });
  slotRef.createComponent(dynamicVariableSpace({}));
  feedbackSlotMain.setParent(slotRef);
  dvStaticRef.data = {
    type: "Slot",
    data: { type: "Ref", target: slotRef },
  };

  feedbackSlotRef.children.forEach((slot) => {
    if (
      slot !== feedbackSlotMain &&
      slot.name.data.data !== "DV/Props" &&
      slot.name.data.data !== "DV/Refs" &&
      slot.name.data.data !== "DV/Static"
    ) {
      slot.setParent(slotRef);
    }
  });

  const slotDvStatic = slotRef.createChild({ name: "DV/Static" });

  const slotDvStaticRootSlotDVReference = slotDvStatic.createComponent(
    dynamicReferenceVariable({
      type: "[FrooxEngine]FrooxEngine.Slot",
      variableName: "Static.Root",
    }),
  ).data.Reference;
  if (!slotDvStaticRootSlotDVReference) {
    throw new Error("slotDvStaticRootSlotDVReference not found");
  }
  slotDvStaticRootSlotDVReference.data = {
    type: "Slot",
    data: { type: "Ref", target: slotRef },
  };

  const slotDvStaticMainSlotDVReference = slotDvStatic.createComponent(
    dynamicReferenceVariable({
      type: "[FrooxEngine]FrooxEngine.Slot",
      variableName: "Static.Main",
    }),
  ).data.Reference;
  if (!slotDvStaticMainSlotDVReference) {
    throw new Error("slotDvStaticMainSlotDVReference not found");
  }
  slotDvStaticMainSlotDVReference.data = {
    type: "Slot",
    data: { type: "Ref", target: feedbackSlotMain },
  };

  const slotDvStaticChildrenParentSlotDVReference =
    slotDvStatic.createComponent(
      dynamicReferenceVariable({
        type: "[FrooxEngine]FrooxEngine.Slot",
        variableName: "Static.ChildrenParent",
      }),
    ).data.Reference;

  if (!slotDvStaticChildrenParentSlotDVReference) {
    throw new Error("slotDvStaticChildrenParentSlotDVReference not found");
  }
  slotDvStaticChildrenParentSlotDVReference.data = {
    type: "Slot",
    data: { type: "Ref", target: feedbackSlotChildrenParent },
  };

  const slotDvProps = slotRef.createChild({ name: "DV/Props" });
  const feedbackSlotDvRefs = feedbackSlotRef.children.find(
    (slot) => slot.name.data.data === "DV/Refs",
  );
  const feedbackFieldProps = feedbackSlotDvProps?.components
    .filter((component) =>
      component.type.startsWith("[FrooxEngine]FrooxEngine.DynamicField<"),
    )
    .reduce(
      (acc, component) => {
        const variableName = component.data.VariableName?.asPrimitive() as
          | string
          | null;
        const value =
          component.data["TargetField"]?.data ??
          component.data["TargetReference"]?.data;
        return {
          ...acc,
          ...(variableName ? { [variableName]: value } : {}),
        };
      },
      {} as { [key: string]: unknown },
    );
  const feedbackReferenceProps = feedbackSlotDvProps?.components
    .filter((component) =>
      component.type.startsWith(
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<",
      ),
    )
    .reduce(
      (acc, component) => {
        const variableName = component.data.VariableName?.asPrimitive() as
          | string
          | null;
        const value = component.data.Reference?.data;
        return {
          ...acc,
          ...(variableName ? { [variableName]: value } : {}),
        };
      },
      {} as { [key: string]: unknown },
    );
  const feedbackNamedRefs = feedbackSlotDvRefs?.components
    .filter((component) =>
      component.type.startsWith(
        "[FrooxEngine]FrooxEngine.DynamicReferenceVariable<",
      ),
    )
    .reduce(
      (acc, component) => {
        const variableName = component.data.VariableName?.asPrimitive() as
          | string
          | null;
        const value = component.data.Reference?.data;
        return {
          ...acc,
          ...(variableName ? { [variableName]: value } : {}),
        };
      },
      {} as { [key: string]: unknown },
    );

  config.syncPropConfigList.forEach((propConfig) => {
    if (propConfig.type === "Reference") {
      const feedbackValue =
        feedbackReferenceProps?.[`Props.${propConfig.name}`] ??
        feedbackFieldProps?.[`Props.${propConfig.name}`];
      const dvRef = slotDvProps.createComponent(
        dynamicReferenceVariable({
          type: "[FrooxEngine]FrooxEngine.Slot",
          variableName: `Props.${propConfig.name}`,
        }),
      );
      if (dvRef.data.Reference && feedbackValue) {
        dvRef.data.Reference.data = feedbackValue as never;
      }
      return;
    }

    const feedbackValue = feedbackFieldProps?.[`Props.${propConfig.name}`];
    const dvField = slotDvProps.createComponent(
      dynamicField({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        type: propConfig.resDVType,
        variableName: `Props.${propConfig.name}`,
      }),
    );
    if (dvField.data.TargetField && feedbackValue) {
      dvField.data.TargetField.data = feedbackValue as FieldDataPrimitive;
    }
    if (dvField.data.TargetReference && feedbackValue) {
      dvField.data.TargetReference.data = feedbackValue as FieldDataPrimitive;
    }
  });

  if (config.refsConfigList.length > 0) {
    const slotDvRefs = slotRef.createChild({ name: "DV/Refs" });
    for (const refConfig of config.refsConfigList) {
      const variableName = `Refs.${refConfig.name}`;
      const feedbackValue = feedbackNamedRefs?.[variableName];
      const dvRef = slotDvRefs.createComponent(
        dynamicReferenceVariable({
          type: "[FrooxEngine]FrooxEngine.Slot",
          variableName,
        }),
      );
      if (dvRef.data.Reference && feedbackValue) {
        dvRef.data.Reference.data = feedbackValue as never;
      }
    }
  }

  return context;
};
