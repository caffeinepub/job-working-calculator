import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  History,
  Layers,
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FlexibleJob } from "../backend";
import { useFormulaSettings } from "../hooks/useFormulaSettings";
import {
  useDeleteFlexibleJob,
  useFlexibleJobs,
  useSaveFlexibleJob,
  useUpdateFlexibleJob,
} from "../hooks/useQueries";

type MaterialTab = "AL" | "CU";
type TopTab = "AL" | "CU" | "SAVED";

// ---- LocalStorage helpers for discount per job ----
const FLEX_DISCOUNTS_KEY = "flex_job_discount_map";

function getDiscountMap(): Record<string, number> {
  try {
    const s = localStorage.getItem(FLEX_DISCOUNTS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

function setJobDiscount(jobId: string, discountPct: number) {
  const map = getDiscountMap();
  map[jobId] = discountPct;
  localStorage.setItem(FLEX_DISCOUNTS_KEY, JSON.stringify(map));
}

function removeJobDiscount(jobId: string) {
  const map = getDiscountMap();
  delete map[jobId];
  localStorage.setItem(FLEX_DISCOUNTS_KEY, JSON.stringify(map));
}

function migrateJobDiscount(oldId: string, newId: string) {
  const map = getDiscountMap();
  if (map[oldId] !== undefined) {
    map[newId] = map[oldId];
    delete map[oldId];
    localStorage.setItem(FLEX_DISCOUNTS_KEY, JSON.stringify(map));
  }
}

// ---- LocalStorage helpers for cost snapshot history ----
function getCostHistoryKey(jobId: string) {
  return `flex_cost_history_${jobId}`;
}

function saveCostSnapshot(
  jobId: string,
  totalCost: number,
  discountPct: number,
) {
  try {
    const key = getCostHistoryKey(jobId);
    const quotedPrice =
      discountPct > 0 ? totalCost / (1 - discountPct / 100) : totalCost;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({
      totalCost,
      quotedPrice,
      discountPct,
      changedAt: Date.now(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

function migrateCostHistory(oldId: string, newId: string) {
  try {
    const oldKey = getCostHistoryKey(oldId);
    const newKey = getCostHistoryKey(newId);
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
      localStorage.removeItem(oldKey);
    }
  } catch {}
}

// ---- Rate history ----
interface RateHistoryEntry {
  rate: number;
  date: string;
}

function getRateHistoryKey(tab: MaterialTab) {
  return `jobcalc_flex_rate_history_${tab}`;
}

function loadRateHistory(tab: MaterialTab): RateHistoryEntry[] {
  try {
    const stored = localStorage.getItem(getRateHistoryKey(tab));
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveRateHistory(tab: MaterialTab, history: RateHistoryEntry[]) {
  localStorage.setItem(getRateHistoryKey(tab), JSON.stringify(history));
}

function interpolateRate(
  thickness: number,
  rateMap: Record<number, number>,
): number {
  const points = Object.entries(rateMap)
    .map(([t, r]) => [Number.parseFloat(t), r] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  if (thickness <= points[0][0]) return points[0][1];
  if (thickness >= points[points.length - 1][0])
    return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [t0, r0] = points[i];
    const [t1, r1] = points[i + 1];
    if (thickness >= t0 && thickness <= t1) {
      const frac = (thickness - t0) / (t1 - t0);
      return r0 + frac * (r1 - r0);
    }
  }
  return points[points.length - 1][1];
}

// ---- FormulaRow ----
function FormulaRow({
  rowKey,
  label,
  value,
  formula,
  openFormulas,
  toggleFormula,
  bold,
  large,
}: {
  rowKey: string;
  label: string;
  value: string;
  formula: string;
  openFormulas: Set<string>;
  toggleFormula: (key: string) => void;
  bold?: boolean;
  large?: boolean;
}) {
  const isOpen = openFormulas.has(rowKey);
  return (
    <div className="border-b border-border">
      <div className="flex justify-between items-center py-1.5">
        <div className="flex items-center gap-1">
          <span
            className={`text-sm ${
              bold ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          <button
            type="button"
            onClick={() => toggleFormula(rowKey)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Toggle formula"
          >
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        <span
          className={`${
            large
              ? "text-lg font-bold text-primary"
              : bold
                ? "text-sm font-semibold"
                : "text-sm font-medium"
          }`}
        >
          {value}
        </span>
      </div>
      {isOpen && (
        <div className="mb-1.5 text-xs text-muted-foreground font-mono bg-muted/40 rounded px-2 py-1">
          {formula}
        </div>
      )}
    </div>
  );
}

// ---- Saved Jobs Tab ----
function SavedJobsTab({
  onEditJob,
}: {
  onEditJob: (job: FlexibleJob) => void;
}) {
  const [subTab, setSubTab] = useState<MaterialTab>("AL");
  const { data: savedJobs = [], isLoading } = useFlexibleJobs();
  const deleteJob = useDeleteFlexibleJob();

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleDelete = async (job: FlexibleJob) => {
    if (!window.confirm(`Delete job "${job.description}"?`)) return;
    try {
      await deleteJob.mutateAsync(job.id);
      removeJobDiscount(job.id);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const tabJobs = savedJobs.filter((j) => j.materialTab === subTab);
  const discountMap = getDiscountMap();

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-full sm:w-auto sm:inline-flex border border-border">
        <button
          type="button"
          onClick={() => setSubTab("AL")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 flex-1 sm:flex-none justify-center ${
            subTab === "AL"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
          data-ocid="flexibles.tab"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              subTab === "AL" ? "bg-white" : "bg-blue-500"
            }`}
          />
          Aluminium
        </button>
        <button
          type="button"
          onClick={() => setSubTab("CU")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 flex-1 sm:flex-none justify-center ${
            subTab === "CU"
              ? "bg-amber-600 text-white shadow-md"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
          data-ocid="flexibles.tab"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              subTab === "CU" ? "bg-white" : "bg-amber-500"
            }`}
          />
          Copper
        </button>
      </div>

      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Saved {subTab === "AL" ? "Aluminium" : "Copper"} Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div
              className="flex items-center justify-center py-12 text-muted-foreground gap-2"
              data-ocid="flexibles.loading_state"
            >
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading saved jobs…</span>
            </div>
          ) : tabJobs.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="flexibles.empty_state"
            >
              <Layers size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No saved {subTab === "AL" ? "Aluminium" : "Copper"} jobs yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="flexibles.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabJobs.map((job, idx) => {
                    const disc = discountMap[job.id] ?? 0;
                    return (
                      <TableRow
                        key={job.id}
                        data-ocid={`flexibles.item.${idx + 1}`}
                      >
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.description || (
                            <span className="text-muted-foreground italic">
                              No description
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {disc > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {disc}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          Rs {job.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => onEditJob(job)}
                              title="Edit job"
                              data-ocid={`flexibles.edit_button.${idx + 1}`}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(job)}
                              disabled={deleteJob.isPending}
                              data-ocid={`flexibles.delete_button.${idx + 1}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Tab Calculator ----
interface TabCalculatorProps {
  materialTab: MaterialTab;
  editingJob: FlexibleJob | null;
  editingDiscountPct: number;
  onEditComplete: () => void;
}

function TabCalculator({
  materialTab,
  editingJob,
  editingDiscountPct,
  onEditComplete,
}: TabCalculatorProps) {
  const { settings, updateSetting, save: saveSettings } = useFormulaSettings();
  const { data: savedJobs = [] } = useFlexibleJobs();
  const saveJob = useSaveFlexibleJob();
  const updateJob = useUpdateFlexibleJob();

  const numberOfFolds = 1;

  const [description, setDescription] = useState("");
  const [centerLength, setCenterLength] = useState<number | "">("");
  const [sheetBunchWidth, setSheetBunchWidth] = useState<number | "">("");
  const [sheetThicknessMm, setSheetThicknessMm] = useState<0.28 | 0.3 | "">("");
  const [sheetBunchThickness, setSheetBunchThickness] = useState<number | "">(
    "",
  );
  const [barsSupplied, setBarsSupplied] = useState(false);

  const [sameBars, setSameBars] = useState(true);
  const [bar1Length, setBar1Length] = useState<number | "">("");
  const [bar1Width, setBar1Width] = useState<number | "">("");
  const [bar1Thickness, setBar1Thickness] = useState<number | "">("");
  const [bar2Length, setBar2Length] = useState<number | "">("");
  const [bar2Width, setBar2Width] = useState<number | "">("");
  const [bar2Thickness, setBar2Thickness] = useState<number | "">("");

  const [drillingEnabled, setDrillingEnabled] = useState(false);
  const [numberOfDrills, setNumberOfDrills] = useState<number>(1);

  const [discountPct, setDiscountPct] = useState<number | "">("");

  // Material rate inline edit
  const settingsRate =
    materialTab === "AL"
      ? settings.flexAlMaterialRate
      : settings.flexCuMaterialRate;
  const [localRate, setLocalRate] = useState<number>(settingsRate);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInputVal, setRateInputVal] = useState<string>(
    String(settingsRate),
  );
  const [rateHistory, setRateHistory] = useState<RateHistoryEntry[]>(() =>
    loadRateHistory(materialTab),
  );
  const [showRateHistory, setShowRateHistory] = useState(false);

  useEffect(() => {
    setLocalRate(settingsRate);
    setRateInputVal(String(settingsRate));
  }, [settingsRate]);

  // Load editing job into form
  useEffect(() => {
    if (!editingJob) return;
    setDescription(editingJob.description);
    setCenterLength(editingJob.centerLength);
    setSheetBunchWidth(editingJob.sheetBunchWidth);
    const sThk = editingJob.sheetThickness;
    setSheetThicknessMm(sThk === 0.28 ? 0.28 : 0.3);
    const bunchThk = sThk * Number(editingJob.sheetCount);
    setSheetBunchThickness(bunchThk);
    setBarsSupplied(editingJob.barsSupplied);
    setBar1Length(editingJob.barLength);
    setBar1Width(editingJob.barWidth);
    setBar1Thickness(editingJob.barThickness);
    // bar2 uses same dims stored (sameBars logic)
    setBar2Length(editingJob.barLength);
    setBar2Width(editingJob.barWidth);
    setBar2Thickness(editingJob.barThickness);
    setSameBars(true);
    const drills = Number(editingJob.numberOfDrills);
    setDrillingEnabled(drills > 0);
    setNumberOfDrills(drills > 0 ? drills : 1);
    setDiscountPct(editingDiscountPct > 0 ? editingDiscountPct : "");
    // prevent auto-desc overwrite
    lastAutoDesc.current = editingJob.description;
  }, [editingJob, editingDiscountPct]);

  // Per-row formula open state
  const [openFormulas, setOpenFormulas] = useState<Set<string>>(new Set());
  const toggleFormula = (key: string) => {
    setOpenFormulas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Auto-fill description
  const lastAutoDesc = useRef("");
  const descRef = useRef(description);
  descRef.current = description;

  const b1Len = typeof bar1Length === "number" ? bar1Length : 0;
  const b2Len = sameBars
    ? b1Len
    : typeof bar2Length === "number"
      ? bar2Length
      : 0;
  const centerLengthNum = typeof centerLength === "number" ? centerLength : 0;

  useEffect(() => {
    const w = typeof sheetBunchWidth === "number" ? sheetBunchWidth : 0;
    const t = typeof sheetBunchThickness === "number" ? sheetBunchThickness : 0;
    const l = centerLengthNum;
    const mat = materialTab === "AL" ? "Al." : "Cu.";

    if (w > 0 && t > 0 && l > 0) {
      let auto: string;
      if (barsSupplied && b1Len > 0 && b2Len > 0) {
        const total = b1Len + l + b2Len;
        auto = `${w}x${t}-${total}mm-(${b1Len}+${l}+${b2Len}) ${mat} Flexibles`;
      } else {
        auto = `${w}x${t}-${l}mm ${mat} Flexibles`;
      }
      const cur = descRef.current;
      if (cur === "" || cur === lastAutoDesc.current) {
        lastAutoDesc.current = auto;
        setDescription(auto);
      }
    }
  }, [
    sheetBunchWidth,
    sheetBunchThickness,
    centerLengthNum,
    materialTab,
    barsSupplied,
    b1Len,
    b2Len,
  ]);

  const alRateMap: Record<number, number> = {
    6: settings.flexAlRate6,
    10: settings.flexAlRate10,
    12: settings.flexAlRate12,
    12.7: settings.flexAlRate127,
  };

  const cuRateMap: Record<number, number> = {
    6: settings.flexCuRate6,
    10: settings.flexCuRate10,
    12: settings.flexCuRate12,
    12.7: settings.flexCuRate127,
  };

  const rateMap = materialTab === "AL" ? alRateMap : cuRateMap;
  const density =
    materialTab === "AL" ? settings.flexAlDensity : settings.flexCuDensity;
  const materialRate = localRate;

  const widthNum = typeof sheetBunchWidth === "number" ? sheetBunchWidth : 0;
  const sheetThkNum =
    typeof sheetThicknessMm === "number" ? sheetThicknessMm : 0;
  const sheetBunchThkNum =
    typeof sheetBunchThickness === "number" ? sheetBunchThickness : 0;

  const bar1LengthNum = b1Len;
  const bar1WidthNum = typeof bar1Width === "number" ? bar1Width : 0;
  const bar1ThicknessNum =
    typeof bar1Thickness === "number" ? bar1Thickness : 0;

  const bar2LengthNum = b2Len;
  const bar2WidthNum = sameBars
    ? bar1WidthNum
    : typeof bar2Width === "number"
      ? bar2Width
      : 0;
  const bar2ThicknessNum = sameBars
    ? bar1ThicknessNum
    : typeof bar2Thickness === "number"
      ? bar2Thickness
      : 0;

  const sheetCountNum =
    sheetBunchThkNum > 0 && sheetThkNum > 0
      ? Math.round(sheetBunchThkNum / sheetThkNum)
      : 0;

  const sheetStackWeight =
    widthNum > 0 && sheetThkNum > 0 && sheetCountNum > 0
      ? ((centerLengthNum + 25) *
          widthNum *
          sheetThkNum *
          sheetCountNum *
          density) /
        1_000_000
      : 0;

  const stripWeight =
    widthNum > 0 ? (widthNum * 20 * 2 * 4 * density) / 1_000_000 : 0;

  const bar1Weight =
    barsSupplied &&
    bar1LengthNum > 0 &&
    bar1WidthNum > 0 &&
    bar1ThicknessNum > 0
      ? (bar1LengthNum * bar1WidthNum * bar1ThicknessNum * density) / 1_000_000
      : 0;

  const bar2Weight =
    barsSupplied &&
    bar2LengthNum > 0 &&
    bar2WidthNum > 0 &&
    bar2ThicknessNum > 0
      ? (bar2LengthNum * bar2WidthNum * bar2ThicknessNum * density) / 1_000_000
      : 0;

  const totalMaterialWeight =
    (barsSupplied ? bar1Weight : 0) +
    stripWeight +
    sheetStackWeight +
    (barsSupplied ? bar2Weight : 0);

  const materialCost = totalMaterialWeight * 1.2 * materialRate;
  const cuttingCost = sheetCountNum > 0 ? (sheetCountNum + 4) * 2.5 : 0;
  const foldingCost = numberOfFolds * settings.flexFoldingCostPerFold;
  const chamferingCost = settings.flexChamferingRate;
  const effectiveDrills = drillingEnabled ? numberOfDrills : 0;
  const drillingCost = effectiveDrills * settings.flexDrillingCostPerHole;

  const totalWeldLength =
    widthNum > 0 && sheetBunchThkNum > 0
      ? (widthNum + sheetBunchThkNum) * 4
      : 0;

  const labourRate =
    sheetBunchThkNum > 0 ? interpolateRate(sheetBunchThkNum, rateMap) : 0;
  const weldingCost =
    widthNum > 0 && sheetBunchThkNum > 0 ? (widthNum / 25) * labourRate : 0;

  const subtotal =
    materialCost +
    cuttingCost +
    foldingCost +
    chamferingCost +
    drillingCost +
    weldingCost;
  const overheadCost = subtotal * (settings.overheadPct / 100);
  const profitCost = (subtotal + overheadCost) * (settings.profitPct / 100);
  const totalCost = subtotal + overheadCost + profitCost;

  const discountNum = typeof discountPct === "number" ? discountPct : 0;
  const hasDiscount = discountNum > 0 && discountNum < 100;
  const quotedPrice = hasDiscount
    ? totalCost / (1 - discountNum / 100)
    : totalCost;
  const markupFactor = hasDiscount ? quotedPrice / totalCost : 1;

  const canCalculate =
    widthNum > 0 &&
    sheetBunchThkNum > 0 &&
    sheetThkNum > 0 &&
    sheetCountNum > 0;

  const ratePerMeter =
    canCalculate && totalWeldLength > 0
      ? quotedPrice / (totalWeldLength / 1000)
      : null;

  // Helper to build job payload
  const buildJobPayload = () => ({
    description: description.trim(),
    materialTab,
    centerLength: centerLengthNum,
    sheetBunchWidth: widthNum,
    sheetThickness: sheetThkNum,
    sheetCount: BigInt(sheetCountNum),
    barsSupplied,
    barLength: bar1LengthNum,
    barWidth: bar1WidthNum,
    barThickness: bar1ThicknessNum,
    numberOfDrills: BigInt(effectiveDrills),
    numberOfFolds: BigInt(numberOfFolds),
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
  });

  const handleSave = async () => {
    if (!canCalculate) return;
    const descTrimmed = description.trim();

    // Duplicate check
    const tabJobs = savedJobs.filter((j) => j.materialTab === materialTab);
    const duplicate = tabJobs.find(
      (j) =>
        j.description.toLowerCase() === descTrimmed.toLowerCase() &&
        j.id !== editingJob?.id,
    );
    if (duplicate) {
      const overwrite = window.confirm(
        `A job with the description "${descTrimmed}" already exists. Overwrite it?`,
      );
      if (!overwrite) return;
      // Overwrite existing
      try {
        saveCostSnapshot(
          duplicate.id,
          duplicate.totalCost,
          getDiscountMap()[duplicate.id] ?? 0,
        );
        const newJob = await updateJob.mutateAsync({
          oldId: duplicate.id,
          ...buildJobPayload(),
        });
        migrateJobDiscount(duplicate.id, newJob.id);
        migrateCostHistory(duplicate.id, newJob.id);
        if (discountNum > 0) setJobDiscount(newJob.id, discountNum);
        else removeJobDiscount(newJob.id);
        toast.success("Job updated (overwrite)");
      } catch {
        toast.error("Failed to update job");
      }
      return;
    }

    if (editingJob) {
      // Update mode
      try {
        saveCostSnapshot(
          editingJob.id,
          editingJob.totalCost,
          getDiscountMap()[editingJob.id] ?? 0,
        );
        const newJob = await updateJob.mutateAsync({
          oldId: editingJob.id,
          ...buildJobPayload(),
        });
        migrateJobDiscount(editingJob.id, newJob.id);
        migrateCostHistory(editingJob.id, newJob.id);
        if (discountNum > 0) setJobDiscount(newJob.id, discountNum);
        else removeJobDiscount(newJob.id);
        toast.success("Job updated");
        onEditComplete();
      } catch {
        toast.error("Failed to update job");
      }
      return;
    }

    // New save
    try {
      const newJob = await saveJob.mutateAsync({
        ...buildJobPayload(),
        customerId: null,
      });
      if (discountNum > 0) setJobDiscount(newJob.id, discountNum);
      toast.success("Flexible job saved");
    } catch {
      toast.error("Failed to save job");
    }
  };

  // Rate edit + auto-update saved jobs
  const handleRateEditConfirm = async () => {
    const newRate = Number(rateInputVal);
    if (Number.isNaN(newRate) || newRate <= 0) {
      toast.error("Enter a valid rate");
      return;
    }
    if (newRate === localRate) {
      setEditingRate(false);
      return;
    }

    // Save rate history
    const newHistory: RateHistoryEntry[] = [
      {
        rate: localRate,
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      },
      ...rateHistory,
    ];
    setRateHistory(newHistory);
    saveRateHistory(materialTab, newHistory);
    if (materialTab === "AL") {
      updateSetting("flexAlMaterialRate", newRate);
    } else {
      updateSetting("flexCuMaterialRate", newRate);
    }
    saveSettings();
    setLocalRate(newRate);
    setEditingRate(false);
    toast.success(`${materialTab} material rate updated to ₹${newRate}/kg`);

    // Auto-update saved jobs for this materialTab
    const tabJobs = savedJobs.filter((j) => j.materialTab === materialTab);
    if (tabJobs.length === 0) return;

    let updatedCount = 0;
    for (const job of tabJobs) {
      try {
        const disc = getDiscountMap()[job.id] ?? 0;
        // Save snapshot of old cost
        saveCostSnapshot(job.id, job.totalCost, disc);

        // Recalculate with new rate
        const sThk = job.sheetThickness;
        const sCount = Number(job.sheetCount);
        const jDensity =
          materialTab === "AL"
            ? settings.flexAlDensity
            : settings.flexCuDensity;
        const jWidth = job.sheetBunchWidth;
        const jCenter = job.centerLength;
        const newSheetStack =
          ((jCenter + 25) * jWidth * sThk * sCount * jDensity) / 1_000_000;
        const newStrip = (jWidth * 20 * 2 * 4 * jDensity) / 1_000_000;
        const newBar1 = job.barsSupplied
          ? (job.barLength * job.barWidth * job.barThickness * jDensity) /
            1_000_000
          : 0;
        const newBar2 = job.barsSupplied ? newBar1 : 0;
        const newTotalMat =
          (job.barsSupplied ? newBar1 : 0) +
          newStrip +
          newSheetStack +
          (job.barsSupplied ? newBar2 : 0);
        const newMatCost = newTotalMat * 1.2 * newRate;
        const newSubtotal =
          newMatCost +
          job.cuttingCost +
          job.foldingCost +
          job.chamferingCost +
          job.drillingCost +
          job.weldingCost;
        const newOverhead = newSubtotal * (settings.overheadPct / 100);
        const newProfit =
          (newSubtotal + newOverhead) * (settings.profitPct / 100);
        const newTotal = newSubtotal + newOverhead + newProfit;

        const newJob = await updateJob.mutateAsync({
          oldId: job.id,
          description: job.description,
          materialTab: job.materialTab,
          centerLength: job.centerLength,
          sheetBunchWidth: job.sheetBunchWidth,
          sheetThickness: job.sheetThickness,
          sheetCount: job.sheetCount,
          barsSupplied: job.barsSupplied,
          barLength: job.barLength,
          barWidth: job.barWidth,
          barThickness: job.barThickness,
          numberOfDrills: job.numberOfDrills,
          numberOfFolds: job.numberOfFolds,
          sheetStackWeight: newSheetStack,
          stripWeight: newStrip,
          bar1Weight: newBar1,
          bar2Weight: newBar2,
          totalMaterialWeight: newTotalMat,
          materialCost: newMatCost,
          cuttingCost: job.cuttingCost,
          foldingCost: job.foldingCost,
          drillingCost: job.drillingCost,
          weldingCost: job.weldingCost,
          chamferingCost: job.chamferingCost,
          totalWeldLength: job.totalWeldLength,
          overheadCost: newOverhead,
          profitCost: newProfit,
          totalCost: newTotal,
        });
        migrateJobDiscount(job.id, newJob.id);
        migrateCostHistory(job.id, newJob.id);
        updatedCount++;
      } catch {
        // skip individual failures silently
      }
    }
    if (updatedCount > 0) {
      toast.success(
        `${updatedCount} saved job${updatedCount > 1 ? "s" : ""} auto-updated with new rate`,
      );
    }
  };

  const handleDeleteRateHistory = (idx: number) => {
    const updated = rateHistory.filter((_, i) => i !== idx);
    setRateHistory(updated);
    saveRateHistory(materialTab, updated);
  };

  const isPending = saveJob.isPending || updateJob.isPending;

  return (
    <div className="space-y-6">
      {editingJob && (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-sm">
          <span className="text-primary font-medium">
            ✏️ Editing: {editingJob.description}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onEditComplete}
          >
            Cancel Edit
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-desc-${materialTab}`}>
                Job Description
              </Label>
              <Input
                id={`flex-desc-${materialTab}`}
                placeholder="Auto-fills from dimensions…"
                value={description}
                onChange={(e) => {
                  if (e.target.value === "") lastAutoDesc.current = "";
                  setDescription(e.target.value);
                }}
                data-ocid="flexibles.input"
              />
            </div>

            {/* Sheet Bunch Width */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-width-${materialTab}`}>
                Sheet Bunch Width (mm)
              </Label>
              <Input
                id={`flex-width-${materialTab}`}
                type="number"
                min={0}
                placeholder="Enter width in mm"
                value={sheetBunchWidth}
                onChange={(e) =>
                  setSheetBunchWidth(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="flexibles.input"
              />
            </div>

            {/* Sheet Bunch Thickness */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-bunch-thk-${materialTab}`}>
                Sheet Bunch Thickness (mm)
              </Label>
              <Input
                id={`flex-bunch-thk-${materialTab}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="Total bunch thickness in mm"
                value={sheetBunchThickness}
                onChange={(e) =>
                  setSheetBunchThickness(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="flexibles.input"
              />
              {sheetCountNum > 0 && sheetThkNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sheet Count:{" "}
                  <span className="font-medium text-foreground">
                    {sheetCountNum} sheets
                  </span>
                </p>
              )}
            </div>

            {/* Center Length */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-center-${materialTab}`}>
                Center Length (mm)
              </Label>
              <Input
                id={`flex-center-${materialTab}`}
                type="number"
                min={0}
                placeholder="Center length in mm"
                value={centerLength}
                onChange={(e) =>
                  setCenterLength(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="flexibles.input"
              />
            </div>

            {/* Discount % */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-discount-${materialTab}`}>
                Customer Discount (%)
              </Label>
              <Input
                id={`flex-discount-${materialTab}`}
                type="number"
                min={0}
                max={99}
                step={0.5}
                placeholder="e.g. 10 for 10% discount"
                value={discountPct}
                onChange={(e) =>
                  setDiscountPct(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="flexibles.input"
              />
            </div>

            {/* Sheet Thickness dropdown */}
            <div className="space-y-1.5">
              <Label>Sheet Thickness (mm)</Label>
              <Select
                value={sheetThicknessMm === "" ? "" : String(sheetThicknessMm)}
                onValueChange={(v) =>
                  setSheetThicknessMm(v === "0.28" ? 0.28 : 0.3)
                }
              >
                <SelectTrigger data-ocid="flexibles.select">
                  <SelectValue placeholder="Select sheet thickness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.28">0.28 mm</SelectItem>
                  <SelectItem value="0.3">0.30 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Material Rate inline edit */}
            <div className="space-y-1.5 border border-border rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {materialTab === "AL" ? "Aluminium" : "Copper"} Material
                    Rate
                  </p>
                  <p className="text-xs text-muted-foreground">Rs/kg</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingRate ? (
                    <>
                      <Input
                        type="number"
                        min={1}
                        className="h-7 w-24 text-sm"
                        value={rateInputVal}
                        onChange={(e) => setRateInputVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRateEditConfirm();
                          if (e.key === "Escape") {
                            setEditingRate(false);
                            setRateInputVal(String(localRate));
                          }
                        }}
                        autoFocus
                        data-ocid="flexibles.input"
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleRateEditConfirm}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingRate(false);
                          setRateInputVal(String(localRate));
                        }}
                      >
                        <X size={13} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-foreground">
                        ₹{localRate}/kg
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setRateInputVal(String(localRate));
                          setEditingRate(true);
                        }}
                        title="Edit rate"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setShowRateHistory((v) => !v)}
                        title="Rate history"
                      >
                        <History size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {showRateHistory && !editingRate && (
                <div className="mt-2 space-y-1">
                  {rateHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No rate history yet.
                    </p>
                  ) : (
                    rateHistory.map((entry, idx) => (
                      <div
                        key={`${entry.rate}-${entry.date}-${idx}`}
                        className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1"
                      >
                        <span>
                          ₹{entry.rate}/kg — {entry.date}
                        </span>
                        <button
                          type="button"
                          className="text-destructive hover:text-destructive/80 ml-2"
                          onClick={() => handleDeleteRateHistory(idx)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bars Supplied toggle */}
            <div className="flex items-center justify-between py-2 border border-border rounded-lg px-3">
              <div>
                <p className="text-sm font-medium">Bars Supplied?</p>
                <p className="text-xs text-muted-foreground">
                  Toggle if you are supplying solid end bars
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={barsSupplied}
                onClick={() => setBarsSupplied((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  barsSupplied ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                data-ocid="flexibles.switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    barsSupplied ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Bar inputs */}
            {barsSupplied && (
              <div className="space-y-3 pl-3 border-l-2 border-primary/30">
                {/* Same bars toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Same dimensions for both bars
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sameBars}
                    onClick={() => setSameBars((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                      sameBars ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    data-ocid="flexibles.switch"
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        sameBars ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Bar 1 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    {sameBars
                      ? "Bar Dimensions (same for both)"
                      : "Bar 1 Dimensions"}
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor={`flex-bar1len-${materialTab}`}>
                      Bar Length (mm)
                    </Label>
                    <Input
                      id={`flex-bar1len-${materialTab}`}
                      type="number"
                      min={0}
                      placeholder="Bar length in mm"
                      value={bar1Length}
                      onChange={(e) =>
                        setBar1Length(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="flexibles.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`flex-bar1w-${materialTab}`}>
                      Bar Width (mm)
                    </Label>
                    <Input
                      id={`flex-bar1w-${materialTab}`}
                      type="number"
                      min={0}
                      placeholder="Bar width in mm"
                      value={bar1Width}
                      onChange={(e) =>
                        setBar1Width(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="flexibles.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`flex-bar1th-${materialTab}`}>
                      Bar Thickness (mm)
                    </Label>
                    <Input
                      id={`flex-bar1th-${materialTab}`}
                      type="number"
                      min={0}
                      placeholder="Bar thickness in mm"
                      value={bar1Thickness}
                      onChange={(e) =>
                        setBar1Thickness(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="flexibles.input"
                    />
                  </div>
                </div>

                {/* Bar 2 — only when not same */}
                {!sameBars && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-foreground">
                      Bar 2 Dimensions
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor={`flex-bar2len-${materialTab}`}>
                        Bar Length (mm)
                      </Label>
                      <Input
                        id={`flex-bar2len-${materialTab}`}
                        type="number"
                        min={0}
                        placeholder="Bar length in mm"
                        value={bar2Length}
                        onChange={(e) =>
                          setBar2Length(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        data-ocid="flexibles.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`flex-bar2w-${materialTab}`}>
                        Bar Width (mm)
                      </Label>
                      <Input
                        id={`flex-bar2w-${materialTab}`}
                        type="number"
                        min={0}
                        placeholder="Bar width in mm"
                        value={bar2Width}
                        onChange={(e) =>
                          setBar2Width(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        data-ocid="flexibles.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`flex-bar2th-${materialTab}`}>
                        Bar Thickness (mm)
                      </Label>
                      <Input
                        id={`flex-bar2th-${materialTab}`}
                        type="number"
                        min={0}
                        placeholder="Bar thickness in mm"
                        value={bar2Thickness}
                        onChange={(e) =>
                          setBar2Thickness(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        data-ocid="flexibles.input"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drilling toggle */}
            <div className="flex items-center justify-between py-2 border border-border rounded-lg px-3">
              <div>
                <p className="text-sm font-medium">Drilling?</p>
                <p className="text-xs text-muted-foreground">
                  Enable if drilling is done on this job
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={drillingEnabled}
                onClick={() => setDrillingEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  drillingEnabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                data-ocid="flexibles.switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    drillingEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {drillingEnabled && (
              <div className="space-y-1.5 pl-3 border-l-2 border-primary/30">
                <Label htmlFor={`flex-drills-${materialTab}`}>
                  Number of Drills
                </Label>
                <Input
                  id={`flex-drills-${materialTab}`}
                  type="number"
                  min={1}
                  step={1}
                  value={numberOfDrills}
                  onChange={(e) =>
                    setNumberOfDrills(
                      Math.max(1, Math.round(Number(e.target.value))),
                    )
                  }
                  data-ocid="flexibles.input"
                />
              </div>
            )}

            <Button
              className="w-full gap-2 mt-2"
              disabled={!canCalculate || isPending}
              onClick={handleSave}
              data-ocid="flexibles.primary_button"
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isPending
                ? "Saving…"
                : editingJob
                  ? "Update Job"
                  : "Save This Job"}
            </Button>
          </CardContent>
        </Card>

        {/* Live Breakdown */}
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <FormulaRow
                rowKey="sheetStack"
                label="Sheet Stack Weight"
                value={
                  sheetStackWeight > 0
                    ? `${sheetStackWeight.toFixed(3)} kg`
                    : "—"
                }
                formula="(CenterLen+25) × Width × SheetThk × Count × ρ / 1M"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="strip"
                label="Strip Weight"
                value={stripWeight > 0 ? `${stripWeight.toFixed(3)} kg` : "—"}
                formula="Width × 20 × 2 × 4 × ρ / 1M"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              {barsSupplied && (
                <FormulaRow
                  rowKey="bar"
                  label={sameBars ? "Bar Weight (×2)" : "Bar 1 Weight"}
                  value={
                    bar1Weight > 0
                      ? `${bar1Weight.toFixed(3)} kg${sameBars ? " each" : ""}`
                      : "—"
                  }
                  formula="L × W × T × ρ / 1M (each bar)"
                  openFormulas={openFormulas}
                  toggleFormula={toggleFormula}
                />
              )}
              {barsSupplied && !sameBars && (
                <FormulaRow
                  rowKey="bar2"
                  label="Bar 2 Weight"
                  value={bar2Weight > 0 ? `${bar2Weight.toFixed(3)} kg` : "—"}
                  formula="L × W × T × ρ / 1M (each bar)"
                  openFormulas={openFormulas}
                  toggleFormula={toggleFormula}
                />
              )}
              <FormulaRow
                rowKey="totalMat"
                label="Total Material Weight"
                value={
                  totalMaterialWeight > 0
                    ? `${totalMaterialWeight.toFixed(3)} kg`
                    : "—"
                }
                formula="Bar1 + Strip + SheetStack + Bar2"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
                bold
              />
              <FormulaRow
                rowKey="matCost"
                label="Material Cost"
                value={
                  materialCost > 0
                    ? `Rs ${(materialCost * markupFactor).toFixed(2)}`
                    : "—"
                }
                formula={`TotalWt × 1.2 × ₹${localRate}/kg`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="cutting"
                label="Sheet Cutting Cost"
                value={
                  cuttingCost > 0
                    ? `Rs ${(cuttingCost * markupFactor).toFixed(2)}`
                    : "—"
                }
                formula="(Sheets + 4) × 2.5"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="folding"
                label="Folding Cost"
                value={`Rs ${(foldingCost * markupFactor).toFixed(2)}`}
                formula={`1 fold × ₹${settings.flexFoldingCostPerFold}`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="chamfer"
                label="Chamfering"
                value={`Rs ${(chamferingCost * markupFactor).toFixed(2)}`}
                formula={`₹${chamferingCost} (both bars, always)`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              {drillingEnabled && effectiveDrills > 0 && (
                <FormulaRow
                  rowKey="drilling"
                  label="Drilling"
                  value={`Rs ${(drillingCost * markupFactor).toFixed(2)}`}
                  formula={`${effectiveDrills} × ₹${
                    settings.flexDrillingCostPerHole
                  }/drill`}
                  openFormulas={openFormulas}
                  toggleFormula={toggleFormula}
                />
              )}
              <FormulaRow
                rowKey="welding"
                label="Welding Cost"
                value={
                  canCalculate
                    ? `Rs ${(weldingCost * markupFactor).toFixed(2)}`
                    : "—"
                }
                formula="(Width ÷ 25) × Labour Rate"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="weldLen"
                label="Total Weld Length"
                value={
                  totalWeldLength > 0 ? `${totalWeldLength.toFixed(1)} mm` : "—"
                }
                formula="(Width + BunchThk) × 4"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="overhead"
                label="Overhead"
                value={
                  canCalculate
                    ? `Rs ${(overheadCost * markupFactor).toFixed(2)}`
                    : "—"
                }
                formula={`${settings.overheadPct}% of subtotal`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="profit"
                label="Profit"
                value={
                  canCalculate
                    ? `Rs ${(profitCost * markupFactor).toFixed(2)}`
                    : "—"
                }
                formula={`${settings.profitPct}% of (subtotal + overhead)`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />

              {/* Total Cost */}
              <div className="border-b border-border">
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-semibold text-foreground">
                    Total Cost
                  </span>
                  <span
                    className="text-lg font-bold text-primary"
                    data-ocid="flexibles.card"
                  >
                    {canCalculate ? `Rs ${quotedPrice.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Rate per Meter */}
              {canCalculate && ratePerMeter !== null && (
                <FormulaRow
                  rowKey="ratePerMeter"
                  label="Rate per Meter"
                  value={`Rs ${ratePerMeter.toFixed(2)} / m`}
                  formula="Total Cost ÷ Total Weld Length (m)"
                  openFormulas={openFormulas}
                  toggleFormula={toggleFormula}
                  bold
                  large
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Main Flexibles page ----
export function Flexibles() {
  const [activeTab, setActiveTab] = useState<TopTab>("AL");
  const [editingJob, setEditingJob] = useState<FlexibleJob | null>(null);
  const [editingDiscountPct, setEditingDiscountPct] = useState(0);

  const handleEditJob = (job: FlexibleJob) => {
    const disc = getDiscountMap()[job.id] ?? 0;
    setEditingDiscountPct(disc);
    setEditingJob(job);
    setActiveTab(job.materialTab as TopTab);
  };

  const handleEditComplete = () => {
    setEditingJob(null);
    setEditingDiscountPct(0);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Layers size={18} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Flexibles</h1>
          <p className="text-sm text-muted-foreground">
            Expansion joints — Aluminium &amp; Copper costing
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TopTab)}
        data-ocid="flexibles.tab"
      >
        {/* Tab bar */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-full sm:w-auto sm:inline-flex border border-border flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("AL")}
            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg transition-all duration-150 flex-1 sm:flex-none justify-center ${
              activeTab === "AL"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
            data-ocid="flexibles.tab"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeTab === "AL" ? "bg-white" : "bg-blue-500"
              }`}
            />
            Aluminium
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CU")}
            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg transition-all duration-150 flex-1 sm:flex-none justify-center ${
              activeTab === "CU"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            }`}
            data-ocid="flexibles.tab"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeTab === "CU" ? "bg-white" : "bg-amber-500"
              }`}
            />
            Copper
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SAVED")}
            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg transition-all duration-150 flex-1 sm:flex-none justify-center ${
              activeTab === "SAVED"
                ? "bg-slate-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-ocid="flexibles.tab"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeTab === "SAVED" ? "bg-white" : "bg-slate-400"
              }`}
            />
            Saved Jobs
          </button>
        </div>

        <TabsContent value="AL" className="mt-6">
          <TabCalculator
            materialTab="AL"
            editingJob={editingJob?.materialTab === "AL" ? editingJob : null}
            editingDiscountPct={
              editingJob?.materialTab === "AL" ? editingDiscountPct : 0
            }
            onEditComplete={handleEditComplete}
          />
        </TabsContent>

        <TabsContent value="CU" className="mt-6">
          <TabCalculator
            materialTab="CU"
            editingJob={editingJob?.materialTab === "CU" ? editingJob : null}
            editingDiscountPct={
              editingJob?.materialTab === "CU" ? editingDiscountPct : 0
            }
            onEditComplete={handleEditComplete}
          />
        </TabsContent>

        <TabsContent value="SAVED" className="mt-6">
          <SavedJobsTab onEditJob={handleEditJob} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
