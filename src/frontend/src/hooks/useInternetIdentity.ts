/**
 * useInternetIdentity - PERMANENT NO-OP
 *
 * The Caffeine platform regenerates main.tsx on every build with
 * <InternetIdentityProvider> wrapping the app. This file is the
 * implementation of that provider. It has been made a complete
 * no-op so that platform regenerations can never break saves or
 * cause "Failed to Connect" errors.
 *
 * DO NOT add any AuthClient.create(), loadConfig(), or network
 * calls here. This file must remain a true no-op forever.
 */
import {
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

const defaultContext: InternetIdentityContext = {
  identity: undefined,
  login: () => {},
  clear: () => {},
  loginStatus: "idle",
  isInitializing: false,
  isLoginIdle: true,
  isLoggingIn: false,
  isLoginSuccess: false,
  isLoginError: false,
};

const InternetIdentityReactContext =
  createContext<InternetIdentityContext>(defaultContext);

/**
 * No-op provider. Wraps children without any side effects.
 * main.tsx always renders this -- it must never make network calls.
 * Uses createElement to avoid JSX in .ts file.
 */
export function InternetIdentityProvider({
  children,
}: { children: ReactNode }) {
  return createElement(
    InternetIdentityReactContext.Provider,
    { value: defaultContext },
    children,
  );
}

export function useInternetIdentity(): InternetIdentityContext {
  return useContext(InternetIdentityReactContext);
}
