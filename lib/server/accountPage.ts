import "server-only";
import { notFound, redirect } from "next/navigation";
import { flags } from "@/lib/flags";
import { getSession } from "./session";
import { store, type UserRow } from "./store";

/** Accounts-track pages: 404 while ACCOUNTS_ENABLED is off; sign-in page for anyone not signed in. */
export async function accountPageUser(): Promise<UserRow> {
  if (!flags().accounts) notFound();
  const s = await getSession();
  const user = s?.scope === "full" ? await store.getUser(s.uid) : null;
  if (!user) redirect("/account");
  return user;
}
