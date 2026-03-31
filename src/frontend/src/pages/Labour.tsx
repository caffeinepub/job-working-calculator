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
import { Clock, Loader2, Pencil, Save, Trash2, Wrench, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormulaSettings } from "../hooks/useFormulaSettings";
import {
  useCustomers,
  useDeleteLabourJob,
  useLabourJobs,
  useSaveLabourJob,
} from "../hooks/useQueries";

// ── Gutter Weld localStorage helpers ─────────────────────────────────────
const GUTTER_RATE_KEY = "gutterWeldRate";
const GUTTER_HISTORY_KEY = "gutterWeldRateHistory";
const GUTTER_JOBS_KEY = "gutterWeldJobs";

interface GutterRateEntry {
  rate: number;
  changedAt: number;
}

interface GutterWeldJob {
  id: string;
  numJoints: number;
  numBrackets: number;
  numDummy: number;
  weldLengthMm: number;
  labourCost: number;
  totalFullLength: number;
  totalWeldLines: number;
  totalCost: number;
  costPerFullLength: number;
  createdAt: number;
}

function getGutterRate(): number {
  try {
    const v = localStorage.getItem(GUTTER_RATE_KEY);
    return v ? Number(v) : 800;
  } catch {
    return 800;
  }
}

function setGutterRate(rate: number) {
  const old = getGutterRate();
  if (old !== rate) {
    const history = getGutterRateHistory();
    history.push({ rate: old, changedAt: Date.now() });
    localStorage.setItem(GUTTER_HISTORY_KEY, JSON.stringify(history));
  }
  localStorage.setItem(GUTTER_RATE_KEY, String(rate));
}

function getGutterRateHistory(): GutterRateEntry[] {
  try {
    const v = localStorage.getItem(GUTTER_HISTORY_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function deleteGutterRateHistory(index: number) {
  const history = getGutterRateHistory();
  history.splice(index, 1);
  localStorage.setItem(GUTTER_HISTORY_KEY, JSON.stringify(history));
}

function getGutterJobs(): GutterWeldJob[] {
  try {
    const v = localStorage.getItem(GUTTER_JOBS_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function saveGutterJob(job: GutterWeldJob) {
  const jobs = getGutterJobs();
  jobs.push(job);
  localStorage.setItem(GUTTER_JOBS_KEY, JSON.stringify(jobs));
}

function deleteGutterJob(id: string) {
  const jobs = getGutterJobs().filter((j) => j.id !== id);
  localStorage.setItem(GUTTER_JOBS_KEY, JSON.stringify(jobs));
}

function formatDate(ts: bigint | number): string {
  return new Date(
    typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Aluminium Rate localStorage helpers ───────────────────────────────────
const AL_RATE_KEY = "labour_al_rate";

function getAlRate(): number {
  try {
    const v = localStorage.getItem(AL_RATE_KEY);
    return v ? Number(v) : 900;
  } catch {
    return 900;
  }
}

function setAlRate(rate: number) {
  localStorage.setItem(AL_RATE_KEY, String(rate));
}

function AluminiumTab() {
  const { data: savedJobs = [], isLoading: jobsLoading } = useLabourJobs();
  const saveJob = useSaveLabourJob();
  const deleteJobMut = useDeleteLabourJob();
  const { data: customers = [] } = useCustomers();

  const [alDesc, setAlDesc] = useState("");
  const [weldLength, setWeldLength] = useState<number | "">("");
  const [customerId, setCustomerId] = useState("none");
  const [alRate, setAlRateState] = useState<number>(getAlRate);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState<number | "">(getAlRate());

  const weldNum = typeof weldLength === "number" ? weldLength : 0;
  const totalCost = weldNum > 0 ? (weldNum / 1000) * alRate : 0;
  const alJobs = savedJobs.filter((j) => j.materialType === "AL");

  const handleSaveRate = () => {
    const r = typeof rateInput === "number" ? rateInput : alRate;
    setAlRate(r);
    setAlRateState(r);
    setEditingRate(false);
    toast.success("Aluminium labour rate updated");
  };

  const handleSave = async () => {
    if (weldNum <= 0) return;
    try {
      await saveJob.mutateAsync({
        description: alDesc.trim(),
        customerId: customerId === "none" ? null : customerId,
        materialType: "AL",
        weldLength: weldNum,
        laborRate: alRate,
        totalCost,
      });
      toast.success("Aluminium labour job saved");
    } catch {
      toast.error("Failed to save job");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJobMut.mutateAsync(id);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aluminium Weld Labour</CardTitle>
              {editingRate ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    className="w-20 h-7 text-right text-sm"
                    value={rateInput}
                    onChange={(e) =>
                      setRateInput(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground">₹/m</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={handleSaveRate}
                  >
                    <Save size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setEditingRate(false)}
                  >
                    <X size={12} />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setRateInput(alRate);
                    setEditingRate(true);
                  }}
                  data-ocid="labour.al.toggle"
                >
                  <Pencil size={11} /> ₹{alRate}/m
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="al-desc">Description (optional)</Label>
              <Input
                id="al-desc"
                placeholder="Job description…"
                value={alDesc}
                onChange={(e) => setAlDesc(e.target.value)}
                data-ocid="labour.al.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="al-weld">Weld Length (mm)</Label>
              <Input
                id="al-weld"
                type="number"
                min={0}
                placeholder="Enter weld length in mm"
                value={weldLength}
                onChange={(e) =>
                  setWeldLength(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                data-ocid="labour.al.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-ocid="labour.al.select">
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
            <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              Current rate:{" "}
              <span className="font-semibold text-foreground">
                ₹{alRate}/meter
              </span>
              . Click the pencil icon to edit.
            </div>
            <Button
              className="w-full gap-2"
              disabled={weldNum <= 0 || saveJob.isPending}
              onClick={handleSave}
              data-ocid="labour.al.primary_button"
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

        <Card className="border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border mb-4">
              Labour Cost = (Weld Length mm / 1000) × ₹{alRate}/m
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Weld Length
                </span>
                <span className="text-sm font-medium">
                  {weldNum > 0
                    ? `${weldNum} mm (${(weldNum / 1000).toFixed(3)} m)`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Labour Rate
                </span>
                <span className="text-sm font-medium">₹{alRate} / meter</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-foreground">
                  Total Cost
                </span>
                <span
                  className="text-lg font-bold text-primary"
                  data-ocid="labour.al.card"
                >
                  {weldNum > 0 ? `₹${totalCost.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved AL Jobs */}
      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Saved Aluminium Labour Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobsLoading ? (
            <div
              className="flex items-center justify-center py-12 text-muted-foreground gap-2"
              data-ocid="labour.al.loading_state"
            >
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : alJobs.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="labour.al.empty_state"
            >
              <Wrench size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No saved aluminium labour jobs yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="labour.al.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Weld Length</TableHead>
                    <TableHead className="text-right">Rate/m</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alJobs.map((job, idx) => (
                    <TableRow
                      key={job.id}
                      data-ocid={`labour.al.item.${idx + 1}`}
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
                        {job.weldLength} mm
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ₹{job.laborRate}/m
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        ₹{job.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(job.id)}
                          disabled={deleteJobMut.isPending}
                          data-ocid={`labour.al.delete_button.${idx + 1}`}
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

// ── Component ─────────────────────────────────────────────────────────────
export function Labour() {
  const { settings } = useFormulaSettings();
  const { data: customers = [] } = useCustomers();
  const { data: savedJobs = [], isLoading: jobsLoading } = useLabourJobs();
  const saveJob = useSaveLabourJob();
  const deleteJobMut = useDeleteLabourJob();

  // ── SS304 state ─────────────────────────────────────────────────────────
  const [ss304Desc, setSs304Desc] = useState("");
  const [ss304WeldLength, setSs304WeldLength] = useState<number | "">("");
  const [ss304CustomerId, setSs304CustomerId] = useState("none");

  const ss304Rate = settings.labourRateSS304;
  const ss304WeldNum =
    typeof ss304WeldLength === "number" ? ss304WeldLength : 0;
  const ss304TotalCost =
    ss304WeldNum > 0 ? (ss304WeldNum / 1000) * ss304Rate : 0;

  const handleSaveSS304 = async () => {
    if (ss304WeldNum <= 0) return;
    try {
      await saveJob.mutateAsync({
        description: ss304Desc.trim(),
        customerId: ss304CustomerId === "none" ? null : ss304CustomerId,
        materialType: "SS304",
        weldLength: ss304WeldNum,
        laborRate: ss304Rate,
        totalCost: ss304TotalCost,
      });
      toast.success("Labour job saved");
    } catch {
      toast.error("Failed to save labour job");
    }
  };

  const handleDeleteSS304 = async (id: string) => {
    try {
      await deleteJobMut.mutateAsync(id);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const ss304Jobs = savedJobs.filter((j) => j.materialType === "SS304");

  // ── Gutter Welding state ──────────────────────────────────────────────────
  const [gutterRate, setGutterRateState] = useState<number>(getGutterRate);
  const [gutterRateHistory, setGutterRateHistoryState] =
    useState<GutterRateEntry[]>(getGutterRateHistory);
  const [gutterRateEditing, setGutterRateEditing] = useState(false);
  const [gutterRateDraft, setGutterRateDraft] = useState<number | "">("");
  const [showGutterHistory, setShowGutterHistory] = useState(false);
  const [gutterJobs, setGutterJobsState] =
    useState<GutterWeldJob[]>(getGutterJobs);

  const [gJoints, setGJoints] = useState<number | "">("");
  const [gBrackets, setGBrackets] = useState<number | "">("");
  const [gDummy, setGDummy] = useState<number | "">("");
  const [gWeldLength, setGWeldLength] = useState<number | "">("");
  const [gFullLength, setGFullLength] = useState<number | "">("");

  const gJointsN = typeof gJoints === "number" ? gJoints : 0;
  const gBracketsN = typeof gBrackets === "number" ? gBrackets : 0;
  const gDummyN = typeof gDummy === "number" ? gDummy : 0;
  const gWeldLenN = typeof gWeldLength === "number" ? gWeldLength : 0;
  const gFullLenN = typeof gFullLength === "number" ? gFullLength : 0;

  const gTotalWeldLines = gJointsN + gBracketsN + gDummyN;
  const gTotalCost =
    gTotalWeldLines > 0 && gWeldLenN > 0
      ? gTotalWeldLines * gutterRate * (gWeldLenN / 1000)
      : 0;
  const gCostPerFullLength =
    gFullLenN > 0 && gTotalCost > 0 ? gTotalCost / gFullLenN : 0;

  const handleUpdateGutterRate = () => {
    const r =
      typeof gutterRateDraft === "number" ? gutterRateDraft : gutterRate;
    setGutterRate(r);
    setGutterRateState(r);
    setGutterRateHistoryState(getGutterRateHistory());
    setGutterRateEditing(false);
  };

  const handleDeleteGutterHistory = (idx: number) => {
    deleteGutterRateHistory(idx);
    setGutterRateHistoryState(getGutterRateHistory());
  };

  const handleSaveGutter = () => {
    if (gTotalWeldLines <= 0 || gWeldLenN <= 0) return;
    const job: GutterWeldJob = {
      id: `gutter_${Date.now()}`,
      numJoints: gJointsN,
      numBrackets: gBracketsN,
      numDummy: gDummyN,
      weldLengthMm: gWeldLenN,
      labourCost: gutterRate,
      totalFullLength: gFullLenN,
      totalWeldLines: gTotalWeldLines,
      totalCost: gTotalCost,
      costPerFullLength: gCostPerFullLength,
      createdAt: Date.now(),
    };
    saveGutterJob(job);
    setGutterJobsState(getGutterJobs());
    toast.success("Gutter welding job saved");
  };

  const handleDeleteGutterJob = (id: string) => {
    deleteGutterJob(id);
    setGutterJobsState(getGutterJobs());
    toast.success("Job deleted");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Wrench size={18} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground border-l-4 border-green-500 pl-3">
            Labour Jobs
          </h1>
          <p className="text-sm text-muted-foreground">
            Quick calculator — save only when needed
          </p>
        </div>
      </div>

      <Tabs defaultValue="ss304">
        <TabsList className="w-full">
          <TabsTrigger
            value="ss304"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            data-ocid="labour.ss304.tab"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              SS304
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="aluminium"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
            data-ocid="labour.aluminium.tab"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Aluminium
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="gutter"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-green-500"
            data-ocid="labour.gutter.tab"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              Gutter Welding
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── SS304 Tab ────────────────────────────────────────────────── */}
        <TabsContent value="ss304" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SS304 Weld Labour</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ss304-desc">Description (optional)</Label>
                  <Input
                    id="ss304-desc"
                    placeholder="Job description…"
                    value={ss304Desc}
                    onChange={(e) => setSs304Desc(e.target.value)}
                    data-ocid="labour.ss304.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ss304-weld">Weld Length (mm)</Label>
                  <Input
                    id="ss304-weld"
                    type="number"
                    min={0}
                    placeholder="Enter weld length in mm"
                    value={ss304WeldLength}
                    onChange={(e) =>
                      setSs304WeldLength(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="labour.ss304.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer (optional)</Label>
                  <Select
                    value={ss304CustomerId}
                    onValueChange={setSs304CustomerId}
                  >
                    <SelectTrigger data-ocid="labour.ss304.select">
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
                <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
                  Current rate:{" "}
                  <span className="font-semibold text-foreground">
                    ₹{ss304Rate}/meter
                  </span>
                  . Change in Formulas &amp; Settings.
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={ss304WeldNum <= 0 || saveJob.isPending}
                  onClick={handleSaveSS304}
                  data-ocid="labour.ss304.primary_button"
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

            <Card className="border border-border rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border mb-4">
                  Labour Cost = (Weld Length mm / 1000) × ₹{ss304Rate}/m
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Weld Length
                    </span>
                    <span className="text-sm font-medium">
                      {ss304WeldNum > 0
                        ? `${ss304WeldNum} mm (${(ss304WeldNum / 1000).toFixed(3)} m)`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Labour Rate
                    </span>
                    <span className="text-sm font-medium">
                      ₹{ss304Rate} / meter
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-foreground">
                      Total Cost
                    </span>
                    <span
                      className="text-lg font-bold text-primary"
                      data-ocid="labour.ss304.card"
                    >
                      {ss304WeldNum > 0 ? `₹${ss304TotalCost.toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saved SS304 Jobs */}
          <Card className="border border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Saved SS304 Labour Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {jobsLoading ? (
                <div
                  className="flex items-center justify-center py-12 text-muted-foreground gap-2"
                  data-ocid="labour.ss304.loading_state"
                >
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : ss304Jobs.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="labour.ss304.empty_state"
                >
                  <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No saved SS304 labour jobs yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="labour.ss304.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">
                          Weld Length
                        </TableHead>
                        <TableHead className="text-right">Rate/m</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ss304Jobs.map((job, idx) => (
                        <TableRow
                          key={job.id}
                          data-ocid={`labour.ss304.item.${idx + 1}`}
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
                            {job.weldLength} mm
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            ₹{job.laborRate}/m
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            ₹{job.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSS304(job.id)}
                              disabled={deleteJobMut.isPending}
                              data-ocid={`labour.ss304.delete_button.${idx + 1}`}
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
        </TabsContent>

        {/* ── Aluminium Tab ────────────────────────────────────────────── */}
        <TabsContent value="aluminium" className="space-y-6 mt-6">
          <AluminiumTab />
        </TabsContent>
        <TabsContent value="gutter" className="space-y-6 mt-6">
          {/* Rate widget */}
          <Card className="border border-border rounded-xl shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  Labour Rate:
                </span>
                {gutterRateEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-28 h-8 text-sm"
                      value={gutterRateDraft}
                      onChange={(e) =>
                        setGutterRateDraft(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      autoFocus
                      data-ocid="labour.gutter.input"
                    />
                    <span className="text-xs text-muted-foreground">
                      ₹/weld line/m
                    </span>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleUpdateGutterRate}
                      data-ocid="labour.gutter.save_button"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setGutterRateEditing(false)}
                      data-ocid="labour.gutter.cancel_button"
                    >
                      <X size={13} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">
                      ₹{gutterRate}/weld line/m
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setGutterRateDraft(gutterRate);
                        setGutterRateEditing(true);
                      }}
                      data-ocid="labour.gutter.edit_button"
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowGutterHistory((v) => !v)}
                      data-ocid="labour.gutter.toggle"
                    >
                      <Clock size={13} />
                    </Button>
                  </div>
                )}
              </div>
              {showGutterHistory && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Rate History
                  </p>
                  {gutterRateHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No history yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {gutterRateHistory.map((entry, idx) => (
                        <div
                          key={entry.changedAt}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground">
                            ₹{entry.rate}/line/m
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteGutterHistory(idx)}
                            data-ocid={`labour.gutter.delete_button.${idx + 1}`}
                          >
                            <Trash2 size={11} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Gutter Welding Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="g-joints">No of Joints</Label>
                    <Input
                      id="g-joints"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={gJoints}
                      onChange={(e) =>
                        setGJoints(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="labour.gutter.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="g-brackets">No of Brackets</Label>
                    <Input
                      id="g-brackets"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={gBrackets}
                      onChange={(e) =>
                        setGBrackets(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="labour.gutter.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="g-dummy">No of Dummy</Label>
                    <Input
                      id="g-dummy"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={gDummy}
                      onChange={(e) =>
                        setGDummy(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="labour.gutter.input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="g-weld-len">Weld Length (mm)</Label>
                    <Input
                      id="g-weld-len"
                      type="number"
                      min={0}
                      placeholder="mm"
                      value={gWeldLength}
                      onChange={(e) =>
                        setGWeldLength(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="labour.gutter.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="g-full-len">Total Full Length</Label>
                    <Input
                      id="g-full-len"
                      type="number"
                      min={0}
                      placeholder="Full length"
                      value={gFullLength}
                      onChange={(e) =>
                        setGFullLength(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      data-ocid="labour.gutter.input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-xs text-foreground border border-border mb-4 space-y-1">
                  <div>Total Weld Lines = Joints + Brackets + Dummy</div>
                  <div>
                    Total Cost = Weld Lines × Labour Cost × (Weld Length ÷ 1000)
                  </div>
                  <div>
                    Cost Per Full Length = Total Cost ÷ Total Full Length
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Total Weld Lines
                    </span>
                    <span className="text-sm font-medium">
                      {gJointsN} + {gBracketsN} + {gDummyN} ={" "}
                      <strong>{gTotalWeldLines}</strong>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Labour Cost
                    </span>
                    <span className="text-sm font-medium">
                      ₹{gutterRate}/line/m
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Weld Length
                    </span>
                    <span className="text-sm font-medium">
                      {gWeldLenN > 0 ? `${gWeldLenN} mm` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">
                      Total Cost
                    </span>
                    <span
                      className="text-xl font-bold text-primary"
                      data-ocid="labour.gutter.card"
                    >
                      {gTotalCost > 0 ? `₹${gTotalCost.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Cost Per Full Length
                    </span>
                    <span className="text-sm font-semibold">
                      {gCostPerFullLength > 0
                        ? `₹${gCostPerFullLength.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full gap-2 mt-4"
                  disabled={gTotalWeldLines <= 0 || gWeldLenN <= 0}
                  onClick={handleSaveGutter}
                  data-ocid="labour.gutter.primary_button"
                >
                  <Save size={15} />
                  Save This Job
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Saved Gutter Jobs */}
          <Card className="border border-border rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Saved Gutter Welding Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {gutterJobs.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="labour.gutter.empty_state"
                >
                  <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No saved gutter welding jobs yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="labour.gutter.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Weld Lines</TableHead>
                        <TableHead className="text-right">
                          Weld Length (mm)
                        </TableHead>
                        <TableHead className="text-right">
                          Cost/Full Length
                        </TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gutterJobs.map((job, idx) => (
                        <TableRow
                          key={job.id}
                          data-ocid={`labour.gutter.item.${idx + 1}`}
                        >
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(job.createdAt)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {job.totalWeldLines}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {job.weldLengthMm}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {job.costPerFullLength > 0
                              ? `₹${job.costPerFullLength.toFixed(2)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            ₹{job.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteGutterJob(job.id)}
                              data-ocid={`labour.gutter.delete_button.${idx + 1}`}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
