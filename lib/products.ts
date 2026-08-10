import type { LucideIcon } from "lucide-react";
import { Users, Network, Wallet, Building2 } from "lucide-react";

export type ProductKey = "ats" | "hrms" | "payroll" | "crm";

export interface Product {
  key: ProductKey;
  name: string;
  description: string;
  /** Root segment for the product. The ATS still lives at the app root. */
  href: string;
  icon: LucideIcon;
  /** Tile background in the switcher — identity colour, not a UI accent. */
  tint: string;
  /** False until the product's routes exist. Renders as "Soon", not a dead link. */
  available: boolean;
}

export const PRODUCTS: Product[] = [
  {
    key: "ats",
    name: "ATS",
    description: "Hiring & pipeline",
    href: "/dashboard",
    icon: Users,
    tint: "bg-brand-500",
    available: true,
  },
  {
    key: "hrms",
    name: "HRMS",
    description: "People & org",
    href: "/hrms",
    icon: Network,
    tint: "bg-indigo-500",
    available: false,
  },
  {
    key: "payroll",
    name: "Payroll",
    description: "Pay & statutory",
    href: "/payroll",
    icon: Wallet,
    tint: "bg-teal-600",
    available: false,
  },
  {
    key: "crm",
    name: "CRM",
    description: "Clients & deals",
    href: "/crm",
    icon: Building2,
    tint: "bg-amber-600",
    available: false,
  },
];

/**
 * Which product owns the current URL. Everything that isn't explicitly claimed
 * by another product belongs to the ATS, since the ATS still sits at the root.
 */
export function productForPathname(pathname: string): Product {
  const match = PRODUCTS.find(
    (p) => p.key !== "ats" && (pathname === p.href || pathname.startsWith(p.href + "/"))
  );
  return match ?? PRODUCTS[0];
}
