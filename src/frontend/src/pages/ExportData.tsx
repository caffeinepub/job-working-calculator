import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCustomers, useJobs, useMaterials } from "../hooks/useQueries";
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
      exportedAt: new Date().toISOString(),
    };
    downloadJSON(`full_backup_${dateTag()}.json`, backup);
    setLastExport(LS_KEYS.backup);
    refreshDates();
    toast.success("Full backup downloaded!");
  };

  const switchToBackup = () => {
    setTab("backup");
    setTimeout(() => backupTabRef.current?.click(), 50);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export & Backup</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download your data as CSV or JSON for offline backup or analysis.
        </p>
      </div>

      <BackupReminderBanner onTabSwitch={switchToBackup} />

      <Tabs value={tab} onValueChange={setTab} data-ocid="export.tab">
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

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
                    Download everything — materials, customers, and jobs — in
                    one JSON file.
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
                  label="Jobs"
                  count={jobs.length}
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
