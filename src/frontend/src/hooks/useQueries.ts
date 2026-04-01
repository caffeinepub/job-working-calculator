import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCustomer,
  addMaterial,
  deleteAlWeldingJob,
  deleteCustomer,
  deleteFlexibleJob,
  deleteJob,
  deleteLabourJob,
  deleteMaterial,
  deleteRateHistoryEntry,
  getAlWeldingJobs,
  getCustomers,
  getFlexibleJobs,
  getJob,
  getJobs,
  getLabourJobs,
  getMaterials,
  saveAlWeldingJob,
  saveFlexibleJob,
  saveJob,
  saveLabourJob,
  updateCustomer,
  updateFlexibleJob,
  updateJob,
  updateMaterial,
} from "../icpDB";

export function useMaterials() {
  return useQuery({ queryKey: ["materials"], queryFn: () => getMaterials() });
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
    }) =>
      addMaterial(
        data.grade,
        data.materialType,
        data.size,
        data.weightPerMeter,
        data.currentRate,
      ),
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
    }) =>
      updateMaterial(
        data.id,
        data.grade,
        data.materialType,
        data.size,
        data.weightPerMeter,
        data.currentRate,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteMaterial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteRateHistoryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { materialId: string; index: bigint }) =>
      deleteRateHistoryEntry(data.materialId, data.index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: () => getCustomers() });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => addCustomer(data.name, data.phone, data.email, data.address),
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
    }) =>
      updateCustomer(data.id, data.name, data.phone, data.email, data.address),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useJobs() {
  return useQuery({ queryKey: ["jobs"], queryFn: () => getJobs() });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
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
        materialId: string;
        lengthMeters: number;
        rawWeight: number;
        totalWeight: number;
        finalPrice: number;
      }>;
      weldingLineItems: Array<{
        grade: string;
        ratePerKg: number;
        weightKg: number;
        finalPrice: number;
      }>;
      totalFinalPrice: number;
      totalProductWeight: number;
      ratePerKg: number;
    }) =>
      saveJob(
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
      ),
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
        materialId: string;
        lengthMeters: number;
        rawWeight: number;
        totalWeight: number;
        finalPrice: number;
      }>;
      weldingLineItems: Array<{
        grade: string;
        ratePerKg: number;
        weightKg: number;
        finalPrice: number;
      }>;
      totalFinalPrice: number;
      totalProductWeight: number;
      ratePerKg: number;
    }) =>
      updateJob(
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
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useLabourJobs() {
  return useQuery({ queryKey: ["labourJobs"], queryFn: () => getLabourJobs() });
}

export function useSaveLabourJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      materialType: string;
      weldLength: number;
      laborRate: number;
      totalCost: number;
    }) =>
      saveLabourJob(
        data.description,
        data.materialType,
        data.weldLength,
        data.laborRate,
        data.totalCost,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labourJobs"] }),
  });
}

export function useDeleteLabourJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteLabourJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labourJobs"] }),
  });
}

export function useFlexibleJobs() {
  return useQuery({
    queryKey: ["flexibleJobs"],
    queryFn: () => getFlexibleJobs(),
  });
}

export function useSaveFlexibleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
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
      discountPct: number;
      quotedPrice: number;
    }) =>
      saveFlexibleJob(
        data.description,
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
        data.discountPct,
        data.quotedPrice,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flexibleJobs"] }),
  });
}

export function useUpdateFlexibleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      oldId: string;
      description: string;
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
      discountPct: number;
      quotedPrice: number;
    }) =>
      updateFlexibleJob(
        data.oldId,
        data.description,
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
        data.discountPct,
        data.quotedPrice,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flexibleJobs"] }),
  });
}

export function useDeleteFlexibleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteFlexibleJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flexibleJobs"] }),
  });
}

export function useAlWeldingJobs() {
  return useQuery({
    queryKey: ["alWeldingJobs"],
    queryFn: () => getAlWeldingJobs(),
  });
}

export function useSaveAlWeldingJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
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
    }) =>
      saveAlWeldingJob(
        data.description,
        BigInt(data.numJoints),
        BigInt(data.numBrackets),
        BigInt(data.numDummy),
        data.weldLengthEachMm,
        data.thickness,
        data.laborCostPer2mm,
        data.totalFullLength,
        BigInt(data.totalWeldLines),
        data.adjustedLaborCost,
        data.totalCost,
        data.costPerFullLength,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alWeldingJobs"] }),
  });
}

export function useDeleteAlWeldingJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteAlWeldingJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alWeldingJobs"] }),
  });
}
