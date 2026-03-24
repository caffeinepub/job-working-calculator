// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calculator, Menu } from "lucide-react";
import { useState } from "react";
import type { SavedJob } from "./backend";
import type { AppPage } from "./components/Sidebar";
import { Sidebar } from "./components/Sidebar";
// import { useInternetIdentity } from "./hooks/useInternetIdentity"; // Auth bypassed temporarily
import { Customers } from "./pages/Customers";
import { Dashboard } from "./pages/Dashboard";
import { ExportData } from "./pages/ExportData";
import { Formulas } from "./pages/Formulas";
import { JobCalculator } from "./pages/JobCalculator";
import { JobHistory } from "./pages/JobHistory";
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
};

/*
 * LOGIN SCREEN — commented out until auth issues are resolved.
 *
function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-card">
            <Calculator size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">JobCalc Pro</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to access your job calculator
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            This app is password-protected. Only authorized team members can
            access job data.
          </p>
          <Button
            className="w-full gap-2"
            onClick={() => login()}
            disabled={isLoggingIn}
            data-ocid="login.primary_button"
          >
            {isLoggingIn ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoggingIn ? "Signing in\u2026" : "Sign In"}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
*/

function AppShell() {
  // Auth check bypassed temporarily — uncomment when login is fixed
  // const { isLoginSuccess, isInitializing, identity, clear } = useInternetIdentity();
  //
  // if (isInitializing) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  //     </div>
  //   );
  // }
  //
  // if (!isLoginSuccess) {
  //   return <LoginScreen />;
  // }

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

      {/* Main area — min-w-0 prevents flex child from overflowing parent */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60 overflow-hidden">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
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
            {/* Page title */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex w-6 h-6 rounded-md bg-primary items-center justify-center shrink-0">
                <Calculator size={12} className="text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {PAGE_TITLES[currentPage]}
              </span>
            </div>
          </div>

          {/* Right side — auth commented out */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/50 hidden sm:inline">
              JobCalc Pro
            </span>
          </div>
        </header>

        {/* Page content — overflow-auto handles both axes; tables scroll horizontally inside */}
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
