import type { Identity } from "@dfinity/agent";
import type { AuthClientCreateOptions } from "@dfinity/auth-client";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useContext,
  useMemo,
} from "react";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity?: Identity;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
};

const InternetIdentityReactContext = createContext<InternetIdentityContext>({
  identity: undefined,
  login: () => {},
  clear: () => {},
  loginStatus: "idle",
  isInitializing: false,
  isLoginIdle: true,
  isLoggingIn: false,
  isLoginSuccess: false,
  isLoginError: false,
  loginError: undefined,
});

export const useInternetIdentity = (): InternetIdentityContext => {
  return useContext(InternetIdentityReactContext);
};

export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{
  children: ReactNode;
  createOptions?: AuthClientCreateOptions;
}>) {
  const value = useMemo<InternetIdentityContext>(
    () => ({
      identity: undefined,
      login: () => {},
      clear: () => {},
      loginStatus: "idle" as Status,
      isInitializing: false,
      isLoginIdle: true,
      isLoggingIn: false,
      isLoginSuccess: false,
      isLoginError: false,
      loginError: undefined,
    }),
    [],
  );

  return createElement(InternetIdentityReactContext.Provider, {
    value,
    children,
  });
}
