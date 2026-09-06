import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Layers, Flame, Users, ListOrdered, Building2, Gauge, Route as RouteIcon, ClipboardList, Bell, FileText, ShieldCheck, Shield, MapPinned } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { WORKFLOW_STEPS } from "@/lib/format";

const STEP_ICONS = { priority: ListOrdered, sites: Building2, capacity: Gauge, plan: MapPinned, route: RouteIcon, action: ClipboardList };

const Item = ({ to, icon: Icon, label, testId, end }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`} data-testid={testId}>
    <Icon className="h-4 w-4 shrink-0 opacity-80" />
    <span className="truncate">{label}</span>
  </NavLink>
);

export const Sidebar = () => {
  const { selectedHabId } = useWorkflow();
  const navigate = useNavigate();
  return (
    <aside className="hidden md:flex w-[232px] shrink-0 flex-col border-r border-border/70 bg-background/80" data-testid="sidebar">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border/70">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-[0.12em]">SURAKSHA</div>
          <div className="text-[10px] text-foreground/50">Relocation decision support</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-3 space-y-0.5">
        <div className="px-2.5 pb-1 text-[10px] uppercase tracking-[0.14em] text-foreground/40">Situation</div>
        <Item to="/command-center" icon={LayoutGrid} label="Command Center" testId="sidebar-nav-command-center" />
        <Item to="/hazard-intelligence" icon={Layers} label="Hazard Intelligence" testId="sidebar-nav-hazard-intelligence" />
        <Item to="/red-zones" icon={Flame} label="Red Zones" testId="sidebar-nav-red-zones" />
        <Item to="/habitations" icon={Users} label="Vulnerable Habitations" testId="sidebar-nav-vulnerable-habitations" />

        <div className="px-2.5 pt-4 pb-1 text-[10px] uppercase tracking-[0.14em] text-foreground/40">Relocation workflow</div>
        {WORKFLOW_STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s.id];
          const to = selectedHabId ? `/workflow/${selectedHabId}/${s.id}` : "/habitations";
          return (
            <NavLink
              key={s.id}
              to={to}
              onClick={(e) => {
                if (!selectedHabId) {
                  e.preventDefault();
                  navigate("/habitations?prompt=1");
                }
              }}
              className={({ isActive }) => `nav-item ${isActive && selectedHabId ? "nav-item-active" : ""}`}
              data-testid={`sidebar-nav-${s.id === "priority" ? "relocation-priority" : s.id === "sites" ? "alternative-sites" : s.id === "capacity" ? "carrying-capacity" : s.id === "plan" ? "relocation-planner" : s.id === "route" ? "evacuation-routes" : "action-plan"}`}
            >
              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-mono text-foreground/45">{i + 1}</span>
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{s.label}</span>
            </NavLink>
          );
        })}
        {!selectedHabId && <div className="px-2.5 pt-1 text-[10px] text-foreground/40">Select a habitation to unlock the workflow</div>}

        <div className="px-2.5 pt-4 pb-1 text-[10px] uppercase tracking-[0.14em] text-foreground/40">Operations</div>
        <Item to="/alerts" icon={Bell} label="Alerts" testId="sidebar-nav-alerts" />
        <Item to="/field-reports" icon={FileText} label="Field Reports" testId="sidebar-nav-field-reports" />
      </nav>

      <div className="border-t border-border/70 p-2.5">
        <NavLink to="/citizen" className="nav-item" data-testid="sidebar-nav-citizen-view">
          <ShieldCheck className="h-4 w-4 opacity-80" />
          <span>Citizen Safety View</span>
        </NavLink>
        <div className="px-2.5 pt-2 text-[10px] leading-snug text-foreground/40">Prototype for SIH26191. Decision support only - no evacuation authority.</div>
      </div>
    </aside>
  );
};
