import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RawMaterial } from "../backend";
import { useActor } from "./useActor";

export function useMaterials() {
  const { actor, isFetching } = useActor();
  return useQuery<RawMaterial[]>({
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
