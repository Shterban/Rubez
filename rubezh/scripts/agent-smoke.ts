// Smoke-проверка живого агента без сборки приложения.
//   node --experimental-strip-types scripts/agent-smoke.ts
//
// Берёт ровно тот системный промпт, что уходит в прод (functions/_prompt.ts),
// шлёт реальный запрос в шлюз и проверяет ответ теми же правилами, что и
// интерфейс (src/lib/agentPricing.js): карточка есть, услуга из прайса,
// цена считается на сервере, а не берётся из текста модели.
//
// Ключ читается из окружения, а если его там нет — из .env.local.
import { readFileSync } from "node:fs";
import { buildSystem } from "../functions/_prompt.ts";
import { parseCards, priceOf, formatNK } from "../src/lib/agentPricing.js";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* .env.local не обязателен: ключ может прийти из окружения */
  }
}
loadEnvLocal();

const endpointBase = process.env.AGENT_API_URL ?? "https://agenthere.ru/v1";
const endpoint = endpointBase.replace(/\/+$/, "").endsWith("/chat/completions")
  ? endpointBase.replace(/\/+$/, "")
  : `${endpointBase.replace(/\/+$/, "")}/chat/completions`;
const model = process.env.AGENT_MODEL ?? "deepseek-v4-flash";
const apiKey = process.env.AGENT_API_KEY ?? process.env.NODUL_API_KEY ?? "";

const LOG_SAMPLE = `[12:01:03] [Server thread/WARN]: Can't keep up! Is the server overloaded? Running 3241ms behind
[12:01:44] [Server thread/WARN]: Can't keep up! Running 2890ms behind
[12:02:10] [Server thread/ERROR]: java.lang.OutOfMemoryError: Java heap space
[12:02:11] [Server thread/WARN]: Can't keep up! Running 4102ms behind
[12:03:02] [Server thread/ERROR]: java.lang.OutOfMemoryError: Java heap space`;

const question = process.argv[2] ?? `Лагает после 30 игроков. Вот лог:\n${LOG_SAMPLE}`;

const fail = (msg: string) => {
  console.error("FAIL: " + msg);
  process.exit(1);
};

if (!apiKey) fail("нет ключа: задайте AGENT_API_KEY или положите .env.local");

const t0 = Date.now();
const res = await fetch(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: buildSystem("Баланс: 53 НК. Сборка: Paper 1.21.4, 30 онлайн, 2 ГБ RAM.") },
      { role: "user", content: question },
    ],
    temperature: 0.4,
    max_tokens: 1600,
  }),
});

const ms = Date.now() - t0;
if (!res.ok) fail(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

const data = await res.json();
const answer: string = data?.choices?.[0]?.message?.content ?? "";
if (!answer.trim()) fail("пустой content (модель израсходовала лимит на reasoning?)");

const u = data.usage ?? {};
console.log(`модель: ${data.model ?? model} · ${ms} мс · токены: prompt ${u.prompt_tokens ?? "?"} / completion ${u.completion_tokens ?? "?"}`);
console.log("--- ответ агента ---\n" + answer + "\n--- разбор ---");

const { body, cards } = parseCards(answer) as { body: string; cards: any[] };
const kinds = cards.map((c) => c.kind);
console.log("карточки: " + (kinds.length ? kinds.join(", ") : "нет"));

for (const card of cards) {
  if (card.kind === "plan") {
    if (!card.priced) fail(`услуга вне прайса: ${String(card.service)}`);
    const nk = priceOf(card.service);
    if (nk !== card.nk) fail(`клиент и сервер считают цену по-разному: ${card.nk} vs ${nk}`);
    console.log(`план: «${card.title}» · ${card.service} · ${formatNK(nk)} (шагов: ${card.steps.length})`);
  }
  if (card.kind === "choice") console.log(`вопрос: ${card.question} → ${card.options.join(" / ")}`);
  if (card.kind === "diagnosis") {
    if (!card.issues.length) fail("карточка diagnosis без проблем");
    console.log(`диагноз: ${card.issues.map((i: any) => `${i.severity}:${i.title}`).join("; ")}`);
  }
}

const leaks = /\b\d+\s*(НК|NK)\b/.test(body);
if (leaks) fail("модель назвала цену в тексте — сумму должен подставлять только прайс");

if (!cards.length) fail("в ответе нет ни одной карточки — формат не соблюдён");
console.log("OK");
