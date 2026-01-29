import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/modules/shoreline/
export const MODULE_DIR = path.join(__dirname, "..");

// src/modules/shoreline/data
export const DATA_DIR = path.join(MODULE_DIR, "data");

export const BOUNDARY_FILE = path.join(DATA_DIR, "shoreline_boundary.json");
export const NESTS_FILE = path.join(DATA_DIR, "shoreline_nests.json");
export const ALERTS_FILE = path.join(DATA_DIR, "shoreline_alerts.json");
