import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WeldingLineItem {
    finalPrice: number;
    ratePerKg: number;
    weightKg: number;
    grade: string;
}
export interface SavedJob {
    job: Job;
    customerName?: string;
    weldingLineItems: Array<WeldingLineItem>;
    ratePerKg: number;
    jobLineItems: Array<JobLineItem>;
    totalProductWeight: number;
    totalFinalPrice: number;
}
export interface RawMaterial {
    id: string;
    createdAt: bigint;
    size: string;
    currentRate: number;
    grade: string;
    materialType: string;
    weightPerMeter: number;
}
export interface JobLineItem {
    finalPrice: number;
    lengthMeters: number;
    rawWeight: number;
    materialId: string;
    totalWeight: number;
}
export interface Job {
    id: string;
    name: string;
    createdAt: bigint;
    dispatchQty: number;
    transportIncluded: boolean;
    transportCost: number;
    customerId?: string;
    laborRate: number;
}
export interface Customer {
    id: string;
    name: string;
    createdAt: bigint;
    email: string;
    address: string;
    phone: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomer(name: string, phone: string, email: string, address: string): Promise<Customer>;
    addMaterial(grade: string, materialType: string, size: string, weightPerMeter: number, currentRate: number): Promise<RawMaterial>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCustomer(id: string): Promise<boolean>;
    deleteJob(id: string): Promise<boolean>;
    deleteMaterial(id: string): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(id: string): Promise<Customer>;
    getCustomers(): Promise<Array<Customer>>;
    getJob(id: string): Promise<SavedJob>;
    getJobs(): Promise<Array<SavedJob>>;
    getMaterial(id: string): Promise<RawMaterial>;
    getMaterials(): Promise<Array<RawMaterial>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveJob(name: string, laborRate: number, transportIncluded: boolean, customerId: string | null, transportCost: number, dispatchQty: number, jobLineItems: Array<JobLineItem>, weldingLineItems: Array<WeldingLineItem>, totalFinalPrice: number, totalProductWeight: number, ratePerKg: number): Promise<SavedJob>;
    updateCustomer(id: string, name: string, phone: string, email: string, address: string): Promise<Customer>;
    updateJob(id: string, name: string, laborRate: number, transportIncluded: boolean, customerId: string | null, transportCost: number, dispatchQty: number, jobLineItems: Array<JobLineItem>, weldingLineItems: Array<WeldingLineItem>, totalFinalPrice: number, totalProductWeight: number, ratePerKg: number): Promise<SavedJob>;
    updateMaterial(id: string, grade: string, materialType: string, size: string, weightPerMeter: number, currentRate: number): Promise<RawMaterial>;
}
