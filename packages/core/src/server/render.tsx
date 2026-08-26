import { useState, useEffect, type ReactNode, type ReactElement } from "react";
import type { Logger } from "../logger/index.js";
import type { UnitChangeServerEvent } from "../common/unitChangeEvent.js";
import {
  type Authentication,
  MainRootContextProvider,
  useResoniteUser,
} from "../main/index.js";
import type { MainRootProps } from "../main/mainRootProps.js";
import { LoggerProvider } from "../util/logger.js";

const Main = ({
  connectionId,
  ownerId,
  lang,
  eventEmitter,
  functionMap,
  propsSetterRegister,
  children,
  platformApiUrl,
  authentication,
}: {
  connectionId: string;
  ownerId: string;
  lang: string;
  eventEmitter: (event: UnitChangeServerEvent) => void;
  functionMap: Map<string, (...args: unknown[]) => unknown>;
  propsSetterRegister: (setter: (props: MainRootProps) => void) => void;
  children: ReactNode;
  platformApiUrl: string;
  authentication?: Authentication;
}) => {
  const [mainRootProps, setMainRootProps] = useState<MainRootProps>({
    authentication,
    closed: false,
  });

  const userResponse = useResoniteUser(platformApiUrl, ownerId);

  useEffect(() => {
    propsSetterRegister(setMainRootProps);
  }, [propsSetterRegister]);

  if (mainRootProps.closed) {
    return null;
  }

  return (
    <MainRootContextProvider
      value={{
        connectionId,
        ownerUser:
          userResponse.status === "success" ? userResponse.data : undefined,
        ownerId,
        lang,
        eventEmitter,
        functionMap,
        authentication: mainRootProps.authentication,
      }}
    >
      {children}
    </MainRootContextProvider>
  );
};

export const render = (App: () => ReactElement, logger: Logger) => {
  const AppRenderer = (args: {
    connectionId: string;
    ownerId: string;
    lang: string;
    eventEmitter: (event: UnitChangeServerEvent) => void;
    functionMap: Map<string, (...args: unknown[]) => unknown>;
    propsSetterRegister: (setter: (props: MainRootProps) => void) => void;
    platformApiUrl: string;
    defaultAuthentication?: Authentication;
  }) => (
    <LoggerProvider logger={logger}>
      <Main
        authentication={args.defaultAuthentication}
        connectionId={args.connectionId}
        eventEmitter={args.eventEmitter}
        functionMap={args.functionMap}
        lang={args.lang}
        ownerId={args.ownerId}
        platformApiUrl={args.platformApiUrl}
        propsSetterRegister={args.propsSetterRegister}
      >
        <App />
      </Main>
    </LoggerProvider>
  );
  return AppRenderer;
};
