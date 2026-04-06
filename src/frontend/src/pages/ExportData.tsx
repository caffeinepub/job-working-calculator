import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Package,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAlWeldingJobs,
  useClearAlWeldingJobs,
  useClearCustomers,
  useClearFlexibleJobs,
  useClearJobs,
  useClearLabourJobs,
  useClearMaterials,
  useCustomers,
  useFlexibleJobs,
  useJobs,
  useLabourJobs,
  useMaterials,
} from "../hooks/useQueries";
import {
  addCustomer,
  addMaterial,
  saveAlWeldingJob,
  saveFlexibleJob,
  saveJob,
  saveLabourJob,
  updateCustomer,
  updateMaterial,
} from "../icpDB";
import { downloadCSV, downloadJSON } from "../utils/exportUtils";

const LS_KEYS = {
  materials: "lastExportDate_materials",
  customers: "lastExportDate_customers",
  jobs: "lastExportDate_jobs",
  backup: "lastExportDate_backup",
};

function getLastExport(key: string): string | null {
  return localStorage.getItem(key);
}

function setLastExport(key: string) {
  localStorage.setItem(key, new Date().toISOString());
}

function formatLastExport(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function BackupReminderBanner({ onTabSwitch }: { onTabSwitch: () => void }) {
  const last = getLastExport(LS_KEYS.backup);
  const days = daysSince(last);

  if (last !== null && days !== null && days < 7) return null;

  const message =
    last === null
      ? "You have never taken a full backup. Download one to keep your data safe."
      : `Your last backup was ${days} day${days === 1 ? "" : "s"} ago. Download a full backup to keep your data safe.`;

  return (
    <Alert className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 mb-6">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-amber-800 dark:text-amber-300 text-sm">
          {message}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
          onClick={onTabSwitch}
          data-ocid="export.backup_reminder.button"
        >
          Backup Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ExportData() {
  const { data: materials = [] } = useMaterials();
  const { data: customers = [] } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: labourJobs = [] } = useLabourJobs();
  const { data: flexibleJobs = [] } = useFlexibleJobs();
  const { data: alWeldingJobs = [] } = useAlWeldingJobs();

  const [tab, setTab] = useState("materials");
  const [lastExportDates, setLastExportDates] = useState({
    materials: getLastExport(LS_KEYS.materials),
    customers: getLastExport(LS_KEYS.customers),
    jobs: getLastExport(LS_KEYS.jobs),
    backup: getLastExport(LS_KEYS.backup),
  });

  const backupTabRef = useRef<HTMLButtonElement>(null);

  const refreshDates = () => {
    setLastExportDates({
      materials: getLastExport(LS_KEYS.materials),
      customers: getLastExport(LS_KEYS.customers),
      jobs: getLastExport(LS_KEYS.jobs),
      backup: getLastExport(LS_KEYS.backup),
    });
  };

  const handleExportMaterials = () => {
    const rows = materials.map((m) => ({
      Grade: m.grade,
      Type: m.materialType,
      Size: m.size,
      "Weight/m (kg/m)": m.weightPerMeter.toFixed(3),
      "Rate (₹/kg)": m.currentRate.toFixed(2),
    }));
    downloadCSV(`materials_${dateTag()}.csv`, rows);
    setLastExport(LS_KEYS.materials);
    refreshDates();
    toast.success("Materials exported as CSV");
  };

  const handleExportCustomers = () => {
    const rows = customers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email,
      Address: c.address,
    }));
    downloadCSV(`customers_${dateTag()}.csv`, rows);
    setLastExport(LS_KEYS.customers);
    refreshDates();
    toast.success("Customers exported as CSV");
  };

  const handleExportJobs = () => {
    downloadJSON(`jobs_${dateTag()}.json`, jobs);
    setLastExport(LS_KEYS.jobs);
    refreshDates();
    toast.success("Jobs exported as JSON");
  };

  const handleFullBackup = () => {
    const backup = {
      materials,
      customers,
      jobs,
      labourJobs,
      flexibleJobs,
      alWeldingJobs,
      exportedAt: new Date().toISOString(),
    };
    // Use a BigInt-safe replacer so the JSON doesn't throw on bigint fields
    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          (_key, val) => (typeof val === "bigint" ? Number(val) : val),
          2,
        ),
      ],
      { type: "application/json;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `full_backup_${dateTag()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLastExport(LS_KEYS.backup);
    refreshDates();
    toast.success("Full backup downloaded!");
  };

  const switchToBackup = () => {
    setTab("backup");
    setTimeout(() => backupTabRef.current?.click(), 50);
  };

  const totalItems =
    materials.length +
    customers.length +
    jobs.length +
    labourJobs.length +
    flexibleJobs.length +
    alWeldingJobs.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground border-l-4 border-teal-500 pl-3">
          Export & Backup
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download your data as CSV or JSON for offline backup or analysis.
        </p>
      </div>

      <BackupReminderBanner onTabSwitch={switchToBackup} />

      <Tabs value={tab} onValueChange={setTab} data-ocid="export.tab">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full min-w-max grid-cols-6">
            <TabsTrigger value="materials" data-ocid="export.materials.tab">
              Materials
            </TabsTrigger>
            <TabsTrigger value="customers" data-ocid="export.customers.tab">
              Customers
            </TabsTrigger>
            <TabsTrigger value="jobs" data-ocid="export.jobs.tab">
              Jobs
            </TabsTrigger>
            <TabsTrigger
              ref={backupTabRef}
              value="backup"
              data-ocid="export.backup.tab"
            >
              Full Backup
            </TabsTrigger>
            <TabsTrigger value="restore" data-ocid="export.restore.tab">
              Restore
            </TabsTrigger>
            <TabsTrigger value="erase" data-ocid="export.erase.tab">
              Erase Data
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Materials */}
        <TabsContent value="materials" className="mt-6">
          <ExportCard
            title="Raw Materials"
            description="Export your raw materials table as a CSV spreadsheet."
            icon={<Package size={20} className="text-blue-600" />}
            count={materials.length}
            countLabel="materials"
            lastExport={formatLastExport(lastExportDates.materials)}
            format="CSV"
            onExport={handleExportMaterials}
            columns={[
              "Grade",
              "Type",
              "Size",
              "Weight/m (kg/m)",
              "Rate (₹/kg)",
            ]}
            ocid="export.materials"
          />
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers" className="mt-6">
          <ExportCard
            title="Customers"
            description="Export your customer list as a CSV spreadsheet."
            icon={<Users size={20} className="text-violet-600" />}
            count={customers.length}
            countLabel="customers"
            lastExport={formatLastExport(lastExportDates.customers)}
            format="CSV"
            onExport={handleExportCustomers}
            columns={["Name", "Phone", "Email", "Address"]}
            ocid="export.customers"
          />
        </TabsContent>

        {/* Jobs */}
        <TabsContent value="jobs" className="mt-6">
          <ExportCard
            title="Job History"
            description="Export all saved jobs as a JSON file. Includes full cost breakdowns and line items."
            icon={<FileJson size={20} className="text-emerald-600" />}
            count={jobs.length}
            countLabel="jobs"
            lastExport={formatLastExport(lastExportDates.jobs)}
            format="JSON"
            onExport={handleExportJobs}
            columns={[
              "id",
              "name",
              "laborRate",
              "jobLineItems",
              "weldingLineItems",
              "totalFinalPrice",
              "...",
            ]}
            ocid="export.jobs"
          />
        </TabsContent>

        {/* Full Backup */}
        <TabsContent value="backup" className="mt-6">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Full Backup</CardTitle>
                  <CardDescription>
                    Download everything — materials, customers, jobs, labour
                    jobs, flexible jobs — in one JSON file.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <StatBox
                  label="Materials"
                  count={materials.length}
                  color="bg-blue-50 text-blue-700"
                />
                <StatBox
                  label="Customers"
                  count={customers.length}
                  color="bg-violet-50 text-violet-700"
                />
                <StatBox
                  label="Total Items"
                  count={totalItems}
                  color="bg-emerald-50 text-emerald-700"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-sm text-muted-foreground">
                  Last backup:
                  <span className="ml-1 font-medium text-foreground">
                    {formatLastExport(lastExportDates.backup)}
                  </span>
                </div>
                <CheckIcon last={lastExportDates.backup} />
              </div>

              <Button
                size="lg"
                className="gap-2 w-full"
                onClick={handleFullBackup}
                data-ocid="export.backup.primary_button"
              >
                <Download size={16} />
                Download Full Backup (JSON)
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Tip: Download a backup regularly, especially before any major
                changes or deployments.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore */}
        <TabsContent value="restore" className="mt-6">
          <RestoreTab
            materials={materials}
            customers={customers}
            jobs={jobs}
            labourJobs={labourJobs}
            flexibleJobs={flexibleJobs}
            alWeldingJobs={alWeldingJobs}
          />
        </TabsContent>

        {/* Erase Data */}
        <TabsContent value="erase" className="mt-6">
          <EraseDataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function dateTag() {
  return new Date().toISOString().slice(0, 10);
}

function CheckIcon({ last }: { last: string | null }) {
  const days = daysSince(last);
  if (last === null || days === null || days >= 7) {
    return (
      <Badge
        variant="outline"
        className="text-amber-700 border-amber-400 bg-amber-50"
      >
        Overdue
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-emerald-700 border-emerald-400 bg-emerald-50"
    >
      <CheckCircle2 size={12} className="mr-1" /> Up to date
    </Badge>
  );
}

function StatBox({
  label,
  count,
  color,
}: { label: string; count: number; color: string }) {
  return (
    <div
      className={`rounded-lg p-3 text-center ${color.split(" ")[0]} border border-border`}
    >
      <div className={`text-2xl font-bold ${color.split(" ")[1]}`}>{count}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  countLabel: string;
  lastExport: string;
  format: "CSV" | "JSON";
  onExport: () => void;
  columns: string[];
  ocid: string;
}

function ExportCard({
  title,
  description,
  icon,
  count,
  countLabel,
  lastExport,
  format,
  onExport,
  columns,
  ocid,
}: ExportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {count} {countLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg bg-muted/40 p-3 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Columns included:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Last exported:{" "}
            <span className="font-medium text-foreground">{lastExport}</span>
          </span>
          <Badge variant="outline" className="gap-1 text-xs">
            {format === "CSV" ? (
              <FileSpreadsheet size={11} />
            ) : (
              <FileJson size={11} />
            )}
            {format}
          </Badge>
        </div>

        <Button
          className="gap-2"
          onClick={onExport}
          data-ocid={`${ocid}.primary_button`}
        >
          <Download size={15} />
          Download {format}
        </Button>
      </CardContent>
    </Card>
  );
}

interface RestoreTabProps {
  materials: any[];
  customers: any[];
  jobs: any[];
  labourJobs: any[];
  flexibleJobs: any[];
  alWeldingJobs: any[];
}

function RestoreTab({
  materials: existingMaterials,
  customers: existingCustomers,
  jobs: existingJobs,
  labourJobs: existingLabourJobs,
  flexibleJobs: existingFlexibleJobs,
  alWeldingJobs: existingAlWeldingJobs,
}: RestoreTabProps) {
  const [parsed, setParsed] = useState<{
    materials: any[];
    customers: any[];
    jobs: any[];
    labourJobs?: any[];
    flexibleJobs?: any[];
    alWeldingJobs?: any[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      setParsed(null);
      setParseError(null);
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          if (
            !Array.isArray(json.materials) ||
            !Array.isArray(json.customers) ||
            !Array.isArray(json.jobs)
          ) {
            setParseError(
              "Invalid backup file: must contain materials, customers, and jobs arrays.",
            );
            return;
          }
          setParsed({
            materials: json.materials ?? [],
            customers: json.customers ?? [],
            jobs: json.jobs ?? [],
            labourJobs: json.labourJobs ?? [],
            flexibleJobs: json.flexibleJobs ?? [],
            alWeldingJobs: json.alWeldingJobs ?? [],
          });
        } catch {
          setParseError(
            "Could not parse file. Make sure it is a valid JSON backup.",
          );
        }
      };
      reader.readAsText(f);
    },
    [],
  );

  const handleRestore = async () => {
    if (!parsed) return;
    setShowConfirm(false);
    setRestoring(true);

    try {
      let count = 0;
      const total =
        parsed.materials.length +
        parsed.customers.length +
        parsed.jobs.length +
        (parsed.labourJobs?.length ?? 0) +
        (parsed.flexibleJobs?.length ?? 0) +
        (parsed.alWeldingJobs?.length ?? 0);

      // Materials — overwrite if same grade+type+size exists
      setProgress(`Restoring materials (0/${parsed.materials.length})...`);
      for (const m of parsed.materials) {
        const existing = existingMaterials.find(
          (em) =>
            em.grade === (m.grade ?? "") &&
            em.materialType === (m.materialType ?? "") &&
            em.size === (m.size ?? ""),
        );
        if (existing) {
          await updateMaterial(
            existing.id,
            m.grade ?? "",
            m.materialType ?? "",
            m.size ?? "",
            Number(m.weightPerMeter ?? 0),
            Number(m.currentRate ?? 0),
          );
        } else {
          await addMaterial(
            m.grade ?? "",
            m.materialType ?? "",
            m.size ?? "",
            Number(m.weightPerMeter ?? 0),
            Number(m.currentRate ?? 0),
          );
        }
        count++;
        setProgress(`Restoring materials (${count}/${total})...`);
      }

      // Customers — overwrite if same name exists
      for (const c of parsed.customers) {
        const existing = existingCustomers.find(
          (ec) => ec.name === (c.name ?? ""),
        );
        if (existing) {
          await updateCustomer(
            existing.id,
            c.name ?? "",
            c.phone ?? "",
            c.email ?? "",
            c.address ?? "",
          );
        } else {
          await addCustomer(
            c.name ?? "",
            c.phone ?? "",
            c.email ?? "",
            c.address ?? "",
          );
        }
        count++;
        setProgress(`Restoring customers (${count}/${total})...`);
      }

      // SS Fabrication Jobs — overwrite if same name exists
      for (const j of parsed.jobs) {
        const jobName = j.name ?? j.job?.name ?? "";
        const existing = existingJobs.find(
          (ej) => (ej.job?.name ?? ej.name ?? "") === jobName,
        );
        const jobData = j.job ?? j;
        if (existing) {
          // skip update for jobs (complex nested structure, safer to skip)
          count++;
          setProgress(`Restoring jobs (${count}/${total})...`);
          continue;
        }
        await saveJob(
          jobData.name ?? "",
          Number(jobData.laborRate ?? 0),
          Boolean(jobData.transportIncluded ?? false),
          jobData.customerId ?? null,
          Number(jobData.transportCost ?? 0),
          Number(jobData.dispatchQty ?? 1),
          (jobData.jobLineItems ?? []).map((li: any) => ({
            materialId: li.materialId ?? "",
            lengthMeters: Number(li.lengthMeters ?? 0),
            rawWeight: Number(li.rawWeight ?? 0),
            totalWeight: Number(li.totalWeight ?? 0),
            finalPrice: Number(li.finalPrice ?? 0),
          })),
          (jobData.weldingLineItems ?? []).map((wi: any) => ({
            grade: wi.grade ?? "",
            ratePerKg: Number(wi.ratePerKg ?? 0),
            weightKg: Number(wi.weightKg ?? 0),
            finalPrice: Number(wi.finalPrice ?? 0),
          })),
          (jobData.machinedLineItems ?? []).map((mi: any) => ({
            opType: mi.opType ?? "other",
            drillDia: Number(mi.drillDia ?? 0),
            matThickness: Number(mi.matThickness ?? 0),
            grade: mi.grade ?? "SS304",
            numberOfDrills: Number(mi.numberOfDrills ?? 0),
            costPerDrill: Number(mi.costPerDrill ?? 0),
            weightRemoved: Number(mi.weightRemoved ?? 0),
            description: mi.description ?? "",
            qty: Number(mi.qty ?? 0),
            costPerUnit: Number(mi.costPerUnit ?? 0),
            totalCost: Number(mi.totalCost ?? 0),
          })),
          Number(jobData.totalFinalPrice ?? 0),
          Number(jobData.totalProductWeight ?? 0),
          Number(jobData.ratePerKg ?? 0),
        );
        count++;
        setProgress(`Restoring jobs (${count}/${total})...`);
      }

      // Labour Jobs — skip if same description exists
      for (const lj of parsed.labourJobs ?? []) {
        const existing = existingLabourJobs.find(
          (elj: any) => (elj.description ?? "") === (lj.description ?? ""),
        );
        if (!existing) {
          await saveLabourJob(
            lj.description ?? "",
            lj.materialType ?? "",
            Number(lj.weldLength ?? 0),
            Number(lj.laborRate ?? 0),
            Number(lj.totalCost ?? 0),
          );
        }
        count++;
        setProgress(`Restoring labour jobs (${count}/${total})...`);
      }

      // Flexible Jobs — skip if same description exists
      for (const fj of parsed.flexibleJobs ?? []) {
        const existing = existingFlexibleJobs.find(
          (efj: any) => (efj.description ?? "") === (fj.description ?? ""),
        );
        if (!existing) {
          await saveFlexibleJob(
            fj.description ?? "",
            fj.materialTab ?? "AL",
            Number(fj.centerLength ?? 0),
            Number(fj.sheetBunchWidth ?? 0),
            Number(fj.sheetThickness ?? 0.3),
            BigInt(Math.round(Number(fj.sheetCount ?? 0))),
            Boolean(fj.barsSupplied ?? false),
            Number(fj.barLength ?? 0),
            Number(fj.barWidth ?? 0),
            Number(fj.barThickness ?? 0),
            BigInt(Math.round(Number(fj.numberOfDrills ?? 0))),
            BigInt(Math.round(Number(fj.numberOfFolds ?? 1))),
            Number(fj.sheetStackWeight ?? 0),
            Number(fj.stripWeight ?? 0),
            Number(fj.bar1Weight ?? 0),
            Number(fj.bar2Weight ?? 0),
            Number(fj.totalMaterialWeight ?? 0),
            Number(fj.materialCost ?? 0),
            Number(fj.cuttingCost ?? 0),
            Number(fj.foldingCost ?? 0),
            Number(fj.drillingCost ?? 0),
            Number(fj.weldingCost ?? 0),
            Number(fj.chamferingCost ?? 0),
            Number(fj.totalWeldLength ?? 0),
            Number(fj.overheadCost ?? 0),
            Number(fj.profitCost ?? 0),
            Number(fj.totalCost ?? 0),
            Number(fj.discountPct ?? 0),
            Number(fj.quotedPrice ?? 0),
          );
        }
        count++;
        setProgress(`Restoring flexible jobs (${count}/${total})...`);
      }

      // AL Welding Jobs — skip if same description exists
      for (const aw of parsed.alWeldingJobs ?? []) {
        const existing = existingAlWeldingJobs.find(
          (eaw: any) => (eaw.description ?? "") === (aw.description ?? ""),
        );
        if (!existing) {
          await saveAlWeldingJob(
            aw.description ?? "",
            BigInt(Math.round(Number(aw.numJoints ?? 0))),
            BigInt(Math.round(Number(aw.numBrackets ?? 0))),
            BigInt(Math.round(Number(aw.numDummy ?? 0))),
            Number(aw.weldLengthEachMm ?? 0),
            Number(aw.thickness ?? 0),
            Number(aw.laborCostPer2mm ?? 0),
            Number(aw.totalFullLength ?? 0),
            BigInt(Math.round(Number(aw.totalWeldLines ?? 0))),
            Number(aw.adjustedLaborCost ?? 0),
            Number(aw.totalCost ?? 0),
            Number(aw.costPerFullLength ?? 0),
          );
        }
        count++;
        setProgress(`Restoring AL welding jobs (${count}/${total})...`);
      }

      toast.success(`Backup restored successfully. ${total} items processed.`);
      setProgress(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setProgress(null);
      setRestoring(false);
      toast.error(`Restore failed: ${err?.message ?? String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-amber-400/60 border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                Restore from Backup
              </CardTitle>
              <CardDescription>
                Restoring will <strong>overwrite</strong> existing records with
                matching names and <strong>add</strong> new records from the
                backup file.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              Materials and customers with the same name will be overwritten.
              Jobs, labour jobs, flexible jobs, and AL welding jobs with
              matching descriptions will be skipped to avoid duplicates.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="restore-file-input"
              className="text-sm font-medium text-foreground"
            >
              Select backup file (.json)
            </label>
            <input
              id="restore-file-input"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              data-ocid="export.restore.dropzone"
            />
            {parseError && (
              <p
                className="text-sm text-destructive"
                data-ocid="export.restore.error_state"
              >
                {parseError}
              </p>
            )}
          </div>

          {parsed && (
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                label="Materials"
                count={parsed.materials.length}
                color="bg-blue-50 text-blue-700"
              />
              <StatBox
                label="Customers"
                count={parsed.customers.length}
                color="bg-violet-50 text-violet-700"
              />
              <StatBox
                label="Jobs"
                count={
                  parsed.jobs.length +
                  (parsed.labourJobs?.length ?? 0) +
                  (parsed.flexibleJobs?.length ?? 0) +
                  (parsed.alWeldingJobs?.length ?? 0)
                }
                color="bg-emerald-50 text-emerald-700"
              />
            </div>
          )}

          {progress && (
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              data-ocid="export.restore.loading_state"
            >
              <Loader2 size={14} className="animate-spin" />
              {progress}
            </div>
          )}

          <Button
            disabled={!parsed || restoring}
            onClick={() => setShowConfirm(true)}
            className="gap-2 w-full"
            data-ocid="export.restore.primary_button"
          >
            {restoring ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UploadCloud size={16} />
            )}
            {restoring ? "Restoring to ICP..." : "Restore Backup"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent data-ocid="export.restore.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will process {parsed?.materials.length ?? 0} materials,{" "}
              {parsed?.customers.length ?? 0} customers, and{" "}
              {(parsed?.jobs.length ?? 0) +
                (parsed?.labourJobs?.length ?? 0) +
                (parsed?.flexibleJobs?.length ?? 0) +
                (parsed?.alWeldingJobs?.length ?? 0)}{" "}
              jobs from the backup file. Existing records with matching names
              will be overwritten; new records will be added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="export.restore.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              data-ocid="export.restore.confirm_button"
            >
              Yes, Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type EraseCategory =
  | "materials"
  | "jobs"
  | "flexibleJobs"
  | "labourJobs"
  | "customers"
  | "alWeldingJobs";

const ERASE_CATEGORIES: { key: EraseCategory; label: string; color: string }[] =
  [
    {
      key: "materials",
      label: "Raw Materials",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      key: "jobs",
      label: "SS Fabrication Jobs",
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      key: "flexibleJobs",
      label: "Flexible Jobs",
      color: "text-violet-700 bg-violet-50 border-violet-200",
    },
    {
      key: "labourJobs",
      label: "Labour Jobs",
      color: "text-green-700 bg-green-50 border-green-200",
    },
    {
      key: "customers",
      label: "Customers",
      color: "text-pink-700 bg-pink-50 border-pink-200",
    },
    {
      key: "alWeldingJobs",
      label: "AL Welding Jobs",
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
  ];

function EraseDataTab() {
  const { data: materials = [] } = useMaterials();
  const { data: customers = [] } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: labourJobs = [] } = useLabourJobs();
  const { data: flexibleJobs = [] } = useFlexibleJobs();
  const { data: alWeldingJobs = [] } = useAlWeldingJobs();

  const clearMaterialsMut = useClearMaterials();
  const clearCustomersMut = useClearCustomers();
  const clearJobsMut = useClearJobs();
  const clearLabourJobsMut = useClearLabourJobs();
  const clearFlexibleJobsMut = useClearFlexibleJobs();
  const clearAlWeldingJobsMut = useClearAlWeldingJobs();

  const counts: Record<EraseCategory, number> = {
    materials: materials.length,
    customers: customers.length,
    jobs: jobs.length,
    labourJobs: labourJobs.length,
    flexibleJobs: flexibleJobs.length,
    alWeldingJobs: alWeldingJobs.length,
  };

  const [selected, setSelected] = useState<Set<EraseCategory>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [erasing, setErasing] = useState(false);

  const allSelected = ERASE_CATEGORIES.every((c) => selected.has(c.key));
  const someSelected = selected.size > 0 && !allSelected;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ERASE_CATEGORIES.map((c) => c.key)));
    }
  };

  const handleToggle = (key: EraseCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleErase = async () => {
    setShowConfirm(false);
    setErasing(true);
    try {
      const ops: Promise<any>[] = [];
      if (selected.has("materials")) ops.push(clearMaterialsMut.mutateAsync());
      if (selected.has("customers")) ops.push(clearCustomersMut.mutateAsync());
      if (selected.has("jobs")) ops.push(clearJobsMut.mutateAsync());
      if (selected.has("labourJobs"))
        ops.push(clearLabourJobsMut.mutateAsync());
      if (selected.has("flexibleJobs"))
        ops.push(clearFlexibleJobsMut.mutateAsync());
      if (selected.has("alWeldingJobs"))
        ops.push(clearAlWeldingJobsMut.mutateAsync());
      await Promise.all(ops);
      toast.success(
        `Erased: ${Array.from(selected)
          .map((k) => ERASE_CATEGORIES.find((c) => c.key === k)?.label)
          .filter(Boolean)
          .join(", ")}`,
      );
      setSelected(new Set());
    } catch (err: any) {
      toast.error(`Erase failed: ${err?.message ?? String(err)}`);
    } finally {
      setErasing(false);
    }
  };

  const selectedLabels = Array.from(selected)
    .map((k) => ERASE_CATEGORIES.find((c) => c.key === k)?.label)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-destructive/30 border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">
                Erase Data
              </CardTitle>
              <CardDescription>
                Permanently delete selected categories of data from ICP. This
                cannot be undone — download a full backup first.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive text-sm">
              ⚠️ Erased data cannot be recovered. Download a full backup before
              proceeding.
            </AlertDescription>
          </Alert>

          {/* Select All row */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="erase-select-all"
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={handleToggleAll}
              data-ocid="export.erase.checkbox"
            />
            <label
              htmlFor="erase-select-all"
              className="text-sm font-semibold cursor-pointer select-none"
            >
              Select All Categories
            </label>
          </div>

          {/* Category rows */}
          <div className="flex flex-col gap-2">
            {ERASE_CATEGORIES.map((cat) => (
              <label
                key={cat.key}
                htmlFor={`erase-${cat.key}`}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selected.has(cat.key)
                    ? `${cat.color} border-current/40`
                    : "border-border bg-muted/10 hover:bg-muted/30"
                }`}
                data-ocid={`export.erase.${cat.key}.toggle`}
              >
                <Checkbox
                  id={`erase-${cat.key}`}
                  checked={selected.has(cat.key)}
                  onCheckedChange={() => handleToggle(cat.key)}
                />
                <span className="flex-1 text-sm font-medium select-none">
                  {cat.label}
                </span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {counts[cat.key]} item{counts[cat.key] === 1 ? "" : "s"}
                </Badge>
              </label>
            ))}
          </div>

          <Button
            variant="destructive"
            disabled={selected.size === 0 || erasing}
            onClick={() => setShowConfirm(true)}
            className="gap-2 w-full"
            data-ocid="export.erase.delete_button"
          >
            {erasing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {erasing
              ? "Erasing…"
              : selected.size === 0
                ? "Select categories to erase"
                : `Erase ${selected.size} categor${selected.size === 1 ? "y" : "ies"}`}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent data-ocid="export.erase.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently erase data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following categories will be permanently deleted from ICP and
              cannot be recovered:
              <ul className="mt-2 list-disc list-inside space-y-1">
                {selectedLabels.map((label) => (
                  <li key={label} className="font-medium">
                    {label}
                  </li>
                ))}
              </ul>
              Make sure you have a backup before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="export.erase.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleErase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="export.erase.confirm_button"
            >
              Yes, Erase Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
