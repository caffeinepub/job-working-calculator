import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calculator,
  LayersIcon,
  Package,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import type { AppPage } from "../components/Sidebar";
import {
  useFlexibleJobs,
  useJobs,
  useLabourJobs,
  useMaterials,
} from "../hooks/useQueries";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function bigIntToDate(ts: bigint): Date {
  return new Date(Number(ts) / 1_000_000);
}

interface DashboardProps {
  onNavigate: (page: AppPage) => void;
}

type ActivityModule = "SS Fab" | "Flexible" | "Labour";

interface ActivityItem {
  module: ActivityModule;
  description: string;
  date: Date;
  cost: number;
  id: string;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: flexibleJobs = [], isLoading: flexLoading } = useFlexibleJobs();
  const { data: labourJobs = [], isLoading: labourLoading } = useLabourJobs();
  const { data: materials = [] } = useMaterials();

  const isLoading = jobsLoading || flexLoading || labourLoading;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const stats = useMemo(() => {
    const ssJobsThisMonth = jobs.filter((sj) => {
      const d = bigIntToDate(sj.job.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const matUsage: Record<string, number> = {};
    for (const sj of jobs) {
      for (const item of sj.jobLineItems) {
        matUsage[item.materialId] = (matUsage[item.materialId] ?? 0) + 1;
      }
    }
    const topMaterials = Object.entries(matUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const mat = materials.find((m) => m.id === id);
        return {
          id,
          name: mat ? `${mat.grade} · ${mat.materialType} · ${mat.size}` : id,
          count,
        };
      });

    // Combine recent activity from all modules
    const ssActivity: ActivityItem[] = jobs.map((sj) => ({
      module: "SS Fab" as ActivityModule,
      description: sj.job.name,
      date: bigIntToDate(sj.job.createdAt),
      cost: sj.totalFinalPrice,
      id: sj.job.id,
    }));

    const flexActivity: ActivityItem[] = flexibleJobs.map((fj) => ({
      module: "Flexible" as ActivityModule,
      description: fj.description,
      date: bigIntToDate(fj.createdAt),
      cost: fj.totalCost,
      id: fj.id,
    }));

    const labourActivity: ActivityItem[] = labourJobs.map((lj) => ({
      module: "Labour" as ActivityModule,
      description: lj.description,
      date: bigIntToDate(lj.createdAt),
      cost: lj.totalCost,
      id: lj.id,
    }));

    const recentActivity = [...ssActivity, ...flexActivity, ...labourActivity]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return {
      ssJobsThisMonthCount: ssJobsThisMonth.length,
      totalSSJobs: jobs.length,
      totalFlexibles: flexibleJobs.length,
      totalLabour: labourJobs.length,
      topMaterials,
      recentActivity,
    };
  }, [jobs, flexibleJobs, labourJobs, materials, thisMonth, thisYear]);

  const statCards = [
    {
      key: "ss-month",
      title: "SS Jobs This Month",
      value: stats.ssJobsThisMonthCount.toString(),
      icon: <Briefcase size={20} className="text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      sub: "fabrication jobs",
    },
    {
      key: "ss-total",
      title: "Total SS Jobs",
      value: stats.totalSSJobs.toString(),
      icon: <TrendingUp size={20} className="text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-950",
      sub: "all time",
    },
    {
      key: "flex-total",
      title: "Total Flexibles",
      value: stats.totalFlexibles.toString(),
      icon: <LayersIcon size={20} className="text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      sub: "AL + CU combined",
    },
    {
      key: "labour-total",
      title: "Labour Jobs",
      value: stats.totalLabour.toString(),
      icon: <Wrench size={20} className="text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
      sub: "saved labour jobs",
    },
  ];

  const moduleBadgeStyles: Record<ActivityModule, string> = {
    "SS Fab": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    Flexible:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    Labour:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  };

  return (
    <div className="flex flex-col gap-6" data-ocid="dashboard.page">
      <div>
        <h1 className="text-2xl font-bold text-foreground border-l-4 border-blue-500 pl-3">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Overview of your job working business
        </p>
      </div>

      {/* Stat cards — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <Card
            key={card.key}
            className="shadow-card border-border border-t-2 border-t-blue-200"
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium leading-tight">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">
                    {isLoading ? "—" : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.sub}
                  </p>
                </div>
                <div className={`p-2 rounded-lg shrink-0 ${card.iconBg}`}>
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("ssFabrication")}
          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
          data-ocid="dashboard.ss_fab.button"
        >
          <Briefcase size={14} />
          SS Fabrication
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("labour")}
          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
          data-ocid="dashboard.labour.button"
        >
          <Wrench size={14} />
          Labour
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("flexibles")}
          className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950"
          data-ocid="dashboard.flexibles.button"
        >
          <LayersIcon size={14} />
          Flexibles
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <Card className="shadow-card border-border border-t-2 border-t-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator size={16} className="text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2 overflow-x-auto">
              {stats.recentActivity.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 text-center"
                  data-ocid="dashboard.activity.empty_state"
                >
                  <Briefcase
                    size={32}
                    className="text-muted-foreground/30 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">No jobs yet</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("ssFabrication")}
                    className="text-xs text-primary hover:underline mt-1"
                    data-ocid="dashboard.create_job.button"
                  >
                    Create your first job
                  </button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide pl-6">
                        Module
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Description
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right pr-6">
                        Cost
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentActivity.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className="border-b border-border/60"
                        data-ocid={`dashboard.activity.item.${idx + 1}`}
                      >
                        <TableCell className="pl-6">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              moduleBadgeStyles[item.module]
                            }`}
                          >
                            {item.module}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[160px] truncate">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {item.date.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm font-mono font-bold text-primary text-right pr-6 whitespace-nowrap">
                          ₹{fmt(item.cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Materials */}
        <div>
          <Card className="shadow-card border-border border-t-2 border-t-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Top Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topMaterials.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-8 text-center"
                  data-ocid="dashboard.materials.empty_state"
                >
                  <Package
                    size={28}
                    className="text-muted-foreground/30 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.topMaterials.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.count} job{m.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
