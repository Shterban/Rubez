// Локальный предпросмотр агента «Рубеж» с настоящей моделью.
//   npm run agent:preview         (или node --experimental-strip-types scripts/agent-preview.ts)
//   → http://127.0.0.1:8787
//
// Сервер отдаёт кликабельный прототип кабинета и принимает POST /api/agent с
// тем же контрактом, что у прод-функции functions/agentChat.ts:
//   { messages: [{role, content}], context?: string }
//   → { ok: true, answer, prices }
// Ключ живёт только здесь, в браузер он не попадает.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSystem } from "../functions/_prompt.ts";
import { PRICES } from "../functions/_pricing.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// .env.local — чтобы не держать ключ в команде запуска.
try {
  const raw = await readFile(join(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* нет .env.local — читаем окружение как есть */
}

const endpointBase = process.env.AGENT_API_URL ?? "https://agenthere.ru/v1";
const endpoint = endpointBase.replace(/\/+$/, "").endsWith("/chat/completions")
  ? endpointBase.replace(/\/+$/, "")
  : `${endpointBase.replace(/\/+$/, "")}/chat/completions`;
const model = process.env.AGENT_MODEL ?? "deepseek-v4-flash";
const apiKey = process.env.AGENT_API_KEY ?? process.env.NODUL_API_KEY ?? "";
const port = Number(process.env.PORT ?? 8787);
const demoFile = process.argv[2] ?? join(root, "preview", "agent-ux-demo.html");

const json = (res: any, code: number, data: unknown) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

async function agent(body: { messages?: any[]; context?: string }) {
  const dialog = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 12000) }));
  if (!dialog.length) return { code: 400, data: { ok: false, error: "empty_messages" } };
  if (!apiKey) return { code: 500, data: { ok: false, error: "key_missing" } };

  const system = buildSystem(typeof body.context === "string" ? body.context.slice(0, 4000) : "");
  const t0 = Date.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...dialog],
      temperature: 0.4,
      max_tokens: 1600,
    }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[agent] ${res.status} ${ms} мс: ${text.slice(0, 300)}`);
    return { code: 502, data: { ok: false, error: "provider_error", status: res.status } };
  }
  const data: any = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer || !String(answer).trim()) {
    console.error("[agent] пустой ответ", JSON.stringify(data).slice(0, 300));
    return { code: 502, data: { ok: false, error: "empty_answer" } };
  }
  console.log(`[agent] ${ms} мс · токены ${data.usage?.prompt_tokens ?? "?"}/${data.usage?.completion_tokens ?? "?"}`);
  return { code: 200, data: { ok: true, answer, usage: data.usage ?? null, prices: PRICES } };
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (req.method === "POST" && url.pathname === "/api/agent") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 200_000) {
        return json(res, 413, { ok: false, error: "too_large" });
      }
    }
    let body: any;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(res, 400, { ok: false, error: "bad_request" });
    }
    try {
      const out = await agent(body);
      // небольшая пауза, чтобы «размышление» в интерфейсе было видно, а не мигало
      return json(res, out.code, out.data);
    } catch (e) {
      console.error("[agent] fetch failed", e);
      return json(res, 502, { ok: false, error: "network_error" });
    }
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    try {
      const html = await readFile(demoFile, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Не найден файл прототипа: " + demoFile);
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
}).listen(port, "127.0.0.1", () => {
  console.log(`Агент-предпросмотр: http://127.0.0.1:${port}`);
  console.log(`модель ${model} · ключ ${apiKey ? "загружен" : "НЕ найден (AGENT_API_KEY / .env.local)"}`);
});
