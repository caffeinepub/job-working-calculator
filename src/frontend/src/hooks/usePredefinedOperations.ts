import { useState } from "react";

const STORAGE_KEY = "jobcalc_predefined_ops";

export type MachiningOpType =
  | "drilling"
  | "tapping"
  | "countersink"
  | "milling"
  | "other";

export interface PredefinedOperation {
  id: string;
  name: string;
  opType: MachiningOpType;
  // Drilling
  drillDia?: number;
  matThickness?: number;
  // Tapping
  tapSize?: string;
  // Countersink
  csDia?: number;
  // Milling
  slotLength?: number;
  // Other
  otherCostPerUnit?: number;
  defaultGrade: "SS304" | "SS310";
}

function load(): PredefinedOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PredefinedOperation[];
  } catch {
    // ignore
  }
  return [];
}

function persist(ops: PredefinedOperation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export function usePredefinedOperations() {
  const [operations, setOperations] = useState<PredefinedOperation[]>(load);

  const addOperation = (op: Omit<PredefinedOperation, "id">) => {
    const newOp: PredefinedOperation = {
      ...op,
      id: `op_${Date.now()}`,
    };
    setOperations((prev) => {
      const next = [...prev, newOp];
      persist(next);
      return next;
    });
  };

  const removeOperation = (id: string) => {
    setOperations((prev) => {
      const next = prev.filter((o) => o.id !== id);
      persist(next);
      return next;
    });
  };

  return { operations, addOperation, removeOperation };
}
