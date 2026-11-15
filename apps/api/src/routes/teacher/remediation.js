import express from "express";
import {
  listRemediationPlans,
  createRemediationPlan,
  updateRemediationPlan,
  approveRemediationPlan,
  rejectRemediationPlan,
  publishRemediationPlan,
} from "../../controllers/teacherRemediationController.js";

// Workstream B3 remediation plan workflow (create, edit, approve, reject, publish).
// Mounted by routes/teacherRoutes.js, which already applies requireAuth + requireRole("teacher").
const router = express.Router();

router.get("/students/:studentId/remediation", listRemediationPlans);
router.post("/students/:studentId/remediation", createRemediationPlan);
router.put("/students/:studentId/remediation/:planId", updateRemediationPlan);
router.post("/students/:studentId/remediation/:planId/approve", approveRemediationPlan);
router.post("/students/:studentId/remediation/:planId/reject", rejectRemediationPlan);
router.post("/students/:studentId/remediation/:planId/publish", publishRemediationPlan);

export default router;
