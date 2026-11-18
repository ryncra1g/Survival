import { DEFAULT_ANSWERS } from "@/lib/answers/schema";
import { err, json, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** Start a new questionnaire pre-filled with the user's latest answers (edit & regenerate). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const latest = (await store.listQuestionnaires(auth.user.id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const q = await store.createQuestionnaire({
    user_id: auth.user.id,
    session_nonce: auth.session.nonce,
    answers: latest ? { ...latest.answers, _step: 0 } : { ...DEFAULT_ANSWERS },
    complete: false,
    version: 1,
  });
  return json({ questionnaireId: q.id });
}
