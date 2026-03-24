import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, Package } from "lucide-react";
import { useMemo } from "react";
import type { AppPage } from "../components/Sidebar";
import { useJobs, useMaterials } from "../hooks/useQueries";

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

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: materials = [] } = useMaterials();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const stats = useMemo(() => {
    const jobsThisMonth = jobs.filter((sj) => {
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
      .slice(0, 3)
      .map(([id, count]) => {
        const mat = materials.find((m) => m.id === id);
        return {
          id,
          name: mat ? `${mat.grade} · ${mat.materialType} · ${mat.size}` : id,
          count,
        };
      });

    const recentJobs = [...jobs]
      .sort((a, b) => Number(b.job.createdAt) - Number(a.job.createdAt))
      .slice(0, 5);

    return {
      jobsThisMonthCount: jobsThisMonth.length,
      totalJobs: jobs.length,
      topMaterials,
      recentJobs,
    };
  }, [jobs, materials, thisMonth, thisYear]);

  const statCards = [
    {
      key: "jobs-month",
      title: "Jobs This Month",
      value: stats.jobsThisMonthCount.toString(),
      icon: <Briefcase size={20} className="text-primary" />,
      sub: "completed jobs",
    },
    {
      key: "jobs-total",
      title: "Total Jobs",
      value: stats.totalJobs.toString(),
      icon: <Package size={20} className="text-violet-600" />,
      sub: "all time",
    },
  ];

  return (
    <div className="flex flex-col gap-6" data-ocid="dashboard.page">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Overview of your job working business
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((card) => (
          <Card key={card.key} className="shadow-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">
                    {jobsLoading ? "—" : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.sub}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted">{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                Recent Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {stats.recentJobs.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 text-center"
                  data-ocid="dashboard.jobs.empty_state"
                >
                  <Briefcase
                    size={32}
                    className="text-muted-foreground/30 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">No jobs yet</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("jobCalculator")}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Create your first job
                  </button>
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
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right pr-6">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentJobs.map((sj, idx) => (
                      <TableRow
                        key={sj.job.id}
                        className="border-b border-border/60"
                        data-ocid={`dashboard.jobs.item.${idx + 1}`}
                      >
                        <TableCell className="pl-6 font-medium text-sm">
                          {sj.job.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sj.customerName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {bigIntToDate(sj.job.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono font-bold text-primary text-right pr-6">
                          ₹{fmt(sj.totalFinalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-card border-border">
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
