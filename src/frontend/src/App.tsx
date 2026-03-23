import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bell, ChevronDown } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { RawMaterials } from "./pages/RawMaterials";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col ml-60 min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="text-sm font-medium text-muted-foreground">
            Job Working Calculator
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              data-ocid="header.notification_button"
            >
              <Bell size={16} />
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
              data-ocid="header.user_menu.button"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                  A
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Admin</span>
              <ChevronDown size={13} className="text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <RawMaterials />
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
