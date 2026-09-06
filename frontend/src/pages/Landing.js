import { Link } from "react-router-dom";
import { Shield, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHAIN = ["Hazard", "People at risk", "Priority", "Safe alternative", "Capacity", "Relocation", "Action"];

export default function Landing() {
  return (
    <div className="suraksha-shell-texture relative min-h-screen text-foreground">
      <div className="contour-texture absolute inset-0 pointer-events-none" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-[0.18em]">SURAKSHA</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50">GIS decision support · SIH26191</div>
          </div>
        </div>

        <h1 className="mt-10 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">From Hazard Intelligence to Safer Relocation.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/70 sm:text-base">
          Identifies multi-hazard red zones, ranks vulnerable habitations for relocation, compares alternative sites on safety and carrying capacity, and produces an evidence-backed recommended action for the district disaster-management authority.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2" data-testid="workflow-chain">
          {CHAIN.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="rounded border border-border/70 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-wider text-foreground/75">{c}</span>
              {i < CHAIN.length - 1 && <ArrowRight className="h-3 w-3 text-foreground/35" />}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 px-6" data-testid="launch-command-center-button">
            <Link to="/command-center">
              Launch Command Center <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6" data-testid="launch-citizen-view-button">
            <Link to="/citizen">
              <Users className="h-4 w-4" /> Citizen Safety View
            </Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-3 text-xs text-foreground/55 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 p-3">
            <div className="font-medium text-foreground/80">Seed data</div>
            Assam district flood figures derived from ASDMA daily bulletins (2019-2026). Settlement-level values are prototype / illustrative disaggregations.
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <div className="font-medium text-foreground/80">Transparent model</div>
            Weighted-overlay scoring with visible weights. Prototype scoring model - not an official government formula. No accuracy claims.
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <div className="font-medium text-foreground/80">Decision support</div>
            Outputs are recommendations for the competent authority (DDMA / SDMA). SURAKSHA has no authority to order evacuation or relocation.
          </div>
        </div>
      </div>
    </div>
  );
}
