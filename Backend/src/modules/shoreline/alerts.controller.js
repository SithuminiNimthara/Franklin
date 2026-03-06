import Alert from "./models/alert.model.js";

/**
 * GET /api/shoreline/alerts
 * Query:
 *  - status=new|acknowledged|resolved
 *  - riskLevel=low|medium|high
 *  - limit=20
 *  - page=1
 */
export async function listAlerts(req, res) {
  try {
    const { status, riskLevel } = req.query;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;

    const [items, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Alert.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      items,
    });
  } catch (e) {
    console.error("listAlerts failed:", e);
    res.status(500).json({ detail: "Failed to load alerts" });
  }
}

/** GET /api/shoreline/alerts/:id */
export async function getAlert(req, res) {
  try {
    const item = await Alert.findById(req.params.id);
    if (!item) return res.status(404).json({ detail: "Alert not found" });
    res.json(item);
  } catch (e) {
    res.status(400).json({ detail: "Invalid alert id" });
  }
}

/**
 * POST /api/shoreline/alerts
 * Body:
 *  { riskLevel, message, details?, source?, cooldownKey? }
 *
 * Note: You may call this internally from evaluateOffline / live monitoring.
 */
export async function createAlert(req, res) {
  try {
    const { riskLevel, message, details, source, cooldownKey } = req.body || {};

    if (!riskLevel || !message) {
      return res
        .status(400)
        .json({ detail: "riskLevel and message are required" });
    }

    const alert = await Alert.create({
      type: "shoreline",
      riskLevel,
      message,
      details: details || {},
      source: source || "unknown",
      cooldownKey: cooldownKey || null,
      status: "new",
    });

    res.status(201).json(alert);
  } catch (e) {
    console.error("createAlert failed:", e);
    res.status(500).json({ detail: "Failed to create alert" });
  }
}

/**
 * PATCH /api/shoreline/alerts/:id/ack
 * Body: { staff?: "name-or-id" }
 */
export async function acknowledgeAlert(req, res) {
  try {
    const staff = String(req.body?.staff || "staff");

    const updated = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status: "acknowledged",
        acknowledgedBy: staff,
        acknowledgedAt: new Date(),
      },
      { new: true },
    );

    if (!updated) return res.status(404).json({ detail: "Alert not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ detail: "Invalid alert id" });
  }
}

/**
 * PATCH /api/shoreline/alerts/:id/resolve
 * Body: { staff?: "name-or-id" }
 */
export async function resolveAlert(req, res) {
  try {
    const staff = String(req.body?.staff || "staff");

    const updated = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status: "resolved",
        resolvedBy: staff,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!updated) return res.status(404).json({ detail: "Alert not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ detail: "Invalid alert id" });
  }
}

/** DELETE /api/shoreline/alerts/:id */
export async function deleteAlert(req, res) {
  try {
    const deleted = await Alert.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ detail: "Alert not found" });
    res.json({ status: "ok", deleted: req.params.id });
  } catch (e) {
    res.status(400).json({ detail: "Invalid alert id" });
  }
}
