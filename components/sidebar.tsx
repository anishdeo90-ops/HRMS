"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CarFront,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  GitBranch,
  Landmark,
  LayoutDashboard,
  LogOut,
  Plane,
  ReceiptText,
  Settings,
  Target,
  UserRound,
  UserRoundCog,
  Users,
  WalletCards,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { HireRabbitsLogo } from "@/components/hirerabbits-logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { NavSection, SECTION_LABELS, canViewSettings, getNavForRole, getSectionsForRole } from "@/lib/nav/config";
import type { NavIconName, NavItem } from "@/lib/nav/config";

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  activity: Activity,
  users: Users,
  briefcase: Briefcase,
  clipboard: ClipboardList,
  fileText: FileText,
  building: Building2,
  userCog: UserRoundCog,
  clock: Clock3,
  calendar: CalendarDays,
  checkSquare: CheckSquare,
  wallet: WalletCards,
  receipt: ReceiptText,
  landmark: Landmark,
  plane: Plane,
  car: CarFront,
  badgeDollar: BadgeDollarSign,
  target: Target,
  gitBranch: GitBranch,
  userRound: UserRound,
  barChart: BarChart3,
  bell: Bell,
  workflow: Workflow,
};

interface SidebarProps {
  profile: Profile;
}

function isActivePath(pathname: string, href: string) {
  return href === "/expenses" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  const Icon = NAV_ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-brand-500 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && item.label}
    </Link>
  );
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = getNavForRole(profile.role);
  const sections = getSectionsForRole(profile.role);

  return (
    <aside className={cn(
      "flex flex-col bg-gray-900 text-white transition-all duration-200 min-h-screen flex-shrink-0",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <HireRabbitsLogo className="h-8 w-8 rounded-lg flex-shrink-0" />
        {!collapsed && (
          <div>
            <p className="font-semibold text-sm leading-tight">HireRabbits</p>
            <p className="text-brand-400 text-xs">Hiring OS</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-400 hover:text-white">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {sections.map((section) => {
          const sectionItems = navItems.filter((item) => item.section === section);

          if (section === NavSection.NONE || section === NavSection.RECRUITING) {
            return (
              <Fragment key={section}>
                {sectionItems.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={collapsed} active={isActivePath(pathname, item.href)} />
                ))}
              </Fragment>
            );
          }

          return (
            <div key={section} className="pt-3 mt-3 border-t border-gray-800">
              {!collapsed && <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">{SECTION_LABELS[section]}</p>}
              {sectionItems.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} active={isActivePath(pathname, item.href)} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Settings gear + user + logout */}
      <div className="border-t border-gray-700 p-3 space-y-1">
        {canViewSettings(profile.role) && (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-brand-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && "Settings"}
          </Link>
        )}

        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white truncate">{profile.name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.role.replace("_", " ")}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 w-full transition-colors"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
