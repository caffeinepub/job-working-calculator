/**
 * authActor.ts - Safe stub
 *
 * Auth user management was removed from the app. This file is a stub
 * to avoid import errors. All authentication is handled via AuthContext.tsx
 * using local credentials (username/password stored in localStorage).
 */
import { getActor } from "./actorSingleton";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: string;
  status: string;
  discountPct: number;
  createdAt: bigint;
}

export type LoginResult = { ok: AppUser } | { err: string };

export interface AuthBackend {
  initAdmin(): Promise<boolean>;
  registerUser(username: string, password: string): Promise<LoginResult>;
  loginUser(username: string, password: string): Promise<LoginResult>;
  getUsers(): Promise<Array<AppUser>>;
  approveUser(id: string): Promise<boolean>;
  rejectUser(id: string): Promise<boolean>;
  updateUserDiscount(id: string, discountPct: number): Promise<boolean>;
  changePassword(id: string, newPassword: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
}

export async function getAuthActor(): Promise<AuthBackend> {
  const actor = await getActor();
  return actor as unknown as AuthBackend;
}
