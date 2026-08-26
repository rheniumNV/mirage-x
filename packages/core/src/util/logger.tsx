import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Logger } from "../logger/index.js";

const LoggerContext = createContext<Logger | undefined>(undefined);

export const LoggerProvider = ({
  logger,
  children,
}: {
  logger: Logger;
  children: ReactNode;
}) => (
  <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>
);

export const LogContext = ({
  contextName,
  children,
}: {
  contextName: string;
  children: ReactNode;
}) => {
  const logger = useLogger();
  const childLogger = useMemo(
    () => logger.generateChildLogger({ contextName }),
    [logger, contextName],
  );
  return <LoggerProvider logger={childLogger}>{children}</LoggerProvider>;
};

export const useLogger = () => {
  const logger = useContext(LoggerContext);
  if (!logger) {
    throw new Error("Logger is not provided");
  }
  return logger;
};
