import { build, generateSimpleFrame } from "@mirage-x/mirror";

import { config } from "./config.js";
import { units } from "./unit/mirror.js";

await build(
  {
    appCode: config.appCode,
    cv: config.cv,
    outputPath: config.outputDir,
  },
  units,
  generateSimpleFrame,
);
