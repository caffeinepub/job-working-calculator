// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calculator, Menu } from "lucide-react";
import { useState } from "react";
import type { SavedJob } from "./backend";
import type { AppPage } from "./components/Sidebar";
import { Sidebar } from "./components/Sidebar";
import { Customers } from "./pages/Customers";
import { Dashboard } from "./pages/Dashboard";
import { ExportData } from "./pages/ExportData";
import { Flexibles } from "./pages/Flexibles";
import { Formulas } from "./pages/Formulas";
import { JobCalculator } from "./pages/JobCalculator";
import { JobHistory } from "./pages/JobHistory";
import { Labour } from "./pages/Labour";
import { RawMaterials } from "./pages/RawMaterials";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "Dashboard",
  rawMaterials: "Raw Materials",
  jobCalculator: "Job Calculator",
  jobHistory: "Job History",
  customers: "Customers",
  formulas: "Formulas & Settings",
  export: "Export & Backup",
  labour: "Labour Jobs",
  flexibles: "Flexibles",
};

function AppShell() {
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  const [editingJob, setEditingJob] = useState<SavedJob | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEditJob = (savedJob: SavedJob) => {
    setEditingJob(savedJob);
    setCurrentPage("jobCalculator");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — fixed, always visible on md+ */}
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:z-30">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          />
          {/* Drawer */}
          <div className="relative z-50 flex h-full">
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60 overflow-hidden">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              data-ocid="header.open_modal_button"
            >
              <Menu size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex w-6 h-6 rounded-md bg-primary items-center justify-center shrink-0">
                <Calculator size={12} className="text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {PAGE_TITLES[currentPage]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/50 hidden sm:inline">
              JobCalc Pro
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto min-h-0 p-4 md:p-6">
          {currentPage === "dashboard" && (
            <Dashboard onNavigate={setCurrentPage} />
          )}
          {currentPage === "rawMaterials" && <RawMaterials />}
          {currentPage === "jobCalculator" && (
            <JobCalculator
              editJobOnMount={editingJob}
              onEditConsumed={() => setEditingJob(null)}
            />
          )}
          {currentPage === "jobHistory" && (
            <JobHistory onEditJob={handleEditJob} />
          )}
          {currentPage === "customers" && <Customers />}
          {currentPage === "formulas" && <Formulas />}
          {currentPage === "export" && <ExportData />}
          {currentPage === "labour" && <Labour />}
          {currentPage === "flexibles" && <Flexibles />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
