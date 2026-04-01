/**
 * icpDB.ts
 * Clean ICP actor data layer.
 * Calls the backend actor directly. All optional Candid fields use [] for null, never null/undefined.
 * The backend.ts class handles to_candid_opt conversion automatically.
 */
import { getActor } from "./actorSingleton";

// Re-export types from backend.ts so pages can import from one place
export type {
  RawMaterial,
  Customer,
  SavedJob,
  Job,
  JobLineItem,
  WeldingLineItem,
  LabourJob,
  FlexibleJob,
  AlWeldingJob,
  RateHistoryEntry,
} from "./backend";

// ===== Raw Materials =====
export async function getMaterials() {
  const actor = await getActor();
  return actor.getMaterials();
}

export async function getMaterial(id: string) {
  const actor = await getActor();
  return actor.getMaterial(id);
}

export async function addMaterial(
  grade: string,
  materialType: string,
  size: string,
  weightPerMeter: number,
  currentRate: number,
) {
  const actor = await getActor();
  return actor.addMaterial(
    grade,
    materialType,
    size,
    weightPerMeter,
    currentRate,
  );
}

export async function updateMaterial(
  id: string,
  grade: string,
  materialType: string,
  size: string,
  weightPerMeter: number,
  currentRate: number,
) {
  const actor = await getActor();
  return actor.updateMaterial(
    id,
    grade,
    materialType,
    size,
    weightPerMeter,
    currentRate,
  );
}

export async function deleteMaterial(id: string) {
  const actor = await getActor();
  return actor.deleteMaterial(id);
}

export async function deleteRateHistoryEntry(
  materialId: string,
  index: bigint | number,
) {
  const actor = await getActor();
  return actor.deleteRateHistoryEntry(materialId, BigInt(index));
}

// ===== Customers =====
export async function getCustomers() {
  const actor = await getActor();
  return actor.getCustomers();
}

export async function getCustomer(id: string) {
  const actor = await getActor();
  return actor.getCustomer(id);
}

export async function addCustomer(
  name: string,
  phone: string,
  email: string,
  address: string,
) {
  const actor = await getActor();
  return actor.addCustomer(name, phone, email, address);
}

export async function updateCustomer(
  id: string,
  name: string,
  phone: string,
  email: string,
  address: string,
) {
  const actor = await getActor();
  return actor.updateCustomer(id, name, phone, email, address);
}

export async function deleteCustomer(id: string) {
  const actor = await getActor();
  return actor.deleteCustomer(id);
}

// ===== SS Fabrication Jobs =====
export async function getJobs() {
  const actor = await getActor();
  return actor.getJobs();
}

export async function getJob(id: string) {
  const actor = await getActor();
  return actor.getJob(id);
}

export async function saveJob(
  name: string,
  laborRate: number,
  transportIncluded: boolean,
  customerId: string | null,
  transportCost: number,
  dispatchQty: number,
  jobLineItems: Array<{
    materialId: string;
    lengthMeters: number;
    rawWeight: number;
    totalWeight: number;
    finalPrice: number;
  }>,
  weldingLineItems: Array<{
    grade: string;
    ratePerKg: number;
    weightKg: number;
    finalPrice: number;
  }>,
  totalFinalPrice: number,
  totalProductWeight: number,
  ratePerKg: number,
) {
  const actor = await getActor();
  return actor.saveJob(
    name,
    laborRate,
    transportIncluded,
    customerId,
    transportCost,
    dispatchQty,
    jobLineItems,
    weldingLineItems,
    totalFinalPrice,
    totalProductWeight,
    ratePerKg,
  );
}

export async function updateJob(
  id: string,
  name: string,
  laborRate: number,
  transportIncluded: boolean,
  customerId: string | null,
  transportCost: number,
  dispatchQty: number,
  jobLineItems: Array<{
    materialId: string;
    lengthMeters: number;
    rawWeight: number;
    totalWeight: number;
    finalPrice: number;
  }>,
  weldingLineItems: Array<{
    grade: string;
    ratePerKg: number;
    weightKg: number;
    finalPrice: number;
  }>,
  totalFinalPrice: number,
  totalProductWeight: number,
  ratePerKg: number,
) {
  const actor = await getActor();
  return actor.updateJob(
    id,
    name,
    laborRate,
    transportIncluded,
    customerId,
    transportCost,
    dispatchQty,
    jobLineItems,
    weldingLineItems,
    totalFinalPrice,
    totalProductWeight,
    ratePerKg,
  );
}

export async function deleteJob(id: string) {
  const actor = await getActor();
  return actor.deleteJob(id);
}

// ===== Labour Jobs =====
export async function getLabourJobs() {
  const actor = await getActor();
  return actor.getLabourJobs();
}

export async function saveLabourJob(
  description: string,
  materialType: string,
  weldLength: number,
  laborRate: number,
  totalCost: number,
) {
  const actor = await getActor();
  return actor.saveLabourJob(
    description,
    materialType,
    weldLength,
    laborRate,
    totalCost,
  );
}

export async function deleteLabourJob(id: string) {
  const actor = await getActor();
  return actor.deleteLabourJob(id);
}

// ===== Flexible Jobs =====
export async function getFlexibleJobs() {
  const actor = await getActor();
  return actor.getFlexibleJobs();
}

export async function saveFlexibleJob(
  description: string,
  materialTab: string,
  centerLength: number,
  sheetBunchWidth: number,
  sheetThickness: number,
  sheetCountVal: bigint | number,
  barsSupplied: boolean,
  barLength: number,
  barWidth: number,
  barThickness: number,
  numberOfDrillsVal: bigint | number,
  numberOfFoldsVal: bigint | number,
  sheetStackWeight: number,
  stripWeight: number,
  bar1Weight: number,
  bar2Weight: number,
  totalMaterialWeight: number,
  materialCost: number,
  cuttingCost: number,
  foldingCost: number,
  drillingCost: number,
  weldingCost: number,
  chamferingCost: number,
  totalWeldLength: number,
  overheadCost: number,
  profitCost: number,
  totalCost: number,
  discountPct: number,
  quotedPrice: number,
) {
  const actor = await getActor();
  return actor.saveFlexibleJob(
    description,
    materialTab,
    centerLength,
    sheetBunchWidth,
    sheetThickness,
    BigInt(sheetCountVal),
    barsSupplied,
    barLength,
    barWidth,
    barThickness,
    BigInt(numberOfDrillsVal),
    BigInt(numberOfFoldsVal),
    sheetStackWeight,
    stripWeight,
    bar1Weight,
    bar2Weight,
    totalMaterialWeight,
    materialCost,
    cuttingCost,
    foldingCost,
    drillingCost,
    weldingCost,
    chamferingCost,
    totalWeldLength,
    overheadCost,
    profitCost,
    totalCost,
    discountPct,
    quotedPrice,
  );
}

export async function updateFlexibleJob(
  id: string,
  description: string,
  materialTab: string,
  centerLength: number,
  sheetBunchWidth: number,
  sheetThickness: number,
  sheetCountVal: bigint | number,
  barsSupplied: boolean,
  barLength: number,
  barWidth: number,
  barThickness: number,
  numberOfDrillsVal: bigint | number,
  numberOfFoldsVal: bigint | number,
  sheetStackWeight: number,
  stripWeight: number,
  bar1Weight: number,
  bar2Weight: number,
  totalMaterialWeight: number,
  materialCost: number,
  cuttingCost: number,
  foldingCost: number,
  drillingCost: number,
  weldingCost: number,
  chamferingCost: number,
  totalWeldLength: number,
  overheadCost: number,
  profitCost: number,
  totalCost: number,
  discountPct: number,
  quotedPrice: number,
) {
  const actor = await getActor();
  return actor.updateFlexibleJob(
    id,
    description,
    materialTab,
    centerLength,
    sheetBunchWidth,
    sheetThickness,
    BigInt(sheetCountVal),
    barsSupplied,
    barLength,
    barWidth,
    barThickness,
    BigInt(numberOfDrillsVal),
    BigInt(numberOfFoldsVal),
    sheetStackWeight,
    stripWeight,
    bar1Weight,
    bar2Weight,
    totalMaterialWeight,
    materialCost,
    cuttingCost,
    foldingCost,
    drillingCost,
    weldingCost,
    chamferingCost,
    totalWeldLength,
    overheadCost,
    profitCost,
    totalCost,
    discountPct,
    quotedPrice,
  );
}

export async function deleteFlexibleJob(id: string) {
  const actor = await getActor();
  return actor.deleteFlexibleJob(id);
}

// ===== Aluminium Welding Jobs =====
export async function getAlWeldingJobs() {
  const actor = await getActor();
  return actor.getAlWeldingJobs();
}

export async function saveAlWeldingJob(
  description: string,
  numJoints: bigint,
  numBrackets: bigint,
  numDummy: bigint,
  weldLengthEachMm: number,
  thickness: number,
  laborCostPer2mm: number,
  totalFullLength: number,
  totalWeldLines: bigint,
  adjustedLaborCost: number,
  totalCost: number,
  costPerFullLength: number,
) {
  const actor = await getActor();
  return actor.saveAlWeldingJob(
    description,
    numJoints,
    numBrackets,
    numDummy,
    weldLengthEachMm,
    thickness,
    laborCostPer2mm,
    totalFullLength,
    totalWeldLines,
    adjustedLaborCost,
    totalCost,
    costPerFullLength,
  );
}

export async function deleteAlWeldingJob(id: string) {
  const actor = await getActor();
  return actor.deleteAlWeldingJob(id);
}
