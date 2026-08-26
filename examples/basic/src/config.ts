import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  appCode: "MirageXBasic",
  mirage: {
    url: "http://localhost:3100/",
    port: "3100",
    serverId: "example-basic",
  },
  auth: {
    url: "https://auth.example.local/",
  },
  platform: {
    api: {
      url: "https://api.resonite.com/",
    },
  },
  cv: {
    mirage: {
      host: {
        path: "",
        ownerId: "",
        fallback: "localhost:3100",
      },
      useSsl: {
        path: "",
        fallback: false,
      },
    },
  },
  outputDir: path.resolve(rootDir, "output"),
  outputBrsonPath: path.resolve(rootDir, "output", "output.brson"),
  versionPath: path.resolve(rootDir, "output", "version.json"),
};
