"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { PRODUCTS, productForPathname } from "@/lib/products";
import { cn } from "@/lib/utils";

/** Nine-dot waffle. Lucide has no true waffle glyph, so it's drawn here. */
function WaffleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      {[3.5, 9, 14.5].map((cy) =>
        [3.5, 9, 14.5].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} />)
      )}
    </svg>
  );
}

interface ProductSwitcherProps {
  collapsed: boolean;
  /** Closes the mobile drawer after picking a product. */
  onNavigate?: () => void;
}

export default function ProductSwitcher({ collapsed, onNavigate }: ProductSwitcherProps) {
  const pathname = usePathname();
  const current = productForPathname(pathname);

  // TODO: filter by the organisation's licensed products once entitlements exist.
  const products = PRODUCTS;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Switch product"
          title="Switch product"
          className={cn(
            "flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors",
            "hover:bg-gray-800 hover:text-white",
            "data-[state=open]:bg-gray-800 data-[state=open]:text-white"
          )}
        >
          <WaffleIcon />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={collapsed ? "right" : "bottom"}
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="z-[60] w-[292px] rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-xl"
        >
          <p className="px-1.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
            HireRabbits Suite
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {products.map((product) => {
              const isCurrent = product.key === current.key;

              const inner = (
                <>
                  {isCurrent && (
                    <Check size={14} className="absolute right-2 top-2 text-brand-500" strokeWidth={3} />
                  )}
                  <span
                    className={cn(
                      "grid h-[30px] w-[30px] place-items-center rounded-lg text-white",
                      product.tint,
                      !product.available && "opacity-45"
                    )}
                  >
                    <product.icon size={16} />
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
                      {product.name}
                      {!product.available && (
                        <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-gray-500">
                      {product.description}
                    </span>
                  </span>
                </>
              );

              const shell = cn(
                "relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors",
                isCurrent
                  ? "border-brand-200 bg-brand-50"
                  : "border-transparent hover:border-gray-200 hover:bg-gray-50"
              );

              if (!product.available) {
                return (
                  <div
                    key={product.key}
                    aria-disabled="true"
                    className={cn(shell, "cursor-default hover:border-transparent hover:bg-transparent")}
                  >
                    {inner}
                  </div>
                );
              }

              return (
                <Popover.Close asChild key={product.key}>
                  <Link
                    href={product.href}
                    onClick={onNavigate}
                    aria-current={isCurrent ? "page" : undefined}
                    className={shell}
                  >
                    {inner}
                  </Link>
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
