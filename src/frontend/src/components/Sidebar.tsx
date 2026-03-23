import { cn } from "@/lib/utils";
import {
  BarChart2,
  Briefcase,
  Calculator,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  comingSoon?: boolean;
  href?: string;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    href: "#",
  },
  {
    label: "Raw Materials",
    icon: <Package size={18} />,
    active: true,
    href: "#",
  },
  {
    label: "Job Costing",
    icon: <Briefcase size={18} />,
    comingSoon: true,
  },
  {
    label: "Labor",
    icon: <Users size={18} />,
    comingSoon: true,
  },
  {
    label: "Reports",
    icon: <BarChart2 size={18} />,
    comingSoon: true,
  },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-sidebar border-r border-sidebar-border z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
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
        {navItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              item.active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : item.comingSoon
                  ? "text-sidebar-foreground/40 cursor-not-allowed"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
            )}
            data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "_")}.link`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.comingSoon && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sidebar-foreground/10 text-sidebar-foreground/50">
                Soon
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-sidebar-foreground/40 text-xs">
          © {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sidebar-foreground/70 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}
