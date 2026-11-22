import { redirect } from "next/navigation";
import { accountPageUser } from "@/lib/server/accountPage";
import { store } from "@/lib/server/store";

/** Menu "Household & inventory": the inventory of the newest plan (My plans lists the others). */
export default async function InventoryHome() {
  const user = await accountPageUser();
  const [latest] = await store.listPlans(user.id);
  redirect(latest ? `/plan/${latest.id}/inventory` : "/account/plans");
}
