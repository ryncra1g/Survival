import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoLinkBanner } from "@/components/DemoLinkBanner";
import { Questionnaire } from "@/components/Questionnaire";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export const metadata: Metadata = { title: "Your questions", robots: { index: false } };

export default async function QPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await store.getQuestionnaire(id) : null;
  if (!q || !(await canAccessQuestionnaire(session, q))) notFound();
  return (
    <>
      <div className="mx-auto max-w-xl px-4"><DemoLinkBanner /></div>
      <Questionnaire id={id} initial={q.answers} />
    </>
  );
}
