import {
  listPlans,
  createManualPlan,
  editPlan,
  approvePlan,
  rejectPlan,
  publishPlan,
} from "../services/remediation/remediationWorkflow.js";

// Thin HTTP layer for the teacher remediation workflow. Access and rules live in the service.

export async function listRemediationPlans(req, res) {
  const plans = await listPlans(req.user.id, req.params.studentId);
  res.status(200).json({ plans });
}

export async function createRemediationPlan(req, res) {
  const plan = await createManualPlan(req.user.id, req.params.studentId, req.body);
  res.status(201).json({ plan });
}

export async function updateRemediationPlan(req, res) {
  const plan = await editPlan(req.user.id, req.params.studentId, req.params.planId, req.body);
  res.status(200).json({ plan });
}

export async function approveRemediationPlan(req, res) {
  const plan = await approvePlan(req.user.id, req.params.studentId, req.params.planId);
  res.status(200).json({ plan });
}

export async function rejectRemediationPlan(req, res) {
  const plan = await rejectPlan(req.user.id, req.params.studentId, req.params.planId);
  res.status(200).json({ plan });
}

export async function publishRemediationPlan(req, res) {
  const plan = await publishPlan(req.user.id, req.params.studentId, req.params.planId);
  res.status(200).json({ plan });
}
