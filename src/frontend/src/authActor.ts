/**
 * authActor.ts - Stub only. Auth is handled by AuthContext.tsx via localStorage.
 */

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
  // Stub -- user management removed, all auth via localStorage AuthContext
  throw new Error("User management is not supported in this version.");
}
