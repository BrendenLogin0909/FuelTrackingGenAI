"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackIcon, FuelIcon } from "@/components/icons";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  action?: React.ReactNode;
}

export function Header({ title = "FuelTrack", showBack = false, backHref = "/", action }: HeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16 md:px-6">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link
              href={backHref}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <BackIcon size={20} />
              <span className="sr-only">Back</span>
            </Link>
          ) : null}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FuelIcon size={18} className="text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">{title}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {isHome && (
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                History
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
