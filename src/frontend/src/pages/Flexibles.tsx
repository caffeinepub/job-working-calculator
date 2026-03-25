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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Loader2, Save, Trash2 } from "lucide-react";
import { useState } from "react";
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

  const [description, setDescription] = useState("");
  const [sheetBunchWidth, setSheetBunchWidth] = useState<number | "">("");
  const [thickness, setThickness] = useState<number | "">("");
  const [numBars, setNumBars] = useState<1 | 2>(1);
  const [customerId, setCustomerId] = useState<string>("none");

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

  const widthNum = typeof sheetBunchWidth === "number" ? sheetBunchWidth : 0;
  const thicknessNum = typeof thickness === "number" ? thickness : 0;

  const labourRate =
    thicknessNum > 0 ? interpolateRate(thicknessNum, rateMap) : 0;
  const weldingCost =
    widthNum > 0 && thicknessNum > 0 ? (widthNum / 25) * labourRate : 0;
  const chamferingCost = numBars * settings.flexChamferingRate;
  const subtotal = weldingCost + chamferingCost;
  const overheadCost = subtotal * (settings.overheadPct / 100);
  const profitCost = (subtotal + overheadCost) * (settings.profitPct / 100);
  const totalCost = subtotal + overheadCost + profitCost;

  const canCalculate = widthNum > 0 && thicknessNum > 0;

  const handleSave = async () => {
    if (!canCalculate) return;
    try {
      await saveJob.mutateAsync({
        description: description.trim(),
        customerId: customerId === "none" ? null : customerId,
        materialTab,
        sheetBunchWidth: widthNum,
        thickness: thicknessNum,
        numBars: BigInt(numBars),
        weldingCost,
        chamferingCost,
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
                placeholder="Optional description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            {/* Thickness */}
            <div className="space-y-1.5">
              <Label htmlFor={`flex-thick-${materialTab}`}>
                Thickness (mm)
              </Label>
              <Input
                id={`flex-thick-${materialTab}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="e.g. 6, 10, 12, 12.7"
                value={thickness}
                onChange={(e) =>
                  setThickness(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="flexibles.input"
              />
              {thicknessNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Labour rate at {thicknessNum}mm:{" "}
                  <span className="font-medium text-foreground">
                    Rs {labourRate.toFixed(2)} / 25mm
                  </span>
                </p>
              )}
            </div>

            {/* Number of Bars */}
            <div className="space-y-1.5">
              <Label>Number of Bars</Label>
              <Select
                value={String(numBars)}
                onValueChange={(v) => setNumBars(Number(v) as 1 | 2)}
              >
                <SelectTrigger data-ocid="flexibles.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    1 Bar (Rs {settings.flexChamferingRate} chamfering)
                  </SelectItem>
                  <SelectItem value="2">
                    2 Bars (Rs {settings.flexChamferingRate * 2} chamfering)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

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
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-xs text-foreground border border-border mb-4 space-y-1">
              <div>Welding Cost = (Sheet Bunch Width ÷ 25) × Labour Rate</div>
              <div>
                Chamfering = No. of Bars × Rs {settings.flexChamferingRate}
              </div>
              <div>
                Overhead = {settings.overheadPct}% of (Welding + Chamfering)
              </div>
              <div>Profit = {settings.profitPct}% of (Subtotal + Overhead)</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Sheet Bunch Width
                </span>
                <span className="text-sm font-medium">
                  {widthNum > 0 ? `${widthNum} mm` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Thickness</span>
                <span className="text-sm font-medium">
                  {thicknessNum > 0 ? `${thicknessNum} mm` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Labour Rate
                </span>
                <span className="text-sm font-medium">
                  {thicknessNum > 0
                    ? `Rs ${labourRate.toFixed(2)} / 25mm`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Welding Cost
                </span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${weldingCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Chamfering ({numBars} bar{numBars > 1 ? "s" : ""})
                </span>
                <span className="text-sm font-medium">
                  Rs {chamferingCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Overhead ({settings.overheadPct}%)
                </span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${overheadCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Profit ({settings.profitPct}%)
                </span>
                <span className="text-sm font-medium">
                  {canCalculate ? `Rs ${profitCost.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
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
                    <TableHead className="text-right">Thick (mm)</TableHead>
                    <TableHead className="text-right">Bars</TableHead>
                    <TableHead className="text-right">Welding</TableHead>
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
                        {job.thickness}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge variant="outline" className="text-xs">
                          {String(job.numBars)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        Rs {job.weldingCost.toFixed(2)}
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

      {/* Material tabs */}
      <Tabs defaultValue="AL" data-ocid="flexibles.tab">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger
            value="AL"
            className="flex-1 sm:flex-none"
            data-ocid="flexibles.tab"
          >
            Aluminium
          </TabsTrigger>
          <TabsTrigger
            value="CU"
            className="flex-1 sm:flex-none"
            data-ocid="flexibles.tab"
          >
            Copper
          </TabsTrigger>
        </TabsList>

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
