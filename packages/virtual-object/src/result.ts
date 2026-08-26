export type SuccessResult<D> = {
  status: "SUCCESS"
  data: D
}

export const Success = <D>(data: D): SuccessResult<D> => ({
  status: "SUCCESS",
  data,
})

export type FailedResult<C extends string, R> = {
  status: "FAILED"
  code: C
  reason: R
}

export const Failed = <C extends string, R>(
  code: C,
  reason: R,
): FailedResult<C, R> => ({
  status: "FAILED",
  code,
  reason,
})

export type Result<D, F extends FailedResult<string, unknown> = never> =
  | SuccessResult<D>
  | F
