// localStorageDB.ts
// Complete localStorage-based data layer replacing ICP actor calls.
// All data is stored as plain JSON (numbers, not bigints).
// Exported functions return data shaped exactly like the ICP backend types.

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ──────────────────────────────────────────────
// Storage key constants
// ──────────────────────────────────────────────
const KEYS = {
  materials: "lsdb_materials",
  customers: "lsdb_customers",
  jobs: "lsdb_jobs",
  labourJobs: "lsdb_labourJobs",
  flexibleJobs: "lsdb_flexibleJobs",
  alWeldingJobs: "lsdb_alWeldingJobs",
};

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ──────────────────────────────────────────────
// Types (stored as plain JSON)
// ──────────────────────────────────────────────
interface StoredRateHistoryEntry {
  changedAt: number;
  rate: number;
}
interface StoredRawMaterial {
  id: string;
  createdAt: number;
  grade: string;
  materialType: string;
  size: string;
  weightPerMeter: number;
  currentRate: number;
  rateHistory: StoredRateHistoryEntry[];
}
interface StoredCustomer {
  id: string;
  createdAt: number;
  name: string;
  phone: string;
  email: string;
  address: string;
}
interface StoredJobLineItem {
  materialId: string;
  lengthMeters: number;
  rawWeight: number;
  totalWeight: number;
  finalPrice: number;
}
interface StoredWeldingLineItem {
  grade: string;
  weightKg: number;
  ratePerKg: number;
  finalPrice: number;
}
interface StoredJob {
  id: string;
  createdAt: number;
  name: string;
  laborRate: number;
  transportIncluded: boolean;
  customerId: string | null;
  transportCost: number;
  dispatchQty: number;
  jobLineItems: StoredJobLineItem[];
  weldingLineItems: StoredWeldingLineItem[];
  totalFinalPrice: number;
  totalProductWeight: number;
  ratePerKg: number;
}
interface StoredLabourJob {
  id: string;
  createdAt: number;
  description: string;
  customerId: string | null;
  materialType: string;
  weldLength: number;
  laborRate: number;
  totalCost: number;
}
interface StoredFlexibleJob {
  id: string;
  createdAt: number;
  description: string;
  customerId: string | null;
  materialTab: string;
  centerLength: number;
  sheetBunchWidth: number;
  sheetThickness: number;
  sheetCount: number;
  barsSupplied: boolean;
  barLength: number;
  barWidth: number;
  barThickness: number;
  numberOfDrills: number;
  numberOfFolds: number;
  sheetStackWeight: number;
  stripWeight: number;
  bar1Weight: number;
  bar2Weight: number;
  totalMaterialWeight: number;
  materialCost: number;
  cuttingCost: number;
  foldingCost: number;
  drillingCost: number;
  weldingCost: number;
  chamferingCost: number;
  totalWeldLength: number;
  overheadCost: number;
  profitCost: number;
  totalCost: number;
  discountPct: number;
  quotedPrice: number;
}
interface StoredAlWeldingJob {
  id: string;
  createdAt: number;
  description: string;
  numJoints: number;
  numBrackets: number;
  numDummy: number;
  weldLengthEachMm: number;
  thickness: number;
  laborCostPer2mm: number;
  totalFullLength: number;
  totalWeldLines: number;
  adjustedLaborCost: number;
  totalCost: number;
  costPerFullLength: number;
}

// ──────────────────────────────────────────────
// Converters: stored → returned (with bigints)
// ──────────────────────────────────────────────
function toRawMaterial(m: StoredRawMaterial) {
  return {
    ...m,
    createdAt: BigInt(m.createdAt),
    rateHistory: m.rateHistory.map((r) => ({
      ...r,
      changedAt: BigInt(r.changedAt),
    })),
  };
}
function toCustomer(c: StoredCustomer) {
  return { ...c, createdAt: BigInt(c.createdAt) };
}
function toJob(j: StoredJob) {
  return {
    job: {
      id: j.id,
      name: j.name,
      createdAt: BigInt(j.createdAt),
      laborRate: j.laborRate,
      transportIncluded: j.transportIncluded,
      customerId: j.customerId ?? undefined,
      transportCost: j.transportCost,
      dispatchQty: j.dispatchQty,
    },
    customerName: undefined,
    jobLineItems: j.jobLineItems,
    weldingLineItems: j.weldingLineItems,
    totalFinalPrice: j.totalFinalPrice,
    totalProductWeight: j.totalProductWeight,
    ratePerKg: j.ratePerKg,
  };
}
function toLabourJob(j: StoredLabourJob) {
  return {
    ...j,
    createdAt: BigInt(j.createdAt),
    customerId: j.customerId ?? undefined,
    customerName: undefined,
  };
}
function toFlexibleJob(j: StoredFlexibleJob) {
  return {
    ...j,
    createdAt: BigInt(j.createdAt),
    sheetCount: BigInt(j.sheetCount),
    numberOfDrills: BigInt(j.numberOfDrills),
    numberOfFolds: BigInt(j.numberOfFolds),
    customerId: j.customerId ?? undefined,
    customerName: undefined,
  };
}
function toAlWeldingJob(j: StoredAlWeldingJob) {
  return {
    ...j,
    createdAt: BigInt(j.createdAt),
    numJoints: BigInt(j.numJoints),
    numBrackets: BigInt(j.numBrackets),
    numDummy: BigInt(j.numDummy),
    totalWeldLines: BigInt(j.totalWeldLines),
  };
}

// ──────────────────────────────────────────────
// RAW MATERIALS
// ──────────────────────────────────────────────
export function getMaterials() {
  return load<StoredRawMaterial>(KEYS.materials).map(toRawMaterial);
}

export function addMaterial(
  grade: string,
  materialType: string,
  size: string,
  weightPerMeter: number,
  currentRate: number,
) {
  const items = load<StoredRawMaterial>(KEYS.materials);
  const item: StoredRawMaterial = {
    id: genId(),
    createdAt: Date.now(),
    grade,
    materialType,
    size,
    weightPerMeter,
    currentRate,
    rateHistory: [{ changedAt: Date.now(), rate: currentRate }],
  };
  items.push(item);
  save(KEYS.materials, items);
  return toRawMaterial(item);
}

export function updateMaterial(
  id: string,
  grade: string,
  materialType: string,
  size: string,
  weightPerMeter: number,
  currentRate: number,
) {
  const items = load<StoredRawMaterial>(KEYS.materials);
  const idx = items.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error(`Material ${id} not found`);
  const prev = items[idx];
  const rateHistory = [...prev.rateHistory];
  if (prev.currentRate !== currentRate) {
    rateHistory.push({ changedAt: Date.now(), rate: currentRate });
  }
  items[idx] = {
    ...prev,
    grade,
    materialType,
    size,
    weightPerMeter,
    currentRate,
    rateHistory,
  };
  save(KEYS.materials, items);
  return toRawMaterial(items[idx]);
}

export function deleteMaterial(id: string) {
  const items = load<StoredRawMaterial>(KEYS.materials);
  save(
    KEYS.materials,
    items.filter((m) => m.id !== id),
  );
  return true;
}

export function deleteRateHistoryEntry(
  materialId: string,
  index: bigint | number,
) {
  const items = load<StoredRawMaterial>(KEYS.materials);
  const idx = items.findIndex((m) => m.id === materialId);
  if (idx === -1) throw new Error(`Material ${materialId} not found`);
  const i = Number(index);
  items[idx].rateHistory.splice(i, 1);
  save(KEYS.materials, items);
  return toRawMaterial(items[idx]);
}

// ──────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────
export function getCustomers() {
  return load<StoredCustomer>(KEYS.customers).map(toCustomer);
}

export function addCustomer(
  name: string,
  phone: string,
  email: string,
  address: string,
) {
  const items = load<StoredCustomer>(KEYS.customers);
  const item: StoredCustomer = {
    id: genId(),
    createdAt: Date.now(),
    name,
    phone,
    email,
    address,
  };
  items.push(item);
  save(KEYS.customers, items);
  return toCustomer(item);
}

export function updateCustomer(
  id: string,
  name: string,
  phone: string,
  email: string,
  address: string,
) {
  const items = load<StoredCustomer>(KEYS.customers);
  const idx = items.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Customer ${id} not found`);
  items[idx] = { ...items[idx], name, phone, email, address };
  save(KEYS.customers, items);
  return toCustomer(items[idx]);
}

export function deleteCustomer(id: string) {
  save(
    KEYS.customers,
    load<StoredCustomer>(KEYS.customers).filter((c) => c.id !== id),
  );
  return true;
}

// ──────────────────────────────────────────────
// JOBS (SS Fabrication)
// ──────────────────────────────────────────────
export function getJobs() {
  return load<StoredJob>(KEYS.jobs).map(toJob);
}

export function getJob(id: string) {
  const items = load<StoredJob>(KEYS.jobs);
  const item = items.find((j) => j.id === id);
  if (!item) throw new Error(`Job ${id} not found`);
  return toJob(item);
}

export function saveJob(
  name: string,
  laborRate: number,
  transportIncluded: boolean,
  customerId: string | null | ([] | [string]),
  transportCost: number,
  dispatchQty: number,
  jobLineItems: StoredJobLineItem[],
  weldingLineItems: StoredWeldingLineItem[],
  totalFinalPrice: number,
  totalProductWeight: number,
  ratePerKg: number,
) {
  const items = load<StoredJob>(KEYS.jobs);
  // Handle both ICP optional format (["id"] or []) and plain string/null
  const custId: string | null = Array.isArray(customerId)
    ? customerId.length > 0
      ? String(customerId[0])
      : null
    : customerId != null
      ? String(customerId)
      : null;
  const item: StoredJob = {
    id: genId(),
    createdAt: Date.now(),
    name,
    laborRate,
    transportIncluded,
    customerId: custId,
    transportCost,
    dispatchQty,
    jobLineItems,
    weldingLineItems,
    totalFinalPrice,
    totalProductWeight,
    ratePerKg,
  };
  items.push(item);
  save(KEYS.jobs, items);
  return toJob(item);
}

export function updateJob(
  id: string,
  name: string,
  laborRate: number,
  transportIncluded: boolean,
  customerId: string | null | ([] | [string]),
  transportCost: number,
  dispatchQty: number,
  jobLineItems: StoredJobLineItem[],
  weldingLineItems: StoredWeldingLineItem[],
  totalFinalPrice: number,
  totalProductWeight: number,
  ratePerKg: number,
) {
  const items = load<StoredJob>(KEYS.jobs);
  const idx = items.findIndex((j) => j.id === id);
  if (idx === -1) throw new Error(`Job ${id} not found`);
  const custId: string | null = Array.isArray(customerId)
    ? customerId.length > 0
      ? String(customerId[0])
      : null
    : customerId != null
      ? String(customerId)
      : null;
  items[idx] = {
    ...items[idx],
    name,
    laborRate,
    transportIncluded,
    customerId: custId,
    transportCost,
    dispatchQty,
    jobLineItems,
    weldingLineItems,
    totalFinalPrice,
    totalProductWeight,
    ratePerKg,
  };
  save(KEYS.jobs, items);
  return toJob(items[idx]);
}

export function deleteJob(id: string) {
  save(
    KEYS.jobs,
    load<StoredJob>(KEYS.jobs).filter((j) => j.id !== id),
  );
  return true;
}

// ──────────────────────────────────────────────
// LABOUR JOBS
// ──────────────────────────────────────────────
export function getLabourJobs() {
  return load<StoredLabourJob>(KEYS.labourJobs).map(toLabourJob);
}

export function saveLabourJob(
  description: string,
  customerId: string | null | ([] | [string]),
  materialType: string,
  weldLength: number,
  laborRate: number,
  totalCost: number,
) {
  const items = load<StoredLabourJob>(KEYS.labourJobs);
  const custId: string | null = Array.isArray(customerId)
    ? customerId.length > 0
      ? String(customerId[0])
      : null
    : customerId != null
      ? String(customerId)
      : null;
  const item: StoredLabourJob = {
    id: genId(),
    createdAt: Date.now(),
    description,
    customerId: custId,
    materialType,
    weldLength,
    laborRate,
    totalCost,
  };
  items.push(item);
  save(KEYS.labourJobs, items);
  return toLabourJob(item);
}

export function deleteLabourJob(id: string) {
  save(
    KEYS.labourJobs,
    load<StoredLabourJob>(KEYS.labourJobs).filter((j) => j.id !== id),
  );
  return true;
}

// ──────────────────────────────────────────────
// FLEXIBLE JOBS
// ──────────────────────────────────────────────
export function getFlexibleJobs() {
  return load<StoredFlexibleJob>(KEYS.flexibleJobs).map(toFlexibleJob);
}

export function saveFlexibleJob(
  description: string,
  customerId: string | null | ([] | [string]),
  materialTab: string,
  centerLength: number,
  sheetBunchWidth: number,
  sheetThickness: number,
  sheetCount: bigint | number,
  barsSupplied: boolean,
  barLength: number,
  barWidth: number,
  barThickness: number,
  numberOfDrills: bigint | number,
  numberOfFolds: bigint | number,
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
  const items = load<StoredFlexibleJob>(KEYS.flexibleJobs);
  const custId: string | null = Array.isArray(customerId)
    ? customerId.length > 0
      ? String(customerId[0])
      : null
    : customerId != null
      ? String(customerId)
      : null;
  const item: StoredFlexibleJob = {
    id: genId(),
    createdAt: Date.now(),
    description,
    customerId: custId,
    materialTab,
    centerLength,
    sheetBunchWidth,
    sheetThickness,
    sheetCount: Number(sheetCount),
    barsSupplied,
    barLength,
    barWidth,
    barThickness,
    numberOfDrills: Number(numberOfDrills),
    numberOfFolds: Number(numberOfFolds),
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
  };
  items.push(item);
  save(KEYS.flexibleJobs, items);
  return toFlexibleJob(item);
}

export function updateFlexibleJob(
  oldId: string,
  description: string,
  materialTab: string,
  centerLength: number,
  sheetBunchWidth: number,
  sheetThickness: number,
  sheetCount: bigint | number,
  barsSupplied: boolean,
  barLength: number,
  barWidth: number,
  barThickness: number,
  numberOfDrills: bigint | number,
  numberOfFolds: bigint | number,
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
  const items = load<StoredFlexibleJob>(KEYS.flexibleJobs);
  const idx = items.findIndex((j) => j.id === oldId);
  if (idx === -1) throw new Error(`FlexibleJob ${oldId} not found`);
  items[idx] = {
    ...items[idx],
    description,
    materialTab,
    centerLength,
    sheetBunchWidth,
    sheetThickness,
    sheetCount: Number(sheetCount),
    barsSupplied,
    barLength,
    barWidth,
    barThickness,
    numberOfDrills: Number(numberOfDrills),
    numberOfFolds: Number(numberOfFolds),
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
  };
  save(KEYS.flexibleJobs, items);
  return toFlexibleJob(items[idx]);
}

export function deleteFlexibleJob(id: string) {
  save(
    KEYS.flexibleJobs,
    load<StoredFlexibleJob>(KEYS.flexibleJobs).filter((j) => j.id !== id),
  );
  return true;
}

// ──────────────────────────────────────────────
// AL WELDING JOBS
// ──────────────────────────────────────────────
export function getAlWeldingJobs() {
  return load<StoredAlWeldingJob>(KEYS.alWeldingJobs).map(toAlWeldingJob);
}

export function saveAlWeldingJob(
  description: string,
  numJoints: bigint | number,
  numBrackets: bigint | number,
  numDummy: bigint | number,
  weldLengthEachMm: number,
  thickness: number,
  laborCostPer2mm: number,
  totalFullLength: number,
  totalWeldLines: bigint | number,
  adjustedLaborCost: number,
  totalCost: number,
  costPerFullLength: number,
) {
  const items = load<StoredAlWeldingJob>(KEYS.alWeldingJobs);
  const item: StoredAlWeldingJob = {
    id: genId(),
    createdAt: Date.now(),
    description,
    numJoints: Number(numJoints),
    numBrackets: Number(numBrackets),
    numDummy: Number(numDummy),
    weldLengthEachMm,
    thickness,
    laborCostPer2mm,
    totalFullLength,
    totalWeldLines: Number(totalWeldLines),
    adjustedLaborCost,
    totalCost,
    costPerFullLength,
  };
  items.push(item);
  save(KEYS.alWeldingJobs, items);
  return toAlWeldingJob(item);
}

export function deleteAlWeldingJob(id: string) {
  save(
    KEYS.alWeldingJobs,
    load<StoredAlWeldingJob>(KEYS.alWeldingJobs).filter((j) => j.id !== id),
  );
  return true;
}

// ──────────────────────────────────────────────
// BACKUP / RESTORE helpers
// ──────────────────────────────────────────────
export function getAllDataForBackup() {
  return {
    materials: load<StoredRawMaterial>(KEYS.materials),
    customers: load<StoredCustomer>(KEYS.customers),
    jobs: load<StoredJob>(KEYS.jobs),
    labourJobs: load<StoredLabourJob>(KEYS.labourJobs),
    flexibleJobs: load<StoredFlexibleJob>(KEYS.flexibleJobs),
    alWeldingJobs: load<StoredAlWeldingJob>(KEYS.alWeldingJobs),
    exportedAt: new Date().toISOString(),
  };
}

export function restoreFromBackup(data: any) {
  if (Array.isArray(data.materials)) save(KEYS.materials, data.materials);
  if (Array.isArray(data.customers)) save(KEYS.customers, data.customers);
  if (Array.isArray(data.jobs)) save(KEYS.jobs, data.jobs);
  if (Array.isArray(data.labourJobs)) save(KEYS.labourJobs, data.labourJobs);
  if (Array.isArray(data.flexibleJobs))
    save(KEYS.flexibleJobs, data.flexibleJobs);
  if (Array.isArray(data.alWeldingJobs))
    save(KEYS.alWeldingJobs, data.alWeldingJobs);
}
