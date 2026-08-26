import fs from "node:fs";

type FileErrorCode = "FILE_NOT_FOUND" | "PERMISSION_DENIED" | "UNKNOWN_ERROR";

type SuccessResult<T> = { status: "SUCCESS"; data: T };
type FailedResult<C extends string, R> = {
  status: "FAILED";
  code: C;
  reason: R;
};
type Result<T, E> = SuccessResult<T> | E;

const Success = <T>(data: T): SuccessResult<T> => ({
  status: "SUCCESS",
  data,
});

const Failed = <C extends string, R>(
  code: C,
  reason: R,
): FailedResult<C, R> => ({
  status: "FAILED",
  code,
  reason,
});

export const readFileSync = ({
  path: pathName,
  errorHandler = (e: unknown): FailedResult<FileErrorCode, string> => {
    if (e instanceof Error && "code" in e) {
      if (e.code === "ENOENT") {
        return Failed("FILE_NOT_FOUND", `File not found: ${pathName}`);
      }
      if (e.code === "EACCES") {
        return Failed("PERMISSION_DENIED", `Permission denied: ${pathName}`);
      }
    }
    return Failed(
      "UNKNOWN_ERROR",
      "Unknown error occurred while reading file",
    );
  },
}: {
  path: string;
  errorHandler?: (e: unknown) => FailedResult<FileErrorCode, string>;
}): Result<string, FailedResult<FileErrorCode, string>> => {
  try {
    return Success(fs.readFileSync(pathName, "utf-8"));
  } catch (e) {
    return errorHandler(e);
  }
};
