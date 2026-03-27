import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calculator, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthActor } from "./authActor";
import type { AppPage } from "./components/Sidebar";
import { Sidebar } from "./components/Sidebar";
import { Customers } from "./pages/Customers";
import { Dashboard } from "./pages/Dashboard";
import { ExportData } from "./pages/ExportData";
import { Flexibles } from "./pages/Flexibles";
import { Formulas } from "./pages/Formulas";
import { Labour } from "./pages/Labour";
import { SSFabrication } from "./pages/SSFabrication";
import { UsersManagement } from "./pages/UsersManagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "Dashboard",
  ssFabrication: "SS Fabrication",
  customers: "Customers",
  formulas: "Formulas & Settings",
  export: "Export & Backup",
  labour: "Labour Jobs",
  flexibles: "Flexibles",
  users: "User Management",
};

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("jobcalc_dark_mode") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("jobcalc_dark_mode", String(dark));
  }, [dark]);

  return [dark, setDark] as const;
}

function AppShell() {
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    getAuthActor()
      .then((a) => a.initAdmin())
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-[100dvh] md:z-30">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          />
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
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Admin
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              data-ocid="header.toggle"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 md:p-6 pb-8 md:pb-6">
          {currentPage === "dashboard" && (
            <Dashboard onNavigate={setCurrentPage} />
          )}
          {currentPage === "ssFabrication" && (
            <SSFabrication editJobOnMount={null} onEditConsumed={() => {}} />
          )}
          {currentPage === "customers" && <Customers />}
          {currentPage === "formulas" && <Formulas />}
          {currentPage === "export" && <ExportData />}
          {currentPage === "labour" && <Labour />}
          {currentPage === "flexibles" && <Flexibles />}
          {currentPage === "users" && <UsersManagement />}
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
