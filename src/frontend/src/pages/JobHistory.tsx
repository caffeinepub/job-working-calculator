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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Eye,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { RawMaterial, SavedJob } from "../backend";
import {
  useCustomers,
  useDeleteJob,
  useJobs,
  useMaterials,
  useUpdateMaterial,
} from "../hooks/useQueries";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function bigIntToDate(ts: bigint) {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function bigIntToISO(ts: bigint) {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

interface JobHistoryProps {
  onEditJob: (savedJob: SavedJob) => void;
}

function JobDetailDialog({
  job,
  onClose,
  materials,
}: {
  job: SavedJob;
  onClose: () => void;
  materials: RawMaterial[];
}) {
  const updateMaterialMutation = useUpdateMaterial();
  const [showRateChecker, setShowRateChecker] = useState(false);
  const [newRates, setNewRates] = useState<Record<string, string>>({});

  const handlePrint = () => window.print();

  const totalMaterial = job.jobLineItems.reduce(
    (s, item) => s + item.finalPrice,
    0,
  );
  const totalWelding = job.weldingLineItems.reduce(
    (s, item) => s + item.finalPrice,
    0,
  );
  const laborCost = job.job.laborRate * job.totalProductWeight * 1.12;
  const overhead = (totalMaterial + laborCost + totalWelding) * 0.05;
  const profit = (totalMaterial + laborCost + totalWelding + overhead) * 0.1;

  // Unique materials used in this job
  const uniqueJobMaterials = useMemo(() => {
    const seen = new Set<string>();
    return job.jobLineItems
      .filter((item) => {
        if (seen.has(item.materialId)) return false;
        seen.add(item.materialId);
        return true;
      })
      .map((item) => materials.find((m) => m.id === item.materialId))
      .filter((m): m is RawMaterial => !!m);
  }, [job.jobLineItems, materials]);

  const openRateChecker = () => {
    const initial: Record<string, string> = {};
    for (const mat of uniqueJobMaterials) {
      initial[mat.id] = String(mat.currentRate);
    }
    setNewRates(initial);
    setShowRateChecker(true);
  };

  const applyRateUpdates = async () => {
    const updates = uniqueJobMaterials.filter(
      (mat) =>
        newRates[mat.id] !== undefined &&
        Number(newRates[mat.id]) !== mat.currentRate,
    );

    if (updates.length === 0) {
      toast.info("No rate changes to apply.");
      setShowRateChecker(false);
      return;
    }

    try {
      await Promise.all(
        updates.map((mat) =>
          updateMaterialMutation.mutateAsync({
            id: mat.id,
            grade: mat.grade,
            materialType: mat.materialType,
            size: mat.size,
            weightPerMeter: mat.weightPerMeter,
            currentRate: Number(newRates[mat.id]),
          }),
        ),
      );
      toast.success("Rates updated. Rate history recorded.");
      setShowRateChecker(false);
    } catch {
      toast.error("Failed to update some rates. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto print-dialog"
        data-ocid="jobhistory.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase size={18} className="text-primary" />
            {job.job.name}
            {job.job.transportIncluded && (
              <Badge variant="outline" className="ml-2 text-xs gap-1">
                <Truck size={11} /> Transport
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div id="print-area">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">Customer:</span>{" "}
              <span className="font-medium">{job.customerName ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">
                {bigIntToDate(job.job.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Labour Rate:</span>{" "}
              <span className="font-medium">₹{fmt(job.job.laborRate)}/kg</span>
            </div>
            <div>
              <span className="text-muted-foreground">Transport:</span>{" "}
              <span className="font-medium">
                {job.job.transportIncluded ? "Included" : "Not included"}
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          {job.jobLineItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Materials
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs">Material</TableHead>
                    <TableHead className="text-xs">Length (m)</TableHead>
                    <TableHead className="text-xs">Raw Wt (kg)</TableHead>
                    <TableHead className="text-xs">Total Wt (kg)</TableHead>
                    <TableHead className="text-xs text-right">
                      Mat. Cost
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.jobLineItems.map((item) => {
                    const mat = materials.find((m) => m.id === item.materialId);
                    return (
                      <TableRow
                        key={item.materialId}
                        className="border-b border-border/60"
                      >
                        <TableCell className="text-xs">
                          {mat
                            ? `${mat.grade} · ${mat.materialType} · ${mat.size}`
                            : item.materialId}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.lengthMeters}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {fmt(item.rawWeight)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {fmt(item.totalWeight)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          ₹{fmt(item.finalPrice)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {job.weldingLineItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Welding Materials
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs">Grade</TableHead>
                    <TableHead className="text-xs">Weight (kg)</TableHead>
                    <TableHead className="text-xs">Rate (₹/kg)</TableHead>
                    <TableHead className="text-xs text-right">
                      Welding Cost
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.weldingLineItems.map((item) => (
                    <TableRow
                      key={`${item.grade}-${item.weightKg}`}
                      className="border-b border-border/60"
                    >
                      <TableCell className="text-xs font-medium">
                        {item.grade}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {fmt(item.weightKg)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        ₹{fmt(item.ratePerKg)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-right">
                        ₹{fmt(item.finalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Separator className="my-3" />

          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Cost Breakdown
            </h3>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Total Material Cost
                </span>
                <span className="font-mono">₹{fmt(totalMaterial)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Labour (₹{fmt(job.job.laborRate)}/kg)
                </span>
                <span className="font-mono">₹{fmt(laborCost)}</span>
              </div>
              {totalWelding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Welding Total</span>
                  <span className="font-mono">₹{fmt(totalWelding)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overhead (5%)</span>
                <span className="font-mono">₹{fmt(overhead)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit (10%)</span>
                <span className="font-mono">₹{fmt(profit)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-bold">
                <span>Total Final Price</span>
                <span className="font-mono text-primary">
                  ₹{fmt(job.totalFinalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product Weight</span>
                <span className="font-mono">
                  {fmt(job.totalProductWeight)} kg
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate per kg</span>
                <span className="font-mono">₹{fmt(job.ratePerKg)}/kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Checker Panel */}
        {showRateChecker && (
          <div
            className="mt-2 rounded-lg border border-border bg-muted/20 p-4"
            data-ocid="jobhistory.rate_checker.panel"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw size={14} className="text-primary" />
                Check & Update Rates
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowRateChecker(false)}
                data-ocid="jobhistory.rate_checker.close_button"
              >
                <X size={13} />
              </Button>
            </div>

            {uniqueJobMaterials.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No materials linked to this job.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 font-semibold text-muted-foreground">
                          Material
                        </th>
                        <th className="text-right pb-2 font-semibold text-muted-foreground">
                          Current Rate
                        </th>
                        <th className="text-right pb-2 font-semibold text-muted-foreground pl-3">
                          New Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueJobMaterials.map((mat) => (
                        <tr key={mat.id} className="border-b border-border/40">
                          <td className="py-2 pr-3">
                            <span className="font-medium">
                              {mat.grade} · {mat.materialType}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              {mat.size}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono">
                            ₹{mat.currentRate.toFixed(2)}
                          </td>
                          <td className="py-2 pl-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newRates[mat.id] ?? ""}
                              onChange={(e) =>
                                setNewRates((prev) => ({
                                  ...prev,
                                  [mat.id]: e.target.value,
                                }))
                              }
                              className="h-7 w-24 text-xs text-right ml-auto"
                              data-ocid="jobhistory.rate_checker.input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    onClick={applyRateUpdates}
                    disabled={updateMaterialMutation.isPending}
                    className="gap-2"
                    data-ocid="jobhistory.rate_checker.submit_button"
                  >
                    {updateMaterialMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Apply Rate Updates
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="jobhistory.dialog.close_button"
          >
            Close
          </Button>
          {!showRateChecker && job.jobLineItems.length > 0 && (
            <Button
              variant="outline"
              onClick={openRateChecker}
              className="gap-2"
              data-ocid="jobhistory.rate_checker.open_modal_button"
            >
              <RefreshCw size={14} />
              Check & Update Rates
            </Button>
          )}
          <Button
            onClick={handlePrint}
            className="gap-2"
            data-ocid="jobhistory.dialog.primary_button"
          >
            <Printer size={15} />
            Print / Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JobHistory({ onEditJob }: JobHistoryProps) {
  const { data: jobs = [], isLoading } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: materials = [] } = useMaterials();
  const deleteJobMutation = useDeleteJob();

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewingJob, setViewingJob] = useState<SavedJob | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return jobs
      .filter((sj) => {
        if (search && !sj.job.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (customerFilter !== "all" && sj.job.customerId !== customerFilter)
          return false;
        const dateStr = bigIntToISO(sj.job.createdAt);
        if (dateFrom && dateStr && dateStr < dateFrom) return false;
        if (dateTo && dateStr && dateStr > dateTo) return false;
        return true;
      })
      .sort((a, b) => Number(b.job.createdAt) - Number(a.job.createdAt));
  }, [jobs, search, customerFilter, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deletingJobId) return;
    try {
      await deleteJobMutation.mutateAsync(deletingJobId);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-ocid="jobhistory.page">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Browse, search, and manage all saved jobs
        </p>
      </div>

      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Search Job Name</Label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  data-ocid="jobhistory.search_input"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger
                  className="h-8 text-sm"
                  data-ocid="jobhistory.customer.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm"
                data-ocid="jobhistory.date_from.input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm"
                data-ocid="jobhistory.date_to.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border">
        <CardContent className="pt-4 px-0">
          {isLoading ? (
            <div
              className="px-6 space-y-3"
              data-ocid="jobhistory.loading_state"
            >
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-ocid="jobhistory.empty_state"
            >
              <Briefcase size={36} className="text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {jobs.length === 0
                  ? "No saved jobs yet"
                  : "No jobs match your filters"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide pl-6">
                    Job Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Customer
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Weight (kg)
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Rate/kg
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Total Price
                  </TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sj, idx) => (
                  <TableRow
                    key={sj.job.id}
                    className="border-b border-border/60 hover:bg-muted/20"
                    data-ocid={`jobhistory.item.${idx + 1}`}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {sj.job.name}
                        </span>
                        {sj.job.transportIncluded && (
                          <Truck
                            size={12}
                            className="text-muted-foreground"
                            aria-label="Transport included"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sj.customerName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bigIntToDate(sj.job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {fmt(sj.totalProductWeight)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      ₹{fmt(sj.ratePerKg)}
                    </TableCell>
                    <TableCell className="text-sm font-mono font-bold text-primary text-right pr-4">
                      ₹{fmt(sj.totalFinalPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setViewingJob(sj)}
                          data-ocid={`jobhistory.view.button.${idx + 1}`}
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => onEditJob(sj)}
                          data-ocid={`jobhistory.edit_button.${idx + 1}`}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingJobId(sj.job.id)}
                          disabled={deleteJobMutation.isPending}
                          data-ocid={`jobhistory.delete_button.${idx + 1}`}
                        >
                          {deleteJobMutation.isPending &&
                          deletingJobId === sj.job.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {viewingJob && (
        <JobDetailDialog
          job={viewingJob}
          onClose={() => setViewingJob(null)}
          materials={materials}
        />
      )}

      <AlertDialog
        open={!!deletingJobId}
        onOpenChange={(open) => !open && setDeletingJobId(null)}
      >
        <AlertDialogContent data-ocid="jobhistory.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The job and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="jobhistory.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="jobhistory.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-dialog { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          [data-radix-dialog-overlay] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
