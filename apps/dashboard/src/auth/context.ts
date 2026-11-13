import { createContext, useContext } from "react";
import type { Me, SignUpInput } from "../api";

export type AuthState = {
  me: Me | null; // null means not logged in
  loading: boolean; // true until we have asked the API who we are
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}