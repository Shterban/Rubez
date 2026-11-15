// Живой агент: OpenAI-совместимый вызов модели.
// Провайдер настраивается секретами, ключ никогда не попадает в браузер:
//   AGENT_API_URL — база, по умолчанию https://agenthere.ru/v1
//                   (можно указать и полный .../chat/completions)
//   AGENT_API_KEY — ключ шлюза (fallback: NODUL_API_KEY)
//   AGENT_MODEL   — id модели, по умолчанию deepseek-v4-flash
//
// Роли: сервер задаёт правила и формат ответа, клиент присылает только диалог
// и контекст кабинета. Цены считает прайс (_pricing.ts) — модель выбирает
// услугу по id, но не называет сумму.
import { PRICES } from "./_pricing.ts";
import { buildSystem } from "./_prompt.ts";

// База может прийти как «.../v1», как «.../v1/» или сразу полным адресом
// чата — приводим к одному виду, чтобы смена провайдера была одной строкой.
function chatEndpoint(base: string): string {
  const url = base.trim().replace(/\/+$/, "");
  return url.endsWith("/chat/completions") ? url : `${url}/chat/completions`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const apiKey = Deno.env.get("AGENT_API_KEY") ?? Deno.env.get("NODUL_API_KEY") ?? "";
  if (!apiKey) {
    return Response.json({ ok: false, error: "key_missing" }, { status: 500 });
  }
  const endpoint = chatEndpoint(Deno.env.get("AGENT_API_URL") ?? "https://agenthere.ru/v1");
  const model = Deno.env.get("AGENT_MODEL") ?? "deepseek-v4-flash";

  let body: { messages?: { role: string; content: string }[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const dialog = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
  if (!dialog.length) {
    return Response.json({ ok: false, error: "empty_messages" }, { status: 400 });
  }

  const context = typeof body.context === "string" ? body.context.slice(0, 4000) : "";
  const system = buildSystem(context);
  const messages = [{ role: "system", content: system }, ...dialog];

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        // reasoning-модели тратят часть лимита на размышление, поэтому
        // запас больше, чем нужно самому ответу.
        max_tokens: 1600,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("agent provider error", res.status, text.slice(0, 500));
      return Response.json(
        {
          ok: false,
          error: res.status === 401 ? "auth_failed" : res.status === 429 ? "rate_limited" : "provider_error",
          status: res.status,
        },
        { status: 502 }
      );
    }
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer || typeof answer !== "string" || !answer.trim()) {
      console.error("agent provider unexpected response", JSON.stringify(data).slice(0, 300));
      return Response.json({ ok: false, error: "empty_answer" }, { status: 502 });
    }
    // prices — чтобы интерфейс показывал ровно ту сумму, которую спишет сервер.
    return Response.json({ ok: true, answer, usage: data.usage ?? null, prices: PRICES });
  } catch (e) {
    console.error("agent provider fetch failed", e);
    return Response.json({ ok: false, error: "network_error" }, { status: 502 });
  }
});
