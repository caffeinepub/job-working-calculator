import type { Identity } from "@icp-sdk/core/agent";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useContext,
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
  login: () => {},
  clear: () => {},
  loginStatus: "idle",
  isInitializing: false,
  isLoginIdle: true,
  isLoggingIn: false,
  isLoginSuccess: false,
  isLoginError: false,
});

export const useInternetIdentity = (): InternetIdentityContext => {
  return useContext(InternetIdentityReactContext);
};

export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{ createOptions?: unknown }>) {
  return createElement(
    InternetIdentityReactContext.Provider,
    {
      value: {
        login: () => {},
        clear: () => {},
        loginStatus: "idle",
        isInitializing: false,
        isLoginIdle: true,
        isLoggingIn: false,
        isLoginSuccess: false,
        isLoginError: false,
      },
    },
    children as ReactNode,
  );
}
