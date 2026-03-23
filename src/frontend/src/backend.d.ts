import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RawMaterial {
    id: string;
    createdAt: bigint;
    size: string;
    currentRate: number;
    grade: string;
    materialType: string;
    weightPerMeter: number;
}
export interface backendInterface {
    addMaterial(grade: string, materialType: string, size: string, weightPerMeter: number, currentRate: number): Promise<RawMaterial>;
    deleteMaterial(id: string): Promise<boolean>;
    getMaterial(id: string): Promise<RawMaterial>;
    getMaterials(): Promise<Array<RawMaterial>>;
    updateMaterial(id: string, grade: string, materialType: string, size: string, weightPerMeter: number, currentRate: number): Promise<RawMaterial>;
}
