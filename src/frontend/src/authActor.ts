/**
 * Auth Actor Helper
 *
 * Extends the base backendInterface with auth methods that exist in
 * the Motoko backend but are not yet in the generated backend.ts wrapper.
 * Uses type casting since we cannot modify the read-only backend.ts.
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
