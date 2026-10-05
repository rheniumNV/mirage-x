import { useMirrorRef } from "@mirage-x/core";

import {
  Canvas,
  PrimitiveImage,
  PrimitiveText,
  SlotHost,
  SlotTarget,
} from "./unit/main.js";

export const App = () => {
  const rootSlotRef = useMirrorRef();

  return (
    <>
      <SlotHost
        name="RefDemo.Host"
        rootSlotRef={rootSlotRef}
        position={[0, -0.25, 0]}
      />
      <SlotTarget
        name="RefDemo.Target"
        target={rootSlotRef}
        position={[0.25, 0, 0]}
      />
      <Canvas size={[1000, 300]}>
        <PrimitiveImage color={[0.15, 0.55, 0.9, 1]}>
          <PrimitiveText
            content="Hello MirageX"
            size={64}
            color={[1, 1, 1, 1]}
            horizontalAlign="Center"
            verticalAlign="Middle"
          />
        </PrimitiveImage>
      </Canvas>
    </>
  );
};
