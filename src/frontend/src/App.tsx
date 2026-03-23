import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calculator, ChevronDown, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import type { SavedJob } from "./backend";
import type { AppPage } from "./components/Sidebar";
import { Sidebar } from "./components/Sidebar";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { Customers } from "./pages/Customers";
import { Dashboard } from "./pages/Dashboard";
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
};

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
            {isLoggingIn ? "Signing in…" : "Sign In"}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}{" "}
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

function AppShell() {
  const { isLoginSuccess, isInitializing, identity, clear } =
    useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  const [editingJob, setEditingJob] = useState<SavedJob | null>(null);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoginSuccess) {
    return <LoginScreen />;
  }

  const principalStr = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principalStr ? `${principalStr.slice(0, 5)}…` : "User";

  const handleEditJob = (savedJob: SavedJob) => {
    setEditingJob(savedJob);
    setCurrentPage("jobCalculator");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main area */}
      <div className="flex-1 flex flex-col ml-60 min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="text-sm font-medium text-muted-foreground">
            {PAGE_TITLES[currentPage]}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-2.5 py-1.5"
              onClick={() => clear()}
              data-ocid="header.logout.button"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                  {shortPrincipal[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{shortPrincipal}</span>
              <ChevronDown size={13} className="text-muted-foreground" />
              <LogOut size={13} className="text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
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
