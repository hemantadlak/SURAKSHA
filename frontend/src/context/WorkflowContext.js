import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const WorkflowContext = createContext(null);
const LS_KEY = "suraksha.workflow";

export const WorkflowProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { selectedHabId: null, utilization: 1, completed: {}, ...JSON.parse(raw) };
    } catch (e) {
      /* ignore */
    }
    return { selectedHabId: null, utilization: 1, completed: {} };
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }, [state]);

  const setSelectedHabId = useCallback((id) => setState((s) => (s.selectedHabId === id ? s : { ...s, selectedHabId: id, completed: {} })), []);
  const setUtilization = useCallback((u) => setState((s) => ({ ...s, utilization: u })), []);
  const markStep = useCallback((habId, step) => setState((s) => ({ ...s, completed: { ...s.completed, [`${habId}:${step}`]: true } })), []);
  const isStepDone = useCallback((habId, step) => Boolean(state.completed[`${habId}:${step}`]), [state.completed]);

  const value = useMemo(() => ({ ...state, setSelectedHabId, setUtilization, markStep, isStepDone }), [state, setSelectedHabId, setUtilization, markStep, isStepDone]);
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

export const useWorkflow = () => {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
};
