import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkflowProvider } from "@/context/WorkflowContext";
import { AppShell } from "@/components/layout/AppShell";
import Landing from "@/pages/Landing";
import CommandCenter from "@/pages/CommandCenter";
import HazardIntelligence from "@/pages/HazardIntelligence";
import RedZones from "@/pages/RedZones";
import Habitations from "@/pages/Habitations";
import Workflow from "@/pages/Workflow";
import Alerts from "@/pages/Alerts";
import FieldReports from "@/pages/FieldReports";
import Citizen from "@/pages/Citizen";

function App() {
  return (
    <div className="App dark">
      <TooltipProvider delayDuration={150}>
        <WorkflowProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/citizen" element={<Citizen />} />
              <Route element={<AppShell />}>
                <Route path="/command-center" element={<CommandCenter />} />
                <Route path="/hazard-intelligence" element={<HazardIntelligence />} />
                <Route path="/red-zones" element={<RedZones />} />
                <Route path="/habitations" element={<Habitations />} />
                <Route path="/workflow/:habId" element={<Navigate to="priority" replace />} />
                <Route path="/workflow/:habId/:step" element={<Workflow />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/field-reports" element={<FieldReports />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" theme="dark" richColors closeButton />
        </WorkflowProvider>
      </TooltipProvider>
    </div>
  );
}

export default App;
