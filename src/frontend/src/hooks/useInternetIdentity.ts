import {
  type PropsWithChildren,
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
  identity?: undefined;
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
  // TRUE NO-OP: renders children immediately, no AuthClient, no network calls.
  return createElement(InternetIdentityReactContext.Provider, {
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
    children,
  });
}
