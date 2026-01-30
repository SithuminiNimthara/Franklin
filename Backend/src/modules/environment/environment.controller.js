import {
  getCurrentEnvironment as getEnv,
  saveManualEnvironment as saveEnv,
} from "./services/environment.service.js";

export async function getCurrentEnvironment(req, res) {
  const env = await getEnv();
  res.json(env);
}

export async function saveManualEnvironment(req, res) {
  const doc = await saveEnv(req.body || {});
  res.json(doc);
}
