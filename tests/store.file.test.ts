import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { storeContract } from "./helpers/storeContract";

/** The store contract against the file store (demo mode), in a fresh data directory. */
process.env.READYPLAN_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "store-contract-"));
storeContract("file store", async () => (await import("@/lib/server/store/file")).fileStore);
