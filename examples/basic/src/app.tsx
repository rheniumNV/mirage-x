import { Canvas, PrimitiveImage, PrimitiveText } from "./unit/main.js";

export const App = () => {
  return (
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
  );
};
