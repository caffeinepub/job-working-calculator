import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActor } from "../actorSingleton";

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
    mutationFn: async (data: {
      materialId: string;
      index: bigint | number;
    }) => {
      const actor = await getActor();
      return actor.deleteRateHistoryEntry(data.materialId, BigInt(data.index));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getJobs();
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const actor = await getActor();
      return actor.getJob(id);
    },
    enabled: !!id,
  });
}

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      laborRate: number;
      transportIncluded: boolean;
      customerId: string | null;
      transportCost: number;
      dispatchQty: number;
      jobLineItems: Array<{
        finalPrice: number;
        lengthMeters: number;
        rawWeight: number;
        materialId: string;
        totalWeight: number;
      }>;
      weldingLineItems: Array<{
        finalPrice: number;
        ratePerKg: number;
        weightKg: number;
        grade: string;
      }>;
      totalFinalPrice: number;
      totalProductWeight: number;
      ratePerKg: number;
    }) => {
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
    mutationFn: async (data: {
      id: string;
      name: string;
      laborRate: number;
      transportIncluded: boolean;
      customerId: string | null;
      transportCost: number;
      dispatchQty: number;
      jobLineItems: Array<{
        finalPrice: number;
        lengthMeters: number;
        rawWeight: number;
        materialId: string;
        totalWeight: number;
      }>;
      weldingLineItems: Array<{
        finalPrice: number;
        ratePerKg: number;
        weightKg: number;
        grade: string;
      }>;
      totalFinalPrice: number;
      totalProductWeight: number;
      ratePerKg: number;
    }) => {
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
      centerLength: number;
      sheetBunchWidth: number;
      sheetThickness: number;
      sheetCount: bigint;
      barsSupplied: boolean;
      barLength: number;
      barWidth: number;
      barThickness: number;
      numberOfDrills: bigint;
      numberOfFolds: bigint;
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
    }) => {
      const actor = await getActor();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).saveFlexibleJob(
        data.description,
        data.customerId,
        data.materialTab,
        data.centerLength,
        data.sheetBunchWidth,
        data.sheetThickness,
        data.sheetCount,
        data.barsSupplied,
        data.barLength,
        data.barWidth,
        data.barThickness,
        data.numberOfDrills,
        data.numberOfFolds,
        data.sheetStackWeight,
        data.stripWeight,
        data.bar1Weight,
        data.bar2Weight,
        data.totalMaterialWeight,
        data.materialCost,
        data.cuttingCost,
        data.foldingCost,
        data.drillingCost,
        data.weldingCost,
        data.chamferingCost,
        data.totalWeldLength,
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
