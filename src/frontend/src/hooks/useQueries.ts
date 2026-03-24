import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobLineItem, WeldingLineItem } from "../backend";
import { useActor } from "./useActor";

export function useMaterials() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMaterials();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddMaterial() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      grade: string;
      materialType: string;
      size: string;
      weightPerMeter: number;
      currentRate: number;
    }) => {
      if (!actor) throw new Error("No actor");
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
  const { actor } = useActor();
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
      if (!actor) throw new Error("No actor");
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
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteMaterial(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteRateHistoryEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { materialId: string; index: number }) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteRateHistoryEntry(data.materialId, BigInt(data.index));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useJobs() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getJobs();
    },
    enabled: !!actor && !isFetching,
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
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveJobPayload) => {
      if (!actor) throw new Error("No actor");
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
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveJobPayload & { id: string }) => {
      if (!actor) throw new Error("No actor");
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
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteJob(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

// ── Customer hooks ──────────────────────────────────────────────────────────

export function useCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddCustomer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addCustomer(data.name, data.phone, data.email, data.address);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      if (!actor) throw new Error("No actor");
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
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteCustomer(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
