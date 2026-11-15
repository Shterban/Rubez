// Подтверждённое действие агента: списание НК + запись в журнал.
// Пишет через asServiceRole — баланс нельзя подделать из браузера.
import { createClientFromRequest } from "@vibeli/sdk/functions";

Deno.serve(async (req: Request): Promise<Response> => {
  const vibeli = createClientFromRequest(req);
  const user = await vibeli.auth.me();
  if (!user) {
    return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { text?: string; costNK?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const text = String(body.text ?? "").slice(0, 2000);
  const costNK = Math.round(Number(body.costNK));
  if (!text || !Number.isFinite(costNK) || costNK <= 0 || costNK > 10000) {
    return Response.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  // Баланс: сумма всех транзакций владельца приложения.
  let balance = 0;
  try {
    const tx = await vibeli.entities.NkTransaction.list({ limit: 1000 });
    balance = tx.items.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  } catch (e) {
    console.error("balance read failed", e);
  }
  if (balance < costNK) {
    return Response.json({ ok: false, error: "insufficient_funds", balance });
  }

  try {
    await vibeli.asServiceRole.entities.NkTransaction.create({
      amount: -costNK,
      reason: text,
      kind: "action",
    });
    const ev = await vibeli.asServiceRole.entities.AgentEvent.create({
      text,
      costNK,
      status: "done",
    });
    return Response.json({ ok: true, id: ev.id, balance: balance - costNK });
  } catch (e) {
    console.error("applyAgentAction write failed", e);
    return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
  }
});
