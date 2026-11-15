// Живой агент: OpenAI-совместимый вызов Nodul Router (ru-2/deepseek-v4.1-flash).
// Ключ читается из секрета NODUL_API_KEY и никогда не попадает в браузер.
Deno.serve(async (req: Request): Promise<Response> => {
  const apiKey = Deno.env.get("NODUL_API_KEY");
  if (!apiKey) {
    return Response.json({ ok: false, error: "key_missing" }, { status: 500 });
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
  if (!messages.length) {
    return Response.json({ ok: false, error: "empty_messages" }, { status: 400 });
  }

  try {
    const res = await fetch("https://router.nodul.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ru-2/deepseek-v4.1-flash",
        messages,
        temperature: 0.6,
        max_tokens: 700,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("nodul error", res.status, text.slice(0, 500));
      return Response.json(
        { ok: false, error: res.status === 401 ? "auth_failed" : res.status === 429 ? "rate_limited" : "provider_error", status: res.status },
        { status: 502 }
      );
    }
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer || typeof answer !== "string") {
      console.error("nodul unexpected response", JSON.stringify(data).slice(0, 300));
      return Response.json({ ok: false, error: "empty_answer" }, { status: 502 });
    }
    return Response.json({ ok: true, answer, usage: data.usage ?? null });
  } catch (e) {
    console.error("nodul fetch failed", e);
    return Response.json({ ok: false, error: "network_error" }, { status: 502 });
  }
});
