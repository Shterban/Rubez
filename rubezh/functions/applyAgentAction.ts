// Подтверждённое действие агента: списание НК + запись в журнал.
// Пишет через asServiceRole — баланс нельзя подделать из браузера.
//
// Цена НЕ приходит от клиента: клиент называет услугу, сумму берём из прайса.
// clientRef защищает от двойного списания при повторном клике или ретрае.
import { createClientFromRequest } from "@vibeli/sdk/functions";
import { priceOf, labelOf } from "./_pricing.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const vibeli = createClientFromRequest(req);
  const user = await vibeli.auth.me();
  if (!user) {
    return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { service?: string; text?: string; clientRef?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const service = String(body.service ?? "").slice(0, 40);
  const costNK = priceOf(service);
  if (!costNK) {
    return Response.json({ ok: false, error: "unknown_service" }, { status: 400 });
  }
  const text = String(body.text ?? "").slice(0, 300).trim() || labelOf(service);
  const clientRef = String(body.clientRef ?? "").slice(0, 64);

  // Идемпотентность: тот же clientRef — уже проведённое действие.
  if (clientRef) {
    try {
      const dup = await vibeli.entities.AgentEvent.list({ filter: { clientRef }, limit: 1 });
      if (dup.items?.length) {
        return Response.json({ ok: false, error: "already_applied", id: dup.items[0].id }, { status: 409 });
      }
    } catch (e) {
      console.error("idempotency check failed", e);
    }
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
    return Response.json({ ok: false, error: "insufficient_funds", balance }, { status: 402 });
  }

  try {
    await vibeli.asServiceRole.entities.NkTransaction.create({
      amount: -costNK,
      reason: `${labelOf(service)}: ${text}`,
      kind: "action",
    });
    const ev = await vibeli.asServiceRole.entities.AgentEvent.create({
      text,
      costNK,
      status: "done",
      service,
      clientRef: clientRef || undefined,
    });
    return Response.json({ ok: true, id: ev.id, costNK, balance: balance - costNK });
  } catch (e) {
    console.error("applyAgentAction write failed", e);
    return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
  }
});
