import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActor } from "../actorSingleton";
import type { JobLineItem, WeldingLineItem } from "../backend";

// ── Materials ────────────────────────────────────────────────────────────────

export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getMaterials();
    },
  });
}

export function useAddMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      grade: string;
      materialType: string;
      size: string;
      weightPerMeter: number;
      currentRate: number;
    }) => {
      const actor = await getActor();
      return actor.addMaterial(
        data.grade,
        data.materialType,
        data.size,
        data.weightPerMeter,
        data.currentRate,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      grade: string;
      materialType: string;
      size: string;
      weightPerMeter: number;
      currentRate: number;
    }) => {
      const actor = await getActor();
      return actor.updateMaterial(
        data.id,
        data.grade,
        data.materialType,
        data.size,
        data.weightPerMeter,
        data.currentRate,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const actor = await getActor();
      return actor.deleteMaterial(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteRateHistoryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { materialId: string; index: number }) => {
      const actor = await getActor();
      return actor.deleteRateHistoryEntry(data.materialId, BigInt(data.index));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getJobs();
    },
  });
}

type SaveJobPayload = {
  name: string;
  laborRate: number;
  transportIncluded: boolean;
  transportCost: number;
  dispatchQty: number;
  customerId: string | null;
  jobLineItems: JobLineItem[];
  weldingLineItems: WeldingLineItem[];
  totalFinalPrice: number;
  totalProductWeight: number;
  ratePerKg: number;
};

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveJobPayload) => {
      const actor = await getActor();
      return actor.saveJob(
        data.name,
        data.laborRate,
        data.transportIncluded,
        data.customerId,
        data.transportCost,
        data.dispatchQty,
        data.jobLineItems,
        data.weldingLineItems,
        data.totalFinalPrice,
        data.totalProductWeight,
        data.ratePerKg,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveJobPayload & { id: string }) => {
      const actor = await getActor();
      return actor.updateJob(
        data.id,
        data.name,
        data.laborRate,
        data.transportIncluded,
        data.customerId,
        data.transportCost,
        data.dispatchQty,
        data.jobLineItems,
        data.weldingLineItems,
        data.totalFinalPrice,
        data.totalProductWeight,
        data.ratePerKg,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const actor = await getActor();
      return actor.deleteJob(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

// ── Customers ────────────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getCustomers();
    },
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      const actor = await getActor();
      return actor.addCustomer(data.name, data.phone, data.email, data.address);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      const actor = await getActor();
      return actor.updateCustomer(
        data.id,
        data.name,
        data.phone,
        data.email,
        data.address,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const actor = await getActor();
      return actor.deleteCustomer(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

// ── Labour ───────────────────────────────────────────────────────────────────

export function useLabourJobs() {
  return useQuery({
    queryKey: ["labourJobs"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getLabourJobs();
    },
  });
}

export function useSaveLabourJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      customerId: string | null;
      materialType: string;
      weldLength: number;
      laborRate: number;
      totalCost: number;
    }) => {
      const actor = await getActor();
      return actor.saveLabourJob(
        data.description,
        data.customerId,
        data.materialType,
        data.weldLength,
        data.laborRate,
        data.totalCost,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labourJobs"] }),
  });
}

export function useDeleteLabourJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const actor = await getActor();
      return actor.deleteLabourJob(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labourJobs"] }),
  });
}

// ── Flexibles ─────────────────────────────────────────────────────────────────

export function useFlexibleJobs() {
  return useQuery({
    queryKey: ["flexibleJobs"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getFlexibleJobs();
    },
  });
}

export function useSaveFlexibleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      customerId: string | null;
      materialTab: string;
      sheetBunchWidth: number;
      thickness: number;
      numBars: bigint;
      weldingCost: number;
      chamferingCost: number;
      overheadCost: number;
      profitCost: number;
      totalCost: number;
    }) => {
      const actor = await getActor();
      return actor.saveFlexibleJob(
        data.description,
        data.customerId,
        data.materialTab,
        data.sheetBunchWidth,
        data.thickness,
        data.numBars,
        data.weldingCost,
        data.chamferingCost,
        data.overheadCost,
        data.profitCost,
        data.totalCost,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flexibleJobs"] }),
  });
}

export function useDeleteFlexibleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const actor = await getActor();
      return actor.deleteFlexibleJob(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flexibleJobs"] }),
  });
}
