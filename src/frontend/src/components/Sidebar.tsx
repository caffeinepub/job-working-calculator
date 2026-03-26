import { cn } from "@/lib/utils";
import {
  Briefcase,
  Calculator,
  Download,
  FlaskConical,
  LayersIcon,
  LayoutDashboard,
  Users,
  Wrench,
} from "lucide-react";

export type AppPage =
  | "dashboard"
  | "ssFabrication"
  | "labour"
  | "flexibles"
  | "customers"
  | "formulas"
  | "export";

type NavItem = {
  label: string;
  icon: React.ReactNode;
  page: AppPage;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    page: "dashboard",
  },
  {
    label: "SS Fabrication",
    icon: <Briefcase size={18} />,
    page: "ssFabrication",
  },
  { label: "Labour", icon: <Wrench size={18} />, page: "labour" },
  { label: "Flexibles", icon: <LayersIcon size={18} />, page: "flexibles" },
  { label: "Customers", icon: <Users size={18} />, page: "customers" },
  {
    label: "Formulas & Settings",
    icon: <FlaskConical size={18} />,
    page: "formulas",
  },
  { label: "Export & Backup", icon: <Download size={18} />, page: "export" },
];

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onClose?: () => void;
}

export function Sidebar({ currentPage, onNavigate, onClose }: SidebarProps) {
  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    onClose?.();
  };

  return (
    <aside className="flex flex-col h-full w-60 bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
          <Calculator size={16} className="text-sidebar-primary-foreground" />
        </div>
        <span className="text-sidebar-primary-foreground font-bold text-base tracking-tight">
          JobCalc Pro
        </span>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        data-ocid="sidebar.panel"
      >
        {navItems.map((item) => {
          const isActive = item.page === currentPage;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavigate(item.page)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              data-ocid={`nav.${item.page}.link`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border shrink-0">
        <p className="text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sidebar-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}
