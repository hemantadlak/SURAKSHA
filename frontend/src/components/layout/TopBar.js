import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { api } from "@/lib/api";
import { ts } from "@/lib/format";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";

export const TopBar = () => {
  const [meta, setMeta] = useState(null);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    api.meta().then(setMeta).catch(() => setOk(false));
  }, []);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur" data-testid="topbar">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <button className="md:hidden rounded-md border border-border/70 p-1.5" aria-label="Open navigation" data-testid="mobile-nav-button">
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0 bg-background">
            <div className="[&>aside]:flex [&>aside]:w-full [&>aside]:border-r-0 h-full">
              <Sidebar />
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Current incident</div>
          <div className="truncate text-[13px] font-medium" data-testid="topbar-current-incident">
            {meta?.incident || "Loading incident context..."}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden sm:block text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Data timestamp</div>
          <div className="font-mono text-xs text-foreground/80" data-testid="topbar-data-timestamp">
            {meta ? ts(meta.data_timestamp) : "--"}
          </div>
        </div>
        <div className="flex items-center gap-2" data-testid="topbar-system-status">
          <span className={`h-2 w-2 rounded-full ${ok ? "bg-safe" : "bg-critical"}`} />
          <span className="hidden sm:inline text-xs text-foreground/75">{ok ? meta?.system_status || "Operational" : "API unreachable"}</span>
        </div>
        <span className="demo-label" data-testid="topbar-prototype-label">Prototype</span>
        <Link to="/" className="hidden lg:inline text-xs text-foreground/50 hover:text-foreground" data-testid="topbar-home-link">
          Exit
        </Link>
      </div>
    </header>
  );
};
