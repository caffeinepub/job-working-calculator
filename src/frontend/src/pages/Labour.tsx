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
import { Loader2, Save, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormulaSettings } from "../hooks/useFormulaSettings";
import {
  useCustomers,
  useDeleteLabourJob,
  useLabourJobs,
  useSaveLabourJob,
} from "../hooks/useQueries";

type MaterialType = "SS304" | "Aluminium";

export function Labour() {
  const { settings } = useFormulaSettings();
  const { data: customers = [] } = useCustomers();
  const { data: savedJobs = [], isLoading: jobsLoading } = useLabourJobs();
  const saveJob = useSaveLabourJob();
  const deleteJob = useDeleteLabourJob();

  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>("SS304");
  const [weldLength, setWeldLength] = useState<number | "">("");
  const [customerId, setCustomerId] = useState<string>("none");

  const rate =
    materialType === "SS304" ? settings.labourRateSS304 : settings.labourRateAL;
  const weldLengthNum = typeof weldLength === "number" ? weldLength : 0;
  // Formula: Labour Cost = (Weld Length in mm / 1000) × Rate per meter
  const totalCost = weldLengthNum > 0 ? (weldLengthNum / 1000) * rate : 0;

  const handleSave = async () => {
    if (weldLengthNum <= 0) return;
    try {
      await saveJob.mutateAsync({
        description: description.trim(),
        customerId: customerId === "none" ? null : customerId,
        materialType,
        weldLength: weldLengthNum,
        laborRate: rate,
        totalCost,
      });
      toast.success("Labour job saved");
    } catch {
      toast.error("Failed to save labour job");
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Wrench size={18} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Labour Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Quick calculator — save only when needed
          </p>
        </div>
      </div>

      {/* Calculator + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="labour-desc">Job Description</Label>
              <Input
                id="labour-desc"
                placeholder="Optional description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-ocid="labour.input"
              />
            </div>

            {/* Material Type */}
            <div className="space-y-1.5">
              <Label>Material Type</Label>
              <Select
                value={materialType}
                onValueChange={(v) => setMaterialType(v as MaterialType)}
              >
                <SelectTrigger data-ocid="labour.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SS304">SS304</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weld Length */}
            <div className="space-y-1.5">
              <Label htmlFor="weld-length">Weld Length (mm)</Label>
              <Input
                id="weld-length"
                type="number"
                min={0}
                placeholder="Enter weld length in mm"
                value={weldLength}
                onChange={(e) =>
                  setWeldLength(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="labour.input"
              />
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-ocid="labour.select">
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

            {/* Save button */}
            <Button
              className="w-full gap-2 mt-2"
              disabled={weldLengthNum <= 0 || saveJob.isPending}
              onClick={handleSave}
              data-ocid="labour.primary_button"
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
            {/* Formula display */}
            <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border mb-4">
              Labour Cost = (Weld Length mm / 1000) × Rate per meter
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Weld Length
                </span>
                <span className="text-sm font-medium">
                  {weldLengthNum > 0
                    ? `${weldLengthNum} mm (${(weldLengthNum / 1000).toFixed(3)} m)`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Material</span>
                <Badge variant="outline">{materialType}</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Labour Rate
                </span>
                <span className="text-sm font-medium">Rs {rate} / meter</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-foreground">
                  Total Cost
                </span>
                <span
                  className="text-lg font-bold text-primary"
                  data-ocid="labour.card"
                >
                  {weldLengthNum > 0 ? `Rs ${totalCost.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Jobs */}
      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saved Labour Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobsLoading ? (
            <div
              className="flex items-center justify-center py-12 text-muted-foreground gap-2"
              data-ocid="labour.loading_state"
            >
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading saved jobs…</span>
            </div>
          ) : savedJobs.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="labour.empty_state"
            >
              <Wrench size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No saved labour jobs yet. Use the calculator above and save when
                needed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="labour.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Weld Length</TableHead>
                    <TableHead className="text-right">Rate/m</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedJobs.map((job, idx) => (
                    <TableRow key={job.id} data-ocid={`labour.item.${idx + 1}`}>
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
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {job.materialType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {job.weldLength} mm
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        Rs {job.laborRate}/m
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
                          data-ocid={`labour.delete_button.${idx + 1}`}
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
