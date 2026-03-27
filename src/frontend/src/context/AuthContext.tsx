import { createContext, useContext, useState } from "react";

const CREDS_KEY = "jobcalc_credentials";
const LOGGED_IN_KEY = "jobcalc_logged_in";

const DEFAULT_CREDS = { username: "triveni", password: "Triveni_2022" };

function getStoredCreds(): { username: string; password: string } {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const creds = DEFAULT_CREDS;
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  return creds;
}

interface AuthContextValue {
  isLoggedIn: boolean;
  username: string;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (currentPw: string, newPw: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  username: "",
  login: () => false,
  logout: () => {},
  changePassword: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOGGED_IN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [username, setUsername] = useState<string>(() => {
    return getStoredCreds().username;
  });

  const login = (user: string, password: string): boolean => {
    const creds = getStoredCreds();
    if (user === creds.username && password === creds.password) {
      localStorage.setItem(LOGGED_IN_KEY, "true");
      setIsLoggedIn(true);
      setUsername(creds.username);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(LOGGED_IN_KEY);
    setIsLoggedIn(false);
  };

  const changePassword = (currentPw: string, newPw: string): boolean => {
    const creds = getStoredCreds();
    if (currentPw !== creds.password) return false;
    const updated = { username: creds.username, password: newPw };
    localStorage.setItem(CREDS_KEY, JSON.stringify(updated));
    return true;
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, username, login, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Legacy compat — some pages may import these
export interface AuthUser {
  id: string;
  username: string;
  role: string;
  status: string;
  discountPct: number;
}
