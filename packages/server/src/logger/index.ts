export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export class Logger {
  private parent?: Logger;
  private contextName?: string;
  private extraInfo?: Record<string, string>;
  private logLevel?: LogLevel;

  private shouldOutputFatal?: boolean;
  private shouldOutputError?: boolean;
  private shouldOutputWarn?: boolean;
  private shouldOutputInfo?: boolean;
  private shouldOutputDebug?: boolean;

  constructor(option: {
    contextName: string;
    parent?: Logger;
    extraInfo?: Record<string, string>;
    logLevel?: LogLevel;
  }) {
    this.contextName = option.contextName;
    this.parent = option.parent;
    this.extraInfo = option.extraInfo;
    this.logLevel = option.logLevel ?? "debug";
    this.shouldOutputDebug = this.logLevel === "debug";
    this.shouldOutputInfo = this.shouldOutputDebug || this.logLevel === "info";
    this.shouldOutputWarn = this.shouldOutputInfo || this.logLevel === "warn";
    this.shouldOutputError = this.shouldOutputWarn || this.logLevel === "error";
    this.shouldOutputFatal =
      this.shouldOutputError || this.logLevel === "fatal";

    if (!this.parent) {
      this.info("start root logger");
    }
  }

  public generateChildLogger({
    contextName,
    extraInfo,
  }: {
    contextName: string;
    extraInfo?: Record<string, string>;
  }): Logger {
    return new Logger({
      contextName,
      parent: this,
      extraInfo,
      logLevel: this.logLevel,
    });
  }

  private getContextPath(): string[] {
    return [
      ...(this.parent?.getContextPath() ?? []),
      ...(this.contextName ? [this.contextName] : []),
    ];
  }

  private getExtraInfo(): Record<string, string>[] {
    return [
      ...(this.parent?.getExtraInfo() ?? []),
      ...(this.extraInfo ? [this.extraInfo] : []),
    ];
  }

  private getPrefix(): string {
    const date = new Date();
    return `${date.toISOString()} [${this.getContextPath().join(" > ")}]`;
  }

  private getSuffix(): string {
    return this.getExtraInfo()
      .flatMap((info) =>
        Object.entries(info).map(([key, value]) => `${key}: ${value}`),
      )
      .join(". ");
  }

  public fatal(...args: string[]): void {
    if (this.shouldOutputFatal) {
      console.error("[FATAL]", this.getPrefix(), ...args, this.getSuffix());
    }
  }

  public error(...args: string[]): void {
    if (this.shouldOutputError) {
      console.error("[ERROR]", this.getPrefix(), ...args, this.getSuffix());
    }
  }

  public warn(...args: string[]): void {
    if (this.shouldOutputWarn) {
      console.warn("[WARN]", this.getPrefix(), ...args, this.getSuffix());
    }
  }

  public info(...args: string[]): void {
    if (this.shouldOutputInfo) {
      console.info("[INFO]", this.getPrefix(), ...args, this.getSuffix());
    }
  }

  public debug(...args: string[]): void {
    if (this.shouldOutputDebug) {
      console.debug("[DEBUG]", this.getPrefix(), ...args, this.getSuffix());
    }
  }

  /** Debug-only helper that accepts non-string values. */
  public debugUnknown(...args: unknown[]): void {
    if (this.shouldOutputDebug) {
      console.debug("[DEBUG]", this.getPrefix(), ...args, this.getSuffix());
    }
  }
}
