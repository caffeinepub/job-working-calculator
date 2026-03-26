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
import { useFormulaSettings } from "../hooks/useFormulaSettings";
import {
  useCustomers,
  useDeleteFlexibleJob,
  useFlexibleJobs,
  useSaveFlexibleJob,
} from "../hooks/useQueries";

type MaterialTab = "AL" | "CU";

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

interface TabCalculatorProps {
  materialTab: MaterialTab;
}

// Per-row formula toggle
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

function TabCalculator({ materialTab }: TabCalculatorProps) {
  const { settings, updateSetting, save: saveSettings } = useFormulaSettings();
  const { data: customers = [] } = useCustomers();
  const { data: savedJobs = [], isLoading: jobsLoading } = useFlexibleJobs();
  const saveJob = useSaveFlexibleJob();
  const deleteJob = useDeleteFlexibleJob();

  const numberOfFolds = 1;

  const [description, setDescription] = useState("");
  const [centerLength, setCenterLength] = useState<number | "">("");
  const [sheetBunchWidth, setSheetBunchWidth] = useState<number | "">("");
  const [sheetThicknessMm, setSheetThicknessMm] = useState<0.28 | 0.3 | "">("");
  const [sheetBunchThickness, setSheetBunchThickness] = useState<number | "">(
    "",
  );
  const [barsSupplied, setBarsSupplied] = useState(false);

  // Separate bar dimensions
  const [sameBars, setSameBars] = useState(true);
  const [bar1Length, setBar1Length] = useState<number | "">("");
  const [bar1Width, setBar1Width] = useState<number | "">("");
  const [bar1Thickness, setBar1Thickness] = useState<number | "">("");
  const [bar2Length, setBar2Length] = useState<number | "">("");
  const [bar2Width, setBar2Width] = useState<number | "">("");
  const [bar2Thickness, setBar2Thickness] = useState<number | "">("");

  const [drillingEnabled, setDrillingEnabled] = useState(false);
  const [numberOfDrills, setNumberOfDrills] = useState<number>(1);
  const [customerId, setCustomerId] = useState<string>("none");

  // Discount
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

  // Keep localRate in sync when settings change externally
  useEffect(() => {
    setLocalRate(settingsRate);
    setRateInputVal(String(settingsRate));
  }, [settingsRate]);

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

  const handleRateEditConfirm = () => {
    const newRate = Number(rateInputVal);
    if (Number.isNaN(newRate) || newRate <= 0) {
      toast.error("Enter a valid rate");
      return;
    }
    if (newRate === localRate) {
      setEditingRate(false);
      return;
    }
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
  };

  const handleDeleteRateHistory = (idx: number) => {
    const updated = rateHistory.filter((_, i) => i !== idx);
    setRateHistory(updated);
    saveRateHistory(materialTab, updated);
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

  // Discount calculations
  const discountNum = typeof discountPct === "number" ? discountPct : 0;
  const hasDiscount = discountNum > 0 && discountNum < 100;
  const quotedPrice = hasDiscount
    ? totalCost / (1 - discountNum / 100)
    : totalCost;
  const discountAmount = hasDiscount ? quotedPrice - totalCost : 0;

  const canCalculate =
    widthNum > 0 &&
    sheetBunchThkNum > 0 &&
    sheetThkNum > 0 &&
    sheetCountNum > 0;

  // Fixed: Rate per Meter = totalCost / totalWeldLength (in meters)
  const ratePerMeter =
    canCalculate && totalWeldLength > 0
      ? totalCost / (totalWeldLength / 1000)
      : null;

  const handleSave = async () => {
    if (!canCalculate) return;
    try {
      await saveJob.mutateAsync({
        description: description.trim(),
        customerId: customerId === "none" ? null : customerId,
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
      toast.success("Flexible job saved");
    } catch {
      toast.error("Failed to save job");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJob.mutateAsync(id);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const formatDate = (ts: bigint) => {
    return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const tabJobs = savedJobs.filter((j) => j.materialTab === materialTab);

  return (
    <div className="space-y-6">
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
              {hasDiscount && canCalculate && (
                <p className="text-xs text-muted-foreground">
                  Quote{" "}
                  <span className="font-semibold text-foreground">
                    Rs {quotedPrice.toFixed(2)}
                  </span>{" "}
                  → after {discountNum}% discount customer pays{" "}
                  <span className="font-semibold text-foreground">
                    Rs {totalCost.toFixed(2)}
                  </span>
                </p>
              )}
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
                <p className="text-sm font-medium">Drilling Required?</p>
                <p className="text-xs text-muted-foreground">
                  Toggle if drilling is needed for this job
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

            {/* Customer */}
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-ocid="flexibles.select">
                  <SelectValue />
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

            <Button
              className="w-full gap-2 mt-2"
              disabled={!canCalculate || saveJob.isPending}
              onClick={handleSave}
              data-ocid="flexibles.primary_button"
            >
              {saveJob.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saveJob.isPending ? "Saving…" : "Save This Job"}
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
                value={materialCost > 0 ? `Rs ${materialCost.toFixed(2)}` : "—"}
                formula={`TotalWt × 1.2 × ₹${localRate}/kg`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="cutting"
                label="Sheet Cutting Cost"
                value={cuttingCost > 0 ? `Rs ${cuttingCost.toFixed(2)}` : "—"}
                formula="(Sheets + 4) × 2.5"
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="folding"
                label="Folding Cost"
                value={`Rs ${foldingCost.toFixed(2)}`}
                formula={`1 fold × ₹${settings.flexFoldingCostPerFold}`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="chamfer"
                label="Chamfering"
                value={`Rs ${chamferingCost.toFixed(2)}`}
                formula={`₹${chamferingCost} (both bars, always)`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              {drillingEnabled && effectiveDrills > 0 && (
                <FormulaRow
                  rowKey="drilling"
                  label="Drilling"
                  value={`Rs ${drillingCost.toFixed(2)}`}
                  formula={`${effectiveDrills} × ₹${settings.flexDrillingCostPerHole}/drill`}
                  openFormulas={openFormulas}
                  toggleFormula={toggleFormula}
                />
              )}
              <FormulaRow
                rowKey="welding"
                label="Welding Cost"
                value={canCalculate ? `Rs ${weldingCost.toFixed(2)}` : "—"}
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
                value={canCalculate ? `Rs ${overheadCost.toFixed(2)}` : "—"}
                formula={`${settings.overheadPct}% of subtotal`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              <FormulaRow
                rowKey="profit"
                label="Profit"
                value={canCalculate ? `Rs ${profitCost.toFixed(2)}` : "—"}
                formula={`${settings.profitPct}% of (subtotal + overhead)`}
                openFormulas={openFormulas}
                toggleFormula={toggleFormula}
              />
              {/* Base cost */}
              <div className="border-b border-border">
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-semibold text-foreground">
                    {hasDiscount ? "Your Cost" : "Total Cost"}
                  </span>
                  <span
                    className={`font-bold ${hasDiscount ? "text-sm text-muted-foreground" : "text-lg text-primary"}`}
                    data-ocid="flexibles.card"
                  >
                    {canCalculate ? `Rs ${totalCost.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Discount section */}
              {hasDiscount && canCalculate && (
                <>
                  <div className="border-b border-border">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">
                        Quoted Price (before discount)
                      </span>
                      <span className="text-sm font-semibold">
                        Rs {quotedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="border-b border-border">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">
                        Discount ({discountNum}%)
                      </span>
                      <span className="text-sm font-medium text-red-500">
                        − Rs {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="border-b border-border">
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-semibold text-foreground">
                        Final Price (Customer Pays)
                      </span>
                      <span
                        className="text-lg font-bold text-primary"
                        data-ocid="flexibles.card"
                      >
                        Rs {totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}

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

      {/* Saved Jobs */}
      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Saved {materialTab === "AL" ? "Aluminium" : "Copper"} Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobsLoading ? (
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
                No saved {materialTab === "AL" ? "Aluminium" : "Copper"} jobs
                yet. Calculate above and save when needed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="flexibles.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Width (mm)</TableHead>
                    <TableHead className="text-right">Sheets</TableHead>
                    <TableHead className="text-right">Material Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabJobs.map((job, idx) => (
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
                        {job.sheetBunchWidth}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge variant="outline" className="text-xs">
                          {String((job as any).sheetCount)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        Rs {(job as any).materialCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        Rs {job.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(job.id)}
                          disabled={deleteJob.isPending}
                          data-ocid={`flexibles.delete_button.${idx + 1}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function Flexibles() {
  const [activeTab, setActiveTab] = useState<MaterialTab>("AL");

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
        onValueChange={(v) => setActiveTab(v as MaterialTab)}
        data-ocid="flexibles.tab"
      >
        <div className="flex gap-3 p-1 bg-muted/40 rounded-xl w-full sm:w-auto sm:inline-flex border border-border">
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
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeTab === "AL" ? "bg-white" : "bg-blue-500"}`}
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
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeTab === "CU" ? "bg-white" : "bg-amber-500"}`}
            />
            Copper
          </button>
        </div>

        <TabsContent value="AL" className="mt-6">
          <TabCalculator materialTab="AL" />
        </TabsContent>

        <TabsContent value="CU" className="mt-6">
          <TabCalculator materialTab="CU" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
