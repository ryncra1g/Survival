import "server-only";
import { isDemo } from "../env";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const store: Store = isDemo ? fileStore : supabaseStore;
export type * from "./types";
