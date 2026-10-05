import { mirror as Canvas } from "./PrimitiveUix/Canvas/mirror.js";
import { mirror as PrimitiveImage } from "./PrimitiveUix/PrimitiveImage/mirror.js";
import { mirror as PrimitiveText } from "./PrimitiveUix/PrimitiveText/mirror.js";
import { mirror as SlotHost } from "./Demo/SlotHost/mirror.js";
import { mirror as SlotTarget } from "./Demo/SlotTarget/mirror.js";

export const units = {
  PrimitiveUix: {
    Canvas,
    PrimitiveImage,
    PrimitiveText,
  },
  Demo: {
    SlotHost,
    SlotTarget,
  },
};
