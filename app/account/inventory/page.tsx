import { redirect } from "next/navigation";
import { accountPageUser } from "@/lib/server/accountPage";
import { store } from "@/lib/server/store";

/** Read ACCOUNTS_ENABLED and the session per request (never prerendered at build time). */
export const dynamic = "force-dynamic";

/** Menu "Household & inventory": the inventory of the newest plan (My plans lists the others). */
export default async function InventoryHome() {
  const user = await accountPageUser();
  const [latest] = await store.listPlans(user.id);
  redirect(latest ? `/plan/${latest.id}/inventory` : "/account/plans");
}
