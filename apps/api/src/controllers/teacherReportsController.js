import { listTeacherReports, suggestSummary, createReport, editReport, publishReport, deleteReport } from "../services/reports/progressReports.js";

// Thin HTTP layer for teacher progress reports. Access and rules live in the service.

export async function listReports(req, res) {
  res.status(200).json(await listTeacherReports(req.user.id, req.query));
}

export async function reportSuggestion(req, res) {
  res.status(200).json(await suggestSummary(req.user.id, req.params.studentId, req.query));
}

export async function postReport(req, res) {
  res.status(201).json({ report: await createReport(req.user.id, req.params.studentId, req.body) });
}

export async function putReport(req, res) {
  res.status(200).json({ report: await editReport(req.user.id, req.params.studentId, req.params.reportId, req.body) });
}

export async function publishReportRoute(req, res) {
  res.status(200).json({ report: await publishReport(req.user.id, req.params.studentId, req.params.reportId) });
}

export async function removeReport(req, res) {
  res.status(200).json(await deleteReport(req.user.id, req.params.studentId, req.params.reportId));
}
