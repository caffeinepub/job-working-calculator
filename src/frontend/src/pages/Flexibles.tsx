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
  Layers,
  Loader2,
  Save,
  Trash2,
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

function TabCalculator({ materialTab }: TabCalculatorProps) {
  const { settings } = useFormulaSettings();
  const { data: customers = [] } = useCustomers();
  const { data: savedJobs = [], isLoading: jobsLoading } = useFlexibleJobs();
  const saveJob = useSaveFlexibleJob();
  const deleteJob = useDeleteFlexibleJob();

  // Number of folds is always 1
  const numberOfFolds = 1;

  const [description, setDescription] = useState("");
  const [centerLength, setCenterLength] = useState<number | "">("");
  const [sheetBunchWidth, setSheetBunchWidth] = useState<number | "">("");
  const [sheetThicknessMm, setSheetThicknessMm] = useState<0.28 | 0.3 | "">("");
  const [sheetBunchThickness, setSheetBunchThickness] = useState<number | "">(
    "",
  );
  const [barsSupplied, setBarsSupplied] = useState(false);
  const [barLength, setBarLength] = useState<number | "">("");
  const [barWidth, setBarWidth] = useState<number | "">("");
  const [barThickness, setBarThickness] = useState<number | "">("");
  const [drillingEnabled, setDrillingEnabled] = useState(false);
  const [numberOfDrills, setNumberOfDrills] = useState<number>(1);
  const [customerId, setCustomerId] = useState<string>("none");
  const [showFormulas, setShowFormulas] = useState(false);

  // Auto-fill description logic.
  // lastAutoDesc tracks what we last wrote automatically.
  // descRef lets the effect read current description without being a dependency.
  const lastAutoDesc = useRef("");
  const descRef = useRef(description);
  descRef.current = description;

  useEffect(() => {
    const w = typeof sheetBunchWidth === "number" ? sheetBunchWidth : 0;
    const t = typeof sheetBunchThickness === "number" ? sheetBunchThickness : 0;
    const l = typeof centerLength === "number" ? centerLength : 0;

    if (w > 0 && t > 0 && l > 0) {
      const auto = `${w}x${t}-${l}mm ${materialTab} Flexible`;
      const cur = descRef.current;
      // Only overwrite if field is empty or still shows a previous auto value
      if (cur === "" || cur === lastAutoDesc.current) {
        lastAutoDesc.current = auto;
        setDescription(auto);
      }
    }
  }, [sheetBunchWidth, sheetBunchThickness, centerLength, materialTab]);

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
  const materialRate =
    materialTab === "AL"
      ? settings.flexAlMaterialRate
      : settings.flexCuMaterialRate;

  const centerLengthNum = typeof centerLength === "number" ? centerLength : 0;
  const widthNum = typeof sheetBunchWidth === "number" ? sheetBunchWidth : 0;
  const sheetThkNum =
    typeof sheetThicknessMm === "number" ? sheetThicknessMm : 0;
  const sheetBunchThkNum =
    typeof sheetBunchThickness === "number" ? sheetBunchThickness : 0;
  const barLengthNum = typeof barLength === "number" ? barLength : 0;
  const barWidthNum = typeof barWidth === "number" ? barWidth : 0;
  const barThicknessNum = typeof barThickness === "number" ? barThickness : 0;

  // Auto-calculated sheet count
  const sheetCountNum =
    sheetBunchThkNum > 0 && sheetThkNum > 0
      ? Math.round(sheetBunchThkNum / sheetThkNum)
      : 0;

  // sheetBunchThk for weld length is the entered bunch thickness directly
  const sheetBunchThk = sheetBunchThkNum;

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

  const barWeight =
    barsSupplied && barLengthNum > 0 && barWidthNum > 0 && barThicknessNum > 0
      ? (barLengthNum * barWidthNum * barThicknessNum * density) / 1_000_000
      : 0;

  const totalMaterialWeight =
    (barsSupplied ? barWeight : 0) +
    stripWeight +
    sheetStackWeight +
    (barsSupplied ? barWeight : 0);

  const materialCost = totalMaterialWeight * 1.2 * materialRate;

  const cuttingCost = sheetCountNum > 0 ? (sheetCountNum + 4) * 2.5 : 0;

  const foldingCost = numberOfFolds * settings.flexFoldingCostPerFold;

  const chamferingCost = settings.flexChamferingRate;

  const effectiveDrills = drillingEnabled ? numberOfDrills : 0;
  const drillingCost = effectiveDrills * settings.flexDrillingCostPerHole;

  const totalWeldLength =
    widthNum > 0 && sheetBunchThk > 0 ? (widthNum + sheetBunchThk) * 4 : 0;

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

  const canCalculate =
    widthNum > 0 &&
    sheetBunchThkNum > 0 &&
    sheetThkNum > 0 &&
    sheetCountNum > 0;

  const ratePerMeter =
    canCalculate && centerLengthNum > 0
      ? totalCost / (centerLengthNum / 1000)
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
        barLength: barLengthNum,
        barWidth: barWidthNum,
        barThickness: barThicknessNum,
        numberOfDrills: BigInt(effectiveDrills),
        numberOfFolds: BigInt(numberOfFolds),
        sheetStackWeight,
        stripWeight,
        bar1Weight: barWeight,
        bar2Weight: barWeight,
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
      {/* Calculator + Breakdown */}
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
                  // If user clears the field, allow auto-fill to resume
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

            {/* Bar inputs — shown only when barsSupplied */}
            {barsSupplied && (
              <div className="space-y-3 pl-3 border-l-2 border-primary/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Bar Dimensions (same for both bars)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor={`flex-barlen-${materialTab}`}>
                    Bar Length (mm)
                  </Label>
                  <Input
                    id={`flex-barlen-${materialTab}`}
                    type="number"
                    min={0}
                    placeholder="Bar length in mm"
                    value={barLength}
                    onChange={(e) =>
                      setBarLength(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="flexibles.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`flex-barw-${materialTab}`}>
                    Bar Width (mm)
                  </Label>
                  <Input
                    id={`flex-barw-${materialTab}`}
                    type="number"
                    min={0}
                    placeholder="Bar width in mm"
                    value={barWidth}
                    onChange={(e) =>
                      setBarWidth(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="flexibles.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`flex-barth-${materialTab}`}>
                    Bar Thickness (mm)
                  </Label>
                  <Input
                    id={`flex-barth-${materialTab}`}
                    type="number"
                    min={0}
                    placeholder="Bar thickness in mm"
                    value={barThickness}
                    onChange={(e) =>
                      setBarThickness(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="flexibles.input"
                  />
                </div>
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

            {/* Number of Drills — shown only when drilling enabled */}
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

            {/* Save */}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
              <button
                type="button"
                onClick={() => setShowFormulas((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFormulas ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
                {showFormulas ? "Hide Formulas" : "Show Formulas"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Formula reference box — toggleable */}
            {showFormulas && (
              <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-xs text-foreground border border-border mb-4 space-y-1">
                <div>
                  Sheet Stack Wt = (CenterLen+25) × Width × Thk × Count × ρ / 1M
                </div>
                <div>Strip Wt = Width × 20 × 2 × 4 × ρ / 1M</div>
                <div>Bar Wt = L × W × T × ρ / 1M (each, if supplied)</div>
                <div>Material Cost = TotalWt × 1.2 × Rate</div>
                <div>Cutting = (Sheets + 4) × 2.5</div>
                <div>Welding = (Width ÷ 25) × Labour Rate</div>
                <div>Total Weld Len = (Width + BunchThk) × 4</div>
                <div>
                  Overhead = {settings.overheadPct}% · Profit ={" "}
                  {settings.profitPct}% of (subtotal+overhead)
                </div>
              </div>
            )}

            <div className="space-y-1">
              {/* Material weights */}
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Sheet Stack Weight
                </span>
                <span className="text-sm font-medium">
                  {sheetStackWeight > 0
                    ? `${sheetStackWeight.toFixed(3)} kg`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Strip Weight
                </span>
                <span className="text-sm font-medium">
                  {stripWeight > 0 ? `${stripWeight.toFixed(3)} kg` : "—"}
                </span>
              </div>
              {barsSupplied && (
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Bar Weight (×2)
                  </span>
                  <span className="text-sm font-medium">
                    {barWeight > 0 ? `${barWeight.toFixed(3)} kg each` : "—"}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground font-medium">
                  Total Material Weight
                </span>
                <span className="text-sm font-semibold">
                  {totalMaterialWeight > 0
                    ? `${totalMaterialWeight.toFixed(3)} kg`
                    : "—"}
                </span>
              </div>

              {/* Costs — label only, no formula hints */}
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Material Cost
                </span>
                <span className="text-sm font-medium">
                  {materialCost > 0 ? `Rs ${materialCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Sheet Cutting Cost
                </span>
                <span className="text-sm font-medium">
                  {cuttingCost > 0 ? `Rs ${cuttingCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Folding Cost
                </span>
                <span className="text-sm font-medium">
                  Rs {foldingCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Chamfering
                </span>
                <span className="text-sm font-medium">
                  Rs {chamferingCost.toFixed(2)}
                </span>
              </div>
              {drillingEnabled && effectiveDrills > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    Drilling
                  </span>
                  <span className="text-sm font-medium">
                    Rs {drillingCost.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Welding Cost
                </span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${weldingCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Total Weld Length
                </span>
                <span className="text-sm font-medium">
                  {totalWeldLength > 0
                    ? `${totalWeldLength.toFixed(1)} mm`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">Overhead</span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${overheadCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-sm text-muted-foreground">Profit</span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${profitCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">
                  Total Cost
                </span>
                <span
                  className="text-lg font-bold text-primary"
                  data-ocid="flexibles.card"
                >
                  {canCalculate ? `Rs ${totalCost.toFixed(2)}` : "—"}
                </span>
              </div>
              {/* Rate per Meter */}
              {canCalculate && ratePerMeter !== null && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-semibold text-foreground">
                    Rate per Meter
                  </span>
                  <span className="text-lg font-bold text-primary">
                    Rs {ratePerMeter.toFixed(2)} / m
                  </span>
                </div>
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
      {/* Page header */}
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

      {/* Material tabs — custom styled for clear AL/CU distinction */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as MaterialTab)}
        data-ocid="flexibles.tab"
      >
        <div className="flex gap-3 p-1 bg-muted/40 rounded-xl w-full sm:w-auto sm:inline-flex border border-border">
          {/* Aluminium tab */}
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

          {/* Copper tab */}
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
