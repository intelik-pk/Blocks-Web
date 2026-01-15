import api from './api';

/**
 * Compliance API Service
 * Handles all PVARA compliance-related API calls (ISARs, Alerts, Screenings)
 * All endpoints require x-admin-id header
 */
export const complianceAPI = {
  // ==================== ISARs (Internal Suspicious Activity Reports) ====================
  
  createIsar: (data, adminId) => api.post('/admin/compliance/isars', data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getIsars: (params, adminId) => api.get('/admin/compliance/isars', { 
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getIsar: (id, adminId) => api.get(`/admin/compliance/isars/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  reviewIsar: (id, data, adminId) => api.patch(`/admin/compliance/isars/${id}/review`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getIsarStatistics: (adminId) => api.get('/admin/compliance/isars/statistics', {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== Alerts ====================
  
  createAlert: (data, adminId) => api.post('/admin/compliance/alerts', data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getAlerts: (params, adminId) => api.get('/admin/compliance/alerts', { 
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getAlert: (id, adminId) => api.get(`/admin/compliance/alerts/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  reviewAlert: (id, data, adminId) => api.patch(`/admin/compliance/alerts/${id}/review`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getAlertStatistics: (adminId) => api.get('/admin/compliance/alerts/statistics', {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== Screenings ====================
  
  createScreening: (data, adminId) => api.post('/admin/compliance/screenings', data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getUserScreenings: (userId, adminId) => api.get(`/admin/compliance/screenings/user/${userId}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getScreeningMatches: (params, adminId) => api.get('/admin/compliance/screenings/matches', { 
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  getScreeningStatistics: (adminId) => api.get('/admin/compliance/screenings/statistics', {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== MLRO Customer Profile & Risk Management ====================
  
  getCustomerProfile: (userId, adminId) => api.get(`/mlro/customers/${userId}/profile`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  listCustomers: (params, adminId) => api.get('/mlro/customers', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  overrideRiskRating: (userId, data, adminId) => api.patch(`/mlro/customers/${userId}/risk-rating`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  requireEdd: (userId, data, adminId) => api.patch(`/mlro/customers/${userId}/edd`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  imposeRestrictions: (userId, data, adminId) => api.post(`/mlro/customers/${userId}/restrictions`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  liftRestrictions: (userId, data, adminId) => api.patch(`/mlro/customers/${userId}/restrictions/lift`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== Transaction Monitoring Alerts ====================
  
  getMonitoringAlerts: (params, adminId) => api.get('/mlro/monitoring/alerts', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getMonitoringAlert: (id, adminId) => api.get(`/mlro/monitoring/alerts/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  reviewMonitoringAlert: (id, data, adminId) => api.patch(`/mlro/monitoring/alerts/${id}/review`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  escalateAlert: (id, data, adminId) => api.post(`/mlro/monitoring/alerts/${id}/escalate`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== Monitoring Rules Management ====================
  
  getMonitoringRules: (params, adminId) => api.get('/mlro/monitoring/rules', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getMonitoringRule: (id, adminId) => api.get(`/mlro/monitoring/rules/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getRuleHistory: (ruleName, adminId) => api.get(`/mlro/monitoring/rules/history/${ruleName}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  createMonitoringRule: (data, adminId) => api.post('/mlro/monitoring/rules', data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  approveMonitoringRule: (id, data, adminId) => api.patch(`/mlro/monitoring/rules/${id}/approve`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  updateMonitoringRule: (id, data, adminId) => api.patch(`/mlro/monitoring/rules/${id}`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  deactivateMonitoringRule: (id, data, adminId) => api.patch(`/mlro/monitoring/rules/${id}/deactivate`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  deleteMonitoringRule: (id, adminId) => api.delete(`/mlro/monitoring/rules/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== STR/CTR Reports ====================
  
  createReport: (data, adminId) => api.post('/mlro/reports', data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getReports: (params, adminId) => api.get('/mlro/reports', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getReport: (id, adminId) => api.get(`/mlro/reports/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getReportRegistry: (params, adminId) => api.get('/mlro/reports/registry', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  reviseNarrative: (id, data, adminId) => api.patch(`/mlro/reports/${id}/narrative`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  submitReport: (id, adminId) => api.patch(`/mlro/reports/${id}/submit`, {}, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  approveReport: (id, data, adminId) => api.patch(`/mlro/reports/${id}/approve`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  rejectReport: (id, data, adminId) => api.patch(`/mlro/reports/${id}/reject`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  fileReport: (id, data, adminId) => api.post(`/mlro/reports/${id}/file`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  updateFilingStatus: (id, data, adminId) => api.patch(`/mlro/reports/${id}/filing-status`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  // ==================== Case Management ====================
  
  getAllCases: (params, adminId) => api.get('/mlro/cases', {
    params,
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getCase: (id, adminId) => api.get(`/mlro/cases/${id}`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  createInvestigationNote: (caseId, data, adminId) => api.post(`/mlro/cases/${caseId}/notes`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getCaseNotes: (caseId, adminId) => api.get(`/mlro/cases/${caseId}/notes`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  createInvestigationTask: (caseId, data, adminId) => api.post(`/mlro/cases/${caseId}/tasks`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getCaseTasks: (caseId, adminId) => api.get(`/mlro/cases/${caseId}/tasks`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  updateTask: (taskId, data, adminId) => api.patch(`/mlro/cases/tasks/${taskId}`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  getCaseAttachments: (caseId, adminId) => api.get(`/mlro/cases/${caseId}/attachments`, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
  
  uploadCaseAttachment: (caseId, formData, adminId) => api.post(`/mlro/cases/${caseId}/attachments`, formData, {
    headers: adminId ? { 'x-admin-id': adminId, 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'multipart/form-data' }
  }),
  
  makeFinalDecision: (caseId, data, adminId) => api.post(`/mlro/cases/${caseId}/decision`, data, {
    headers: adminId ? { 'x-admin-id': adminId } : {}
  }),
};

export default complianceAPI;
