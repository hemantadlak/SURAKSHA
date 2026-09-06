import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 45000 });
const get = (url, params) => http.get(url, { params }).then((r) => r.data);
const post = (url, body) => http.post(url, body).then((r) => r.data);
const put = (url, body) => http.put(url, body).then((r) => r.data);
const del = (url) => http.delete(url).then((r) => r.data);

export const api = {
  meta: () => get("/meta"),
  kpis: () => get("/kpis"),
  geoDistricts: () => get("/geo/districts"),
  districts: () => get("/districts"),
  severityComponents: () => get("/districts/severity-components"),
  hazardTypes: () => get("/hazards/types"),
  hazardConfig: () => get("/hazards/config"),
  updateHazardConfig: (profiles) => put("/hazards/config", { profiles }),
  resetHazardConfig: () => post("/hazards/config/reset", {}),
  infrastructure: () => get("/infrastructure"),
  habitations: (params) => get("/habitations", params),
  habitation: (id) => get(`/habitations/${id}`),
  priority: (id) => get(`/habitations/${id}/priority`),
  sites: (id) => get(`/habitations/${id}/sites`),
  capacity: (id, utilization = 1) => get(`/habitations/${id}/capacity`, { utilization }),
  plan: (id, utilization = 1) => post(`/habitations/${id}/plan`, { utilization }),
  routes: (id, siteId) => get(`/habitations/${id}/routes`, { site_id: siteId }),
  generateActionPlan: (id, body) => post(`/habitations/${id}/action-plan`, body),
  actionPlans: () => get("/action-plans"),
  actionPlan: (id) => get(`/action-plans/${id}`),
  allSites: () => get("/sites"),
  alerts: () => get("/alerts"),
  acknowledgeAlert: (id, by) => post(`/alerts/${id}/acknowledge`, { acknowledged_by: by || "Control room" }),
  unacknowledgeAlert: (id) => del(`/alerts/${id}/acknowledge`),
  fieldReports: () => get("/field-reports"),
  createFieldReport: (body) => post("/field-reports", body),
  deleteFieldReport: (id) => del(`/field-reports/${id}`),
  citizen: (id) => get(`/citizen/${id}`),
};
