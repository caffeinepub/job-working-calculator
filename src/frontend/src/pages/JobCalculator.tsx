import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  Calculator,
  HelpCircle,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  Truck,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  JobLineItem,
  RawMaterial,
  SavedJob,
  WeldingLineItem,
} from "../backend";
import { loadFormulaSettings } from "../hooks/useFormulaSettings";
import type { FormulaSettings } from "../hooks/useFormulaSettings";
import { usePredefinedOperations } from "../hooks/usePredefinedOperations";
import {
  useCustomers,
  useJobs,
  useMaterials,
  useSaveJob,
  useUpdateJob,
} from "../hooks/useQueries";
import { isMachined, isWireMesh } from "../utils/weightCalculator";

// ── Types ──────────────────────────────────────────────────────────────────
interface MaterialRow {
  rowId: string;
  materialId: string;
  lengthMeters: number;
  // Wire Mesh shape inputs
  meshShape?: "rectangle" | "circle" | "open_box";
  meshL?: number;
  meshW?: number;
  meshH?: number;
  meshD?: number;
}

interface WeldingRow {
  rowId: string;
  grade: "SS304" | "SS310";
  weightKg: number;
}

interface MachiningRow {
  rowId: string;
  opType:
    | "drilling"
    | "tapping"
    | "countersink"
    | "milling"
    | "rolling"
    | "machining"
    | "other";
  // Drilling
  drillDia?: number;
  matThickness?: number;
  // Tapping
  tapSize?: "M6" | "M8" | "M10" | "M12" | "M16" | "M20";
  // Countersink
  csDia?: number;
  // Milling
  slotLength?: number;
  slotWidth?: number;
  // Other
  otherDesc?: string;
  otherCostPerUnit?: number;
  // Rolling
  rollingLength?: number;
  // Machining
  machiningDesc?: string;
  machiningCostPerUnit?: number;
  // Common
  grade: "SS304" | "SS310";
  qty: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function laborLabel(rate: number) {
  if (rate <= 90)
    return { label: "Easy", color: "bg-emerald-100 text-emerald-700" };
  if (rate <= 110)
    return { label: "Medium", color: "bg-amber-100 text-amber-700" };
  if (rate <= 130)
    return { label: "Hard", color: "bg-orange-100 text-orange-700" };
  return { label: "Complex", color: "bg-red-100 text-red-700" };
}

/** Compute wire mesh area in sqft based on row shape inputs */
function calcMeshAreaSqft(row: MaterialRow): number | null {
  const shape = row.meshShape ?? "rectangle";
  if (shape === "rectangle") {
    const l = row.meshL ?? 0;
    const w = row.meshW ?? 0;
    if (l <= 0 || w <= 0) return null;
    return (l * w) / 92903; // mm² to sqft
  }
  if (shape === "circle") {
    const d = row.meshD ?? 0;
    if (d <= 0) return null;
    return (d * d) / 92903; // bounding square
  }
  if (shape === "open_box") {
    const l = row.meshL ?? 0;
    const w = row.meshW ?? 0;
    const h = row.meshH ?? 0;
    if (l <= 0 || w <= 0 || h <= 0) return null;
    const rawL = l + 2 * h;
    const rawW = w + 2 * h;
    return (rawL * rawW) / 92903;
  }
  return null;
}

/** Per-row: compute material cost only (no labor/overhead/profit) */
function calcMaterialRow(
  mat: RawMaterial,
  lengthOrArea: number,
  wastageMultiplier = 1.12,
) {
  if (isMachined(mat.materialType)) {
    const materialCost = lengthOrArea * mat.currentRate * 2;
    return { rawWeight: 0, totalWeight: 0, materialCost };
  }
  if (isWireMesh(mat.materialType)) {
    const areaSqft = lengthOrArea;
    const MESH_WASTAGE = 1.22;
    const rawWeight = mat.weightPerMeter * areaSqft; // weightPerMeter is kg/sqft for mesh
    const totalWeight = rawWeight * MESH_WASTAGE;
    const materialCost = areaSqft * mat.currentRate * MESH_WASTAGE; // rate is ₹/sqft
    return { rawWeight, totalWeight, materialCost };
  }
  const rawWeight = mat.weightPerMeter * lengthOrArea;
  const totalWeight = rawWeight * wastageMultiplier;
  const materialCost = totalWeight * mat.currentRate;
  return { rawWeight, totalWeight, materialCost };
}

let rowCounter = 0;
function nextId() {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

// ── Machining cost helper (module-level) ──────────────────────────────────
function calcMachiningRow(
  row: MachiningRow,
  fs: FormulaSettings,
): { cost: number; weightRemovedKg: number } {
  const gradeMultiplier =
    row.grade === "SS310" ? fs.drillGradeMultiplierSS310 : 1;

  if (row.opType === "drilling") {
    const dia = row.drillDia ?? 0;
    const thk = row.matThickness ?? 0;
    if (dia <= 0 || thk <= 0) return { cost: 0, weightRemovedKg: 0 };
    const costPerHole =
      fs.drillBaseRateSS304 * (dia / 10) * (thk / 10) * gradeMultiplier;
    const weightPerHole = Math.PI * (dia / 2) ** 2 * thk * 7.93e-6;
    return {
      cost: costPerHole * row.qty,
      weightRemovedKg: weightPerHole * row.qty,
    };
  }

  if (row.opType === "tapping") {
    const rateMap: Record<string, number> = {
      M6: fs.tappingRateM6,
      M8: fs.tappingRateM8,
      M10: fs.tappingRateM10,
      M12: fs.tappingRateM12,
      M16: fs.tappingRateM16,
      M20: fs.tappingRateM20,
    };
    const rate = rateMap[row.tapSize ?? "M6"] ?? fs.tappingRateM6;
    return { cost: rate * gradeMultiplier * row.qty, weightRemovedKg: 0 };
  }

  if (row.opType === "countersink") {
    return {
      cost: fs.counterSinkRate * gradeMultiplier * row.qty,
      weightRemovedKg: 0,
    };
  }

  if (row.opType === "milling") {
    const length = row.slotLength ?? 0;
    if (length <= 0) return { cost: 0, weightRemovedKg: 0 };
    return {
      cost: fs.millingRatePerMm * length * gradeMultiplier * row.qty,
      weightRemovedKg: 0,
    };
  }

  if (row.opType === "other") {
    return { cost: (row.otherCostPerUnit ?? 0) * row.qty, weightRemovedKg: 0 };
  }

  if (row.opType === "rolling") {
    const length = row.rollingLength ?? 0;
    if (length <= 0) return { cost: 0, weightRemovedKg: 0 };
    return {
      cost: (fs.rollingRatePerMeter ?? 5) * length * gradeMultiplier * row.qty,
      weightRemovedKg: 0,
    };
  }

  if (row.opType === "machining") {
    return {
      cost: (row.machiningCostPerUnit ?? 0) * row.qty,
      weightRemovedKg: 0,
    };
  }

  return { cost: 0, weightRemovedKg: 0 };
}

// ── Component ──────────────────────────────────────────────────────────────
interface JobCalculatorProps {
  editJobOnMount?: SavedJob | null;
  onEditConsumed?: () => void;
}

export function JobCalculator({
  editJobOnMount,
  onEditConsumed,
}: JobCalculatorProps) {
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: customers = [] } = useCustomers();
  const { data: allJobs = [] } = useJobs();
  const saveJobMutation = useSaveJob();
  const updateJobMutation = useUpdateJob();

  const { operations: predefinedOps } = usePredefinedOperations();
  const formTopRef = useRef<HTMLDivElement>(null);

  const [jobName, setJobName] = useState("");
  const [laborRate, setLaborRate] = useState(100);
  const [transportIncluded, setTransportIncluded] = useState(false);
  const [transportCost, setTransportCost] = useState(0);
  const [dispatchQty, setDispatchQty] = useState("1");
  const [customerId, setCustomerId] = useState<string>("none");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [weldingRows, setWeldingRows] = useState<WeldingRow[]>([]);
  const [machiningRows, setMachiningRows] = useState<MachiningRow[]>([]);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Duplicate job name dialog state
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [dupExistingJob, setDupExistingJob] = useState<SavedJob | null>(null);
  const [dupNewName, setDupNewName] = useState("");

  // Load formula settings from localStorage (set in Formulas page)
  const fs = useMemo(() => loadFormulaSettings(), []);
  const WELDING_RATES = useMemo(
    () => ({ SS304: fs.weldingRateSS304, SS310: fs.weldingRateSS310 }),
    [fs],
  );
  const wastageMultiplier = useMemo(
    () => 1 + fs.invisibleWastagePct / 100 + fs.visibleWastagePct / 100,
    [fs],
  );
  const overheadRate = useMemo(() => fs.overheadPct / 100, [fs]);
  const profitRate = useMemo(() => fs.profitPct / 100, [fs]);

  // Load job for editing when passed from Job History
  useEffect(() => {
    if (!editJobOnMount) return;
    const sj = editJobOnMount;
    setJobName(sj.job.name);
    setLaborRate(sj.job.laborRate);
    setTransportIncluded(sj.job.transportIncluded);
    setTransportCost(sj.job.transportCost ?? 0);
    setDispatchQty(String(sj.job.dispatchQty ?? 1));
    setCustomerId(sj.job.customerId ?? "none");
    setMaterialRows(
      sj.jobLineItems.map((item) => ({
        rowId: nextId(),
        materialId: item.materialId,
        lengthMeters: item.lengthMeters,
        meshShape: "rectangle",
      })),
    );
    setWeldingRows(
      sj.weldingLineItems.map((item) => ({
        rowId: nextId(),
        grade: item.grade as "SS304" | "SS310",
        weightKg: item.weightKg,
      })),
    );
    setEditingJobId(sj.job.id);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    onEditConsumed?.();
  }, [editJobOnMount, onEditConsumed]);

  // ── Per-row calculations (material cost only) ────────────────────────────
  const matCalcs = useMemo(() => {
    return materialRows.map((row) => {
      const mat = materials.find((m) => m.id === row.materialId);
      if (!mat) return null;

      if (isMachined(mat.materialType)) {
        const qty = row.lengthMeters;
        if (qty <= 0) return null;
        return {
          ...calcMaterialRow(mat, qty, wastageMultiplier),
          mat,
          areaSqft: null,
        };
      }
      if (isWireMesh(mat.materialType)) {
        const areaSqft = calcMeshAreaSqft(row);
        if (areaSqft === null || areaSqft <= 0) return null;
        return {
          ...calcMaterialRow(mat, areaSqft, wastageMultiplier),
          mat,
          areaSqft,
        };
      }

      if (row.lengthMeters <= 0) return null;
      return {
        ...calcMaterialRow(mat, row.lengthMeters, wastageMultiplier),
        mat,
        areaSqft: null,
      };
    });
  }, [materialRows, materials, wastageMultiplier]);

  const weldCalcs = useMemo(() => {
    return weldingRows.map((row) => {
      if (row.weightKg <= 0) return null;
      const weldingCost = row.weightKg * WELDING_RATES[row.grade];
      return { weldingCost };
    });
  }, [weldingRows, WELDING_RATES]);

  const machiningCalcs = useMemo(() => {
    return machiningRows.map((row) => calcMachiningRow(row, fs));
  }, [machiningRows, fs]);

  // ── Aggregate summary — labor, overhead, profit calculated ONCE ──────────
  const summary = useMemo(() => {
    let totalMaterialCost = 0;
    let totalWeight = 0;
    let totalRawWeight = 0;
    for (const c of matCalcs) {
      if (c) {
        totalMaterialCost += c.materialCost;
        totalWeight += c.totalWeight;
        totalRawWeight += c.rawWeight;
      }
    }
    let weldingCost = 0;
    for (const c of weldCalcs) {
      if (c) weldingCost += c.weldingCost;
    }
    let totalMachiningCost = 0;
    let totalWeightRemoved = 0;
    for (const c of machiningCalcs) {
      totalMachiningCost += c.cost;
      totalWeightRemoved += c.weightRemovedKg;
    }
    const laborCost = totalWeight * laborRate + totalMachiningCost;
    const overhead =
      (totalMaterialCost + laborCost + weldingCost) * overheadRate;
    const profit =
      (totalMaterialCost + laborCost + weldingCost + overhead) * profitRate;
    const qty = Math.max(1, Math.round(Number.parseFloat(dispatchQty) || 1));
    const transportTotal = transportIncluded ? transportCost / qty : 0;
    const totalFinalPrice =
      totalMaterialCost +
      laborCost +
      weldingCost +
      overhead +
      profit +
      transportTotal;
    const totalWeldWeight = weldingRows.reduce(
      (sum, r) => sum + (r.weightKg || 0),
      0,
    );
    const totalProductWeight = Math.max(
      0,
      totalRawWeight - totalWeightRemoved + totalWeldWeight,
    );
    const ratePerKg =
      totalProductWeight > 0 ? totalFinalPrice / totalProductWeight : 0;
    return {
      totalMaterialCost,
      laborCost,
      weldingCost,
      overhead,
      profit,
      transportTotal,
      totalFinalPrice,
      totalProductWeight,
      ratePerKg,
      machiningCost: totalMachiningCost,
    };
  }, [
    matCalcs,
    weldCalcs,
    weldingRows,
    machiningCalcs,
    laborRate,
    transportIncluded,
    transportCost,
    overheadRate,
    profitRate,
    dispatchQty,
  ]);

  // ── Row mutations ────────────────────────────────────────────────────────
  const addMaterialRow = () => {
    if (materials.length === 0) return;
    const firstMat = materials[0];
    setMaterialRows((prev) => [
      ...prev,
      {
        rowId: nextId(),
        materialId: firstMat.id,
        lengthMeters: 0,
        meshShape: "rectangle",
      },
    ]);
  };

  const addWeldingRow = () => {
    setWeldingRows((prev) => [
      ...prev,
      { rowId: nextId(), grade: "SS304", weightKg: 0 },
    ]);
  };

  const removeMaterialRow = (rowId: string) =>
    setMaterialRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const removeWeldingRow = (rowId: string) =>
    setWeldingRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const updateMaterialRow = (rowId: string, patch: Partial<MaterialRow>) =>
    setMaterialRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)),
    );

  const updateWeldingRow = (rowId: string, patch: Partial<WeldingRow>) =>
    setWeldingRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)),
    );

  const addMachiningRow = () =>
    setMachiningRows((prev) => [
      ...prev,
      {
        rowId: nextId(),
        opType: "drilling",
        drillDia: 10,
        matThickness: 10,
        grade: "SS304",
        qty: 1,
      },
    ]);

  const removeMachiningRow = (rowId: string) =>
    setMachiningRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const updateMachiningRow = (rowId: string, patch: Partial<MachiningRow>) =>
    setMachiningRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)),
    );

  // ── Form reset ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setJobName("");
    setLaborRate(100);
    setTransportIncluded(false);
    setTransportCost(0);
    setDispatchQty("1");
    setCustomerId("none");
    setMaterialRows([]);
    setWeldingRows([]);
    setMachiningRows([]);
    setEditingJobId(null);
  };

  // ── Build save payload ───────────────────────────────────────────────────
  const buildPayload = () => {
    const jobLineItems: JobLineItem[] = matCalcs
      .map((c, i) => {
        if (!c) return null;
        const row = materialRows[i];
        const mat = materials.find((m) => m.id === row.materialId);
        const isMesh = mat ? isWireMesh(mat.materialType) : false;
        const savedLength = isMesh ? (c.areaSqft ?? 0) : row.lengthMeters;
        return {
          materialId: row.materialId,
          lengthMeters: savedLength,
          rawWeight: c.rawWeight,
          totalWeight: c.totalWeight,
          finalPrice: c.materialCost,
        };
      })
      .filter((x): x is JobLineItem => x !== null);

    const weldingLineItems: WeldingLineItem[] = weldingRows.map((row, i) => ({
      grade: row.grade,
      weightKg: row.weightKg,
      ratePerKg: WELDING_RATES[row.grade],
      finalPrice: weldCalcs[i]?.weldingCost ?? 0,
    }));

    return {
      name: jobName.trim(),
      laborRate,
      transportIncluded,
      transportCost: transportIncluded ? transportCost : 0,
      dispatchQty: transportIncluded
        ? Math.max(1, Math.round(Number.parseFloat(dispatchQty) || 1))
        : 1,
      customerId: customerId === "none" ? null : customerId,
      jobLineItems,
      weldingLineItems,
      totalFinalPrice: summary.totalFinalPrice,
      totalProductWeight: summary.totalProductWeight,
      ratePerKg: summary.ratePerKg,
    };
  };

  const validate = () => {
    if (!jobName.trim()) {
      toast.error("Please enter a job name");
      return false;
    }
    if (materialRows.length === 0 && weldingRows.length === 0) {
      toast.error("Add at least one material or welding item");
      return false;
    }
    return true;
  };

  const doSaveJob = async (overwriteId?: string) => {
    const payload = buildPayload();
    if (overwriteId) {
      // Overwrite: update the existing job (this sends old working to history via update)
      await updateJobMutation.mutateAsync({ id: overwriteId, ...payload });
    } else {
      await saveJobMutation.mutateAsync(payload);
    }
    toast.success("Job saved successfully!");
    setLastSavedAt(new Date());
    resetForm();
  };

  const handleSaveJob = async () => {
    if (!validate()) return;

    // Duplicate name check (skip when editing existing job)
    if (!editingJobId) {
      const trimmed = jobName.trim().toLowerCase();
      const duplicate = allJobs.find(
        (j) => j.job.name.trim().toLowerCase() === trimmed,
      );
      if (duplicate) {
        setDupExistingJob(duplicate);
        setDupNewName(jobName.trim());
        setDupDialogOpen(true);
        return;
      }
    }

    try {
      await doSaveJob();
    } catch {
      toast.error("Failed to save job");
    }
  };

  const handleDupOverwrite = async () => {
    if (!dupExistingJob) return;
    setDupDialogOpen(false);
    try {
      await doSaveJob(dupExistingJob.job.id);
    } catch {
      toast.error("Failed to save job");
    }
    setDupExistingJob(null);
  };

  const handleDupRename = async () => {
    const trimmed = dupNewName.trim();
    if (!trimmed) {
      toast.error("Please enter a new name");
      return;
    }
    // Check the new name isn't also a duplicate
    const stillDup = allJobs.find(
      (j) =>
        j.job.name.trim().toLowerCase() === trimmed.toLowerCase() &&
        j.job.id !== dupExistingJob?.job.id,
    );
    if (stillDup) {
      toast.error(
        "That name also already exists. Please choose a different name.",
      );
      return;
    }
    setDupDialogOpen(false);
    // Update the jobName and save with new name
    const originalName = jobName;
    try {
      // Temporarily mutate jobName for save by using dupNewName directly in payload
      const payload = { ...buildPayload(), name: trimmed };
      await saveJobMutation.mutateAsync(payload);
      toast.success("Job saved successfully!");
      setLastSavedAt(new Date());
      resetForm();
    } catch {
      toast.error("Failed to save job");
    }
    setDupExistingJob(null);
    setDupNewName("");
    void originalName;
  };

  const handleUpdateJob = async () => {
    if (!validate() || !editingJobId) return;
    try {
      await updateJobMutation.mutateAsync({
        id: editingJobId,
        ...buildPayload(),
      });
      toast.success("Job updated successfully!");
      setLastSavedAt(new Date());
      resetForm();
    } catch {
      toast.error("Failed to update job");
    }
  };

  const difficulty = laborLabel(laborRate);
  const hasAnyCalcs =
    matCalcs.some(Boolean) ||
    weldCalcs.some(Boolean) ||
    machiningCalcs.some((c) => c.cost > 0);
  const isMutating = saveJobMutation.isPending || updateJobMutation.isPending;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between" ref={formTopRef}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              SS Fabrication — Job Calculator
            </h1>
            <nav className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <span>Home</span>
              <span>/</span>
              <span className="text-foreground font-medium">
                SS Fabrication
              </span>
            </nav>
          </div>
          {editingJobId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Pencil size={14} />
              Editing job
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Calculator form */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Job Setup */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase size={16} className="text-primary" />
                  Job Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="job-name">Job Name</Label>
                    <Input
                      id="job-name"
                      placeholder="e.g. SS Railing - Phase 1"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      data-ocid="job.input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="job-customer">Customer</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger
                        id="job-customer"
                        data-ocid="job.customer.select"
                      >
                        <SelectValue placeholder="No Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Customer</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-2">
                    Labour Rate
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle
                            size={13}
                            className="text-muted-foreground cursor-help"
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-48 text-xs">
                          Based on job complexity: simple operations use a lower
                          rate, high-complexity work uses a higher rate.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Badge
                      className={`text-xs border-0 rounded-full px-2 py-0 ${difficulty.color}`}
                    >
                      {difficulty.label}
                    </Badge>
                    <span className="ml-auto font-semibold text-foreground">
                      ₹{laborRate}/kg
                    </span>
                  </Label>
                  <Slider
                    min={fs.laborRateMin}
                    max={fs.laborRateMax}
                    step={5}
                    value={[laborRate]}
                    onValueChange={([v]) => setLaborRate(v)}
                    className="mt-1"
                    data-ocid="job.labor_rate.toggle"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹{fs.laborRateMin}</span>
                    <span>₹{fs.laborRateMax}</span>
                  </div>
                </div>

                {/* Transport section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="transport"
                      checked={transportIncluded}
                      onCheckedChange={(v) => setTransportIncluded(v === true)}
                      data-ocid="job.transport.checkbox"
                    />
                    <Label
                      htmlFor="transport"
                      className="flex items-center gap-1.5 cursor-pointer font-normal"
                    >
                      <Truck size={14} className="text-muted-foreground" />
                      Include transport in this job's scope
                    </Label>
                  </div>

                  <AnimatePresence>
                    {transportIncluded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border ml-6">
                          <div className="flex flex-col gap-1.5">
                            <Label
                              htmlFor="dispatch-qty"
                              className="text-xs text-muted-foreground"
                            >
                              Dispatch Qty (units/order)
                            </Label>
                            <Input
                              id="dispatch-qty"
                              type="text"
                              inputMode="numeric"
                              placeholder="1"
                              value={dispatchQty}
                              onChange={(e) => setDispatchQty(e.target.value)}
                              onBlur={() =>
                                setDispatchQty(
                                  String(
                                    Math.max(
                                      1,
                                      Math.round(
                                        Number.parseFloat(dispatchQty) || 1,
                                      ),
                                    ),
                                  ),
                                )
                              }
                              className="h-8 text-sm font-mono"
                              data-ocid="job.dispatch_qty.input"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label
                              htmlFor="transport-cost"
                              className="text-xs text-muted-foreground"
                            >
                              Transport Cost / Order (₹)
                            </Label>
                            <Input
                              id="transport-cost"
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={transportCost || ""}
                              onChange={(e) =>
                                setTransportCost(
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8 text-sm font-mono"
                              data-ocid="job.transport_cost.input"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            {/* Material Line Items */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package size={16} className="text-primary" />
                    Material Line Items
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={addMaterialRow}
                    disabled={materialsLoading || materials.length === 0}
                    data-ocid="job.add_material.button"
                  >
                    <Plus size={13} />
                    Add Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {materialRows.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border"
                    data-ocid="job.material.empty_state"
                  >
                    <Package
                      size={32}
                      className="text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      No materials added yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Click "Add Material" to begin
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-48">
                            Material
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-48">
                            Dimension
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">
                            Raw Wt (kg)
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">
                            Total Wt (kg)
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                            Mat. Cost
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {materialRows.map((row, idx) => {
                            const calc = matCalcs[idx];
                            const mat = materials.find(
                              (m) => m.id === row.materialId,
                            );
                            const isMesh = isWireMesh(mat?.materialType ?? "");
                            const isMachined_ = isMachined(
                              mat?.materialType ?? "",
                            );
                            const meshShape = row.meshShape ?? "rectangle";
                            const areaSqft = isMesh
                              ? calcMeshAreaSqft(row)
                              : null;

                            // Machined items are shown in the Machining Operations section
                            if (isMachined_) return null;

                            return (
                              <motion.tr
                                key={row.rowId}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="border-b border-border/60"
                                data-ocid={`job.material.item.${idx + 1}`}
                              >
                                <TableCell className="py-2">
                                  <Select
                                    value={row.materialId}
                                    onValueChange={(v) => {
                                      const newMat = materials.find(
                                        (m) => m.id === v,
                                      );
                                      updateMaterialRow(row.rowId, {
                                        materialId: v,
                                        lengthMeters: 0,
                                        meshShape: "rectangle",
                                        meshL: undefined,
                                        meshW: undefined,
                                        meshH: undefined,
                                        meshD: undefined,
                                      });
                                      // suppress unused var warning
                                      void newMat;
                                    }}
                                  >
                                    <SelectTrigger
                                      className="h-8 text-xs"
                                      data-ocid={`job.material.select.${idx + 1}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 overflow-y-auto">
                                      {materialsLoading ? (
                                        <SelectItem value="loading" disabled>
                                          Loading…
                                        </SelectItem>
                                      ) : (
                                        materials.map((m) => (
                                          <SelectItem key={m.id} value={m.id}>
                                            {m.grade} · {m.materialType} ·{" "}
                                            {m.size}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* Dimension cell — differs for Wire Mesh / Machined */}
                                <TableCell className="py-2">
                                  {isMachined_ ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      placeholder="Qty"
                                      value={row.lengthMeters || ""}
                                      onChange={(e) =>
                                        updateMaterialRow(row.rowId, {
                                          lengthMeters:
                                            Number.parseFloat(e.target.value) ||
                                            0,
                                        })
                                      }
                                      className="h-8 text-xs font-mono"
                                      data-ocid={`job.material.qty.input.${idx + 1}`}
                                    />
                                  ) : !isMesh ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      placeholder="0.00"
                                      value={row.lengthMeters || ""}
                                      onChange={(e) =>
                                        updateMaterialRow(row.rowId, {
                                          lengthMeters:
                                            Number.parseFloat(e.target.value) ||
                                            0,
                                        })
                                      }
                                      className="h-8 text-xs font-mono"
                                      data-ocid={`job.material.length.input.${idx + 1}`}
                                    />
                                  ) : (
                                    <div className="flex flex-col gap-1.5">
                                      {/* Shape selector */}
                                      <Select
                                        value={meshShape}
                                        onValueChange={(v) =>
                                          updateMaterialRow(row.rowId, {
                                            meshShape: v as
                                              | "rectangle"
                                              | "circle"
                                              | "open_box",
                                            meshL: undefined,
                                            meshW: undefined,
                                            meshH: undefined,
                                            meshD: undefined,
                                          })
                                        }
                                      >
                                        <SelectTrigger
                                          className="h-7 text-xs"
                                          data-ocid={`job.mesh.shape.select.${idx + 1}`}
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="rectangle">
                                            Square / Rectangle
                                          </SelectItem>
                                          <SelectItem value="circle">
                                            Circle
                                          </SelectItem>
                                          <SelectItem value="open_box">
                                            Open Box
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>

                                      {/* Dimension inputs */}
                                      {meshShape === "rectangle" && (
                                        <div className="flex gap-1">
                                          <Input
                                            type="number"
                                            min={0}
                                            placeholder="L mm"
                                            value={row.meshL || ""}
                                            onChange={(e) =>
                                              updateMaterialRow(row.rowId, {
                                                meshL:
                                                  Number.parseFloat(
                                                    e.target.value,
                                                  ) || 0,
                                              })
                                            }
                                            className="h-7 text-xs font-mono w-20"
                                            data-ocid={`job.mesh.l.input.${idx + 1}`}
                                          />
                                          <Input
                                            type="number"
                                            min={0}
                                            placeholder="W mm"
                                            value={row.meshW || ""}
                                            onChange={(e) =>
                                              updateMaterialRow(row.rowId, {
                                                meshW:
                                                  Number.parseFloat(
                                                    e.target.value,
                                                  ) || 0,
                                              })
                                            }
                                            className="h-7 text-xs font-mono w-20"
                                            data-ocid={`job.mesh.w.input.${idx + 1}`}
                                          />
                                        </div>
                                      )}

                                      {meshShape === "circle" && (
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder="Dia mm"
                                          value={row.meshD || ""}
                                          onChange={(e) =>
                                            updateMaterialRow(row.rowId, {
                                              meshD:
                                                Number.parseFloat(
                                                  e.target.value,
                                                ) || 0,
                                            })
                                          }
                                          className="h-7 text-xs font-mono w-24"
                                          data-ocid={`job.mesh.d.input.${idx + 1}`}
                                        />
                                      )}

                                      {meshShape === "open_box" && (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex gap-1">
                                            <Input
                                              type="number"
                                              min={0}
                                              placeholder="L mm"
                                              value={row.meshL || ""}
                                              onChange={(e) =>
                                                updateMaterialRow(row.rowId, {
                                                  meshL:
                                                    Number.parseFloat(
                                                      e.target.value,
                                                    ) || 0,
                                                })
                                              }
                                              className="h-7 text-xs font-mono w-16"
                                              data-ocid={`job.mesh.box.l.input.${idx + 1}`}
                                            />
                                            <Input
                                              type="number"
                                              min={0}
                                              placeholder="W mm"
                                              value={row.meshW || ""}
                                              onChange={(e) =>
                                                updateMaterialRow(row.rowId, {
                                                  meshW:
                                                    Number.parseFloat(
                                                      e.target.value,
                                                    ) || 0,
                                                })
                                              }
                                              className="h-7 text-xs font-mono w-16"
                                              data-ocid={`job.mesh.box.w.input.${idx + 1}`}
                                            />
                                            <Input
                                              type="number"
                                              min={0}
                                              placeholder="H mm"
                                              value={row.meshH || ""}
                                              onChange={(e) =>
                                                updateMaterialRow(row.rowId, {
                                                  meshH:
                                                    Number.parseFloat(
                                                      e.target.value,
                                                    ) || 0,
                                                })
                                              }
                                              className="h-7 text-xs font-mono w-16"
                                              data-ocid={`job.mesh.box.h.input.${idx + 1}`}
                                            />
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-tight">
                                            Raw: (L+2H)×(W+2H)
                                          </p>
                                        </div>
                                      )}

                                      {/* Computed area */}
                                      {areaSqft !== null && (
                                        <span className="text-xs font-mono text-primary font-medium">
                                          {areaSqft.toFixed(4)} sqft
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell className="text-xs font-mono py-2 text-muted-foreground">
                                  {isMachined_
                                    ? "—"
                                    : calc
                                      ? fmt(calc.rawWeight)
                                      : "—"}
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2 text-muted-foreground">
                                  {isMachined_
                                    ? "—"
                                    : calc
                                      ? fmt(calc.totalWeight)
                                      : "—"}
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2 text-right font-semibold">
                                  {calc ? `₹${fmt(calc.materialCost)}` : "—"}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => removeMaterialRow(row.rowId)}
                                    data-ocid={`job.material.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
                {matCalcs.some(Boolean) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">
                      Formula: Total Wt = Raw × {wastageMultiplier.toFixed(2)} ·
                      Labour, Overhead & Profit calculated once on total job ·
                      Wire Mesh uses 22% wastage
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Machining Operations */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench size={16} className="text-amber-600" />
                    Machining Operations
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {predefinedOps.length > 0 && (
                      <Select
                        onValueChange={(opId) => {
                          const op = predefinedOps.find((o) => o.id === opId);
                          if (!op) return;
                          setMachiningRows((prev) => [
                            ...prev,
                            {
                              rowId: `row_${Date.now()}`,
                              opType: op.opType,
                              drillDia: op.drillDia ?? 10,
                              matThickness: op.matThickness ?? 10,
                              tapSize:
                                (op.tapSize as
                                  | "M6"
                                  | "M8"
                                  | "M10"
                                  | "M12"
                                  | "M16"
                                  | "M20") ?? "M6",
                              csDia: op.csDia,
                              slotLength: op.slotLength,
                              otherCostPerUnit: op.otherCostPerUnit,
                              grade: op.defaultGrade,
                              qty: 1,
                            },
                          ]);
                        }}
                      >
                        <SelectTrigger
                          className="h-8 text-xs w-36"
                          data-ocid="job.machining.select"
                        >
                          <SelectValue placeholder="Load Preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {predefinedOps.map((op) => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 text-xs"
                      onClick={addMachiningRow}
                      data-ocid="job.add_machining.button"
                    >
                      <Plus size={13} />
                      Add Operation
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Machined Items subsection */}
                {materialRows.some((row) =>
                  isMachined(
                    materials.find((m) => m.id === row.materialId)
                      ?.materialType ?? "",
                  ),
                ) && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Machined Items
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {materialRows.map((row, idx) => {
                        const mat = materials.find(
                          (m) => m.id === row.materialId,
                        );
                        if (!isMachined(mat?.materialType ?? "")) return null;
                        const calc = matCalcs[idx];
                        const itemCost =
                          row.lengthMeters * (mat?.currentRate ?? 0) * 2;
                        return (
                          <div
                            key={row.rowId}
                            className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-lg bg-amber-50/30 dark:bg-amber-900/10"
                          >
                            <div className="flex-1 min-w-[140px]">
                              <p className="text-sm font-medium">
                                {mat?.size || "Machined Item"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rate: ₹{mat?.currentRate ?? 0}/unit × 2 = ₹
                                {((mat?.currentRate ?? 0) * 2).toFixed(2)} each
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                Qty
                              </span>
                              <Input
                                type="number"
                                min={0}
                                value={row.lengthMeters || ""}
                                onChange={(e) =>
                                  updateMaterialRow(row.rowId, {
                                    lengthMeters: Number(e.target.value),
                                  })
                                }
                                className="h-8 text-xs w-20"
                              />
                            </div>
                            <div className="text-sm font-semibold min-w-[80px] text-right">
                              {calc
                                ? `₹${calc.materialCost.toFixed(2)}`
                                : `₹${itemCost.toFixed(2)}`}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeMaterialRow(row.rowId)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {machiningRows.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border"
                    data-ocid="job.machining.empty_state"
                  >
                    <Wrench
                      size={28}
                      className="text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      No machining operations
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Drilling · Tapping · Counter-sinking · Milling · Other
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                      {machiningRows.map((row, idx) => {
                        const calc = machiningCalcs[idx];
                        return (
                          <motion.div
                            key={row.rowId}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="border border-border rounded-lg p-3 bg-muted/20"
                            data-ocid={`job.machining.item.${idx + 1}`}
                          >
                            <div className="flex flex-wrap gap-2 items-start">
                              {/* Operation type */}
                              <div className="flex flex-col gap-1 min-w-[150px]">
                                <Label className="text-xs text-muted-foreground">
                                  Operation
                                </Label>
                                <Select
                                  value={row.opType}
                                  onValueChange={(v) =>
                                    updateMachiningRow(row.rowId, {
                                      opType: v as MachiningRow["opType"],
                                    })
                                  }
                                >
                                  <SelectTrigger
                                    className="h-8 text-xs"
                                    data-ocid={`job.machining.op.select.${idx + 1}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="drilling">
                                      Drilling
                                    </SelectItem>
                                    <SelectItem value="tapping">
                                      Tapping
                                    </SelectItem>
                                    <SelectItem value="countersink">
                                      Counter-sinking
                                    </SelectItem>
                                    <SelectItem value="milling">
                                      Milling / Slotting
                                    </SelectItem>
                                    <SelectItem value="rolling">
                                      Rolling
                                    </SelectItem>
                                    <SelectItem value="machining">
                                      Machining
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Conditional inputs */}
                              {row.opType === "drilling" && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Drill Dia (mm)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.drillDia ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          drillDia: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-xs w-24"
                                      data-ocid={`job.machining.drill_dia.input.${idx + 1}`}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Mat Thk (mm)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.matThickness ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          matThickness: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-xs w-24"
                                      data-ocid={`job.machining.mat_thk.input.${idx + 1}`}
                                    />
                                  </div>
                                </>
                              )}

                              {row.opType === "tapping" && (
                                <div className="flex flex-col gap-1 min-w-[100px]">
                                  <Label className="text-xs text-muted-foreground">
                                    Tap Size
                                  </Label>
                                  <Select
                                    value={row.tapSize ?? "M6"}
                                    onValueChange={(v) =>
                                      updateMachiningRow(row.rowId, {
                                        tapSize: v as MachiningRow["tapSize"],
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-8 text-xs"
                                      data-ocid={`job.machining.tap_size.select.${idx + 1}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[
                                        "M6",
                                        "M8",
                                        "M10",
                                        "M12",
                                        "M16",
                                        "M20",
                                      ].map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {row.opType === "countersink" && (
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Hole Dia (mm)
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={row.csDia ?? ""}
                                    onChange={(e) =>
                                      updateMachiningRow(row.rowId, {
                                        csDia: Number(e.target.value),
                                      })
                                    }
                                    className="h-8 text-xs w-24"
                                    data-ocid={`job.machining.cs_dia.input.${idx + 1}`}
                                  />
                                </div>
                              )}

                              {row.opType === "milling" && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Slot Length (mm)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.slotLength ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          slotLength: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-xs w-28"
                                      data-ocid={`job.machining.slot_len.input.${idx + 1}`}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Slot Width (mm)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.slotWidth ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          slotWidth: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-xs w-28"
                                      data-ocid={`job.machining.slot_wid.input.${idx + 1}`}
                                    />
                                  </div>
                                </>
                              )}

                              {row.opType === "rolling" && (
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Length (mm)
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={row.rollingLength ?? ""}
                                    onChange={(e) =>
                                      updateMachiningRow(row.rowId, {
                                        rollingLength: Number(e.target.value),
                                      })
                                    }
                                    className="h-8 text-xs w-24"
                                    data-ocid={`job.machining.rolling_length.input.${idx + 1}`}
                                  />
                                </div>
                              )}

                              {row.opType === "machining" && (
                                <>
                                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                                    <Label className="text-xs text-muted-foreground">
                                      Description
                                    </Label>
                                    <Input
                                      type="text"
                                      value={row.machiningDesc ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          machiningDesc: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs"
                                      placeholder="e.g. CNC Machining"
                                      data-ocid={`job.machining.machining_desc.input.${idx + 1}`}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Cost/Unit (₹)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={row.machiningCostPerUnit ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          machiningCostPerUnit: Number(
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      className="h-8 text-xs w-24"
                                      data-ocid={`job.machining.machining_cost.input.${idx + 1}`}
                                    />
                                  </div>
                                </>
                              )}

                              {row.opType === "other" && (
                                <>
                                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                                    <Label className="text-xs text-muted-foreground">
                                      Description
                                    </Label>
                                    <Input
                                      type="text"
                                      value={row.otherDesc ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          otherDesc: e.target.value,
                                        })
                                      }
                                      className="h-8 text-xs"
                                      placeholder="e.g. Grinding"
                                      data-ocid={`job.machining.other_desc.input.${idx + 1}`}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Cost/Unit (₹)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={row.otherCostPerUnit ?? ""}
                                      onChange={(e) =>
                                        updateMachiningRow(row.rowId, {
                                          otherCostPerUnit: Number(
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      className="h-8 text-xs w-24"
                                      data-ocid={`job.machining.other_cost.input.${idx + 1}`}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Grade (for all except other, rolling, machining) */}
                              {row.opType !== "other" &&
                                row.opType !== "rolling" &&
                                row.opType !== "machining" && (
                                  <div className="flex flex-col gap-1 min-w-[100px]">
                                    <Label className="text-xs text-muted-foreground">
                                      Grade
                                    </Label>
                                    <Select
                                      value={row.grade}
                                      onValueChange={(v) =>
                                        updateMachiningRow(row.rowId, {
                                          grade: v as "SS304" | "SS310",
                                        })
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-8 text-xs"
                                        data-ocid={`job.machining.grade.select.${idx + 1}`}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="SS304">
                                          SS304
                                        </SelectItem>
                                        <SelectItem value="SS310">
                                          SS310
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                              {/* Qty */}
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs text-muted-foreground">
                                  Qty
                                </Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={row.qty}
                                  onChange={(e) =>
                                    updateMachiningRow(row.rowId, {
                                      qty: Math.max(1, Number(e.target.value)),
                                    })
                                  }
                                  className="h-8 text-xs w-16"
                                  data-ocid={`job.machining.qty.input.${idx + 1}`}
                                />
                              </div>

                              {/* Cost + delete */}
                              <div className="flex flex-col gap-1 ml-auto">
                                <Label className="text-xs text-muted-foreground">
                                  Cost
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold tabular-nums text-foreground">
                                    ₹{fmt(calc?.cost ?? 0)}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      removeMachiningRow(row.rowId)
                                    }
                                    data-ocid={`job.machining.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </div>
                                {row.opType === "drilling" &&
                                  calc &&
                                  calc.weightRemovedKg > 0 && (
                                    <span className="text-xs text-muted-foreground/70">
                                      −{fmt(calc.weightRemovedKg)} kg removed
                                    </span>
                                  )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Welding Line Items */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench size={16} className="text-primary" />
                    Welding Materials
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={addWeldingRow}
                    data-ocid="job.add_welding.button"
                  >
                    <Plus size={13} />
                    Add Welding
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {weldingRows.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border"
                    data-ocid="job.welding.empty_state"
                  >
                    <Wrench
                      size={28}
                      className="text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      No welding items
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      SS304 @ ₹650/kg · SS310 @ ₹1,250/kg
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-40">
                            Grade
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-36">
                            Weight (kg)
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">
                            Rate (₹/kg)
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                            Welding Cost
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {weldingRows.map((row, idx) => {
                            const calc = weldCalcs[idx];
                            return (
                              <motion.tr
                                key={row.rowId}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="border-b border-border/60"
                                data-ocid={`job.welding.item.${idx + 1}`}
                              >
                                <TableCell className="py-2">
                                  <Select
                                    value={row.grade}
                                    onValueChange={(v) =>
                                      updateWeldingRow(row.rowId, {
                                        grade: v as "SS304" | "SS310",
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-8 text-xs"
                                      data-ocid={`job.welding.grade.select.${idx + 1}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SS304">
                                        SS304 — ₹650/kg
                                      </SelectItem>
                                      <SelectItem value="SS310">
                                        SS310 — ₹1,250/kg
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00"
                                    value={row.weightKg || ""}
                                    onChange={(e) =>
                                      updateWeldingRow(row.rowId, {
                                        weightKg:
                                          Number.parseFloat(e.target.value) ||
                                          0,
                                      })
                                    }
                                    className="h-8 text-xs font-mono"
                                    data-ocid={`job.welding.weight.input.${idx + 1}`}
                                  />
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2 text-muted-foreground">
                                  ₹{fmt(WELDING_RATES[row.grade])}
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2 text-right font-semibold">
                                  {calc ? `₹${fmt(calc.weldingCost)}` : "—"}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => removeWeldingRow(row.rowId)}
                                    data-ocid={`job.welding.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary sticky card */}
          <div className="xl:col-span-1">
            <div className="sticky top-20 flex flex-col gap-4">
              <Card className="shadow-card border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator size={16} className="text-primary" />
                    Job Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex flex-col gap-0.5 p-3 rounded-lg bg-primary/10 border border-primary/20"
                      data-ocid="job.total_price.card"
                    >
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Total Final Price
                      </span>
                      <span className="text-2xl font-bold text-primary tabular-nums">
                        ₹{fmt(summary.totalFinalPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted border border-border"
                        data-ocid="job.product_weight.card"
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium leading-tight">
                          Approx Weight
                        </span>
                        <span className="text-lg font-bold tabular-nums">
                          {fmt(summary.totalProductWeight)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            kg
                          </span>
                        </span>
                      </div>
                      <div
                        className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted border border-border"
                        data-ocid="job.rate_per_kg.card"
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium leading-tight">
                          Rate/kg
                        </span>
                        <span className="text-lg font-bold tabular-nums">
                          ₹{fmt(summary.ratePerKg)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            /kg
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Cost Breakdown */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Cost Breakdown
                    </p>

                    {!hasAnyCalcs ? (
                      <p className="text-xs text-muted-foreground italic">
                        Add items above to see breakdown
                      </p>
                    ) : (
                      <>
                        {matCalcs.map((c, i) => {
                          if (!c) return null;
                          return (
                            <div
                              key={materialRows[i].rowId}
                              className="flex justify-between text-xs py-0.5"
                            >
                              <span className="text-muted-foreground truncate pr-2">
                                {c.mat.grade} · {c.mat.materialType} ·{" "}
                                {c.mat.size}
                                {c.areaSqft !== null && (
                                  <span className="ml-1 text-muted-foreground/60">
                                    ({c.areaSqft.toFixed(3)} sqft)
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-medium shrink-0">
                                ₹{fmt(c.materialCost)}
                              </span>
                            </div>
                          );
                        })}

                        <div className="mt-1 pt-2 border-t border-border/60 flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                              Total Material Cost
                            </span>
                            <span className="font-mono">
                              ₹{fmt(summary.totalMaterialCost)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Labour
                                {summary.machiningCost > 0
                                  ? " (incl. machining)"
                                  : ` (₹${laborRate}/kg)`}
                              </span>
                              <span className="font-mono">
                                ₹{fmt(summary.laborCost)}
                              </span>
                            </div>
                            {summary.machiningCost > 0 && (
                              <div className="flex justify-between text-xs pl-3">
                                <span className="text-muted-foreground/70">
                                  ↳ Machining ops
                                </span>
                                <span className="font-mono text-muted-foreground/70">
                                  ₹{fmt(summary.machiningCost)}
                                </span>
                              </div>
                            )}
                          </div>
                          {summary.weldingCost > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Welding Total
                              </span>
                              <span className="font-mono">
                                ₹{fmt(summary.weldingCost)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Overhead (5%)
                            </span>
                            <span className="font-mono">
                              ₹{fmt(summary.overhead)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Profit (10%)
                            </span>
                            <span className="font-mono">
                              ₹{fmt(summary.profit)}
                            </span>
                          </div>
                          {transportIncluded && summary.transportTotal > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Truck size={11} />
                                Transport (₹{transportCost} ÷ {dispatchQty}{" "}
                                items)
                              </span>
                              <span className="font-mono">
                                ₹{fmt(summary.transportTotal)}
                              </span>
                            </div>
                          )}
                        </div>

                        <Separator className="my-0.5" />

                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="font-mono text-primary">
                            ₹{fmt(summary.totalFinalPrice)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  {editingJobId ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full gap-2"
                        onClick={handleUpdateJob}
                        disabled={isMutating}
                        data-ocid="job.submit_button"
                      >
                        {isMutating ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Save size={15} />
                        )}
                        {isMutating ? "Updating…" : "Update Job"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={resetForm}
                        disabled={isMutating}
                        data-ocid="job.cancel_button"
                      >
                        <X size={15} />
                        Cancel Edit
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={handleSaveJob}
                      disabled={isMutating}
                      data-ocid="job.submit_button"
                    >
                      {isMutating ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Wand2 size={15} />
                      )}
                      {isMutating ? "Saving…" : "Save Job"}
                    </Button>
                  )}
                  {lastSavedAt && (
                    <p className="text-xs text-muted-foreground text-center pb-2">
                      Last saved at {lastSavedAt.toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Job Name Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A job named "<strong>{dupExistingJob?.job.name}</strong>" already
              exists. Do you want to overwrite it (old working will be moved to
              history) or save with a different name?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 flex flex-col gap-2">
            <Label className="text-sm">New name (if renaming):</Label>
            <Input
              value={dupNewName}
              onChange={(e) => setDupNewName(e.target.value)}
              placeholder="Enter a different name"
              className="h-9"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDupRename}>
              Save with New Name
            </Button>
            <AlertDialogAction
              onClick={handleDupOverwrite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
