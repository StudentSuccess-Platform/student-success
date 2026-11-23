import express from "express";
import {
  listReports,
  reportSuggestion,
  postReport,
  putReport,
  publishReportRoute,
  removeReport,
} from "../../controllers/teacherReportsController.js";

// Teacher progress reports: list, suggested summary, create, edit, publish, delete a draft.
// Mounted by routes/teacher.js (teacherRoutes), which already applies requireAuth + requireRole("teacher").
const router = express.Router();

router.get("/reports", listReports);
router.get("/students/:studentId/reports/suggestion", reportSuggestion);
router.post("/students/:studentId/reports", postReport);
router.put("/students/:studentId/reports/:reportId", putReport);
router.post("/students/:studentId/reports/:reportId/publish", publishReportRoute);
router.delete("/students/:studentId/reports/:reportId", removeReport);

export default router;
