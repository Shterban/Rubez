import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Chrome.jsx";
import { entities, vibeli } from "@/lib/vibeli.js";
import { analyzeLog } from "@/lib/analyzeLog.js";

const ROLE = `Ты — агент платформы «Рубеж», помощник владельца Minecraft-сервера. Отвечай по-русски, кратко (2–4 предложения), по-деловому.
Правила:
- Любое платное действие сначала оформляй как план со сметой: «Смета: N НК. Подтвердить?». Смета начинается ровно с «Смета: » и числа.
- Типовые расценки: диагностика по логам 1 НК, бэкап мира 1 НК, поднятие памяти 3 НК, установка плагина 2 НК, постройка арены 12 НК, настройка экономики (Vault + Essentials) 4 НК.
- Не выдумывай, что действие уже выполнено: ты только планируешь, выполнение подтверждает владелец.
- Если прислан лог — опиши найденные проблемы и предложи план со сметой.`;

const CHIPS = ["Диагностика", "Бэкап", "Построй арену", "Поставь плагин"];

function extractCost(text) {
  const m = String(text).match(/(\d+)\s*НК/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

export default function Owner() {
  const [tx, setTx] = useState(null);
  const [events, setEvents] = useState(null);
  const [builds, setBuilds] = useState(null);
  const [dataError, setDataError] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Здравствуйте! Я агент вашего сервера. Опишите задачу словами — или прикрепите лог, найду ошибки.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // {name, text, isImage}
  const [confirming, setConfirming] = useState(-1);
  const logRef = useRef(null);

  const refresh = useCallback(() => {
    entities.NkTransaction.list({ limit: 200 })
      .then((p) => setTx(p.items))
      .catch((e) => {
        console.error(e);
        setDataError("Не удалось загрузить данные. Попробуйте обновить страницу.");
      });
    entities.AgentEvent.list({ limit: 50 })
      .then((p) => setEvents(p.items))
      .catch((e) => console.error(e));
    entities.Build.list({ limit: 20 })
      .then((p) => setBuilds(p.items))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, thinking]);

  const balance = (tx || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const sortedTx = [...(tx || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const sortedEvents = [...(events || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  function readFiles(list) {
    Array.from(list || []).forEach((f) => {
      if (/^image\//.test(f.type)) {
        setPendingFiles((p) => [...p, { name: f.name, text: null, isImage: true }]);
        toast(`Картинку «${f.name}» вижу — опишите словами, что на ней (разбор изображений появится позже)`);
        return;
      }
      const r = new FileReader();
      r.onload = () => {
        setPendingFiles((p) => [...p, { name: f.name, text: String(r.result), isImage: false }]);
      };
      r.onerror = () => toast(`Не удалось прочитать «${f.name}»`);
      r.readAsText(f);
    });
  }

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q && !pendingFiles.length) return;
    if (thinking) return;
    setThinking(true);
    const files = pendingFiles;
    setPendingFiles([]);
    setInput("");

    let userText = q;
    const diagnostics = [];
    files.forEach((f) => {
      if (f.isImage) {
        userText += (userText ? "\n" : "") + `[прикреплено изображение «${f.name}»]`;
        return;
      }
      const d = analyzeLog(f.name, f.text || "");
      diagnostics.push(d.summary);
      userText += (userText ? "\n" : "") + `[прикреплён файл «${f.name}»]`;
    });

    const history = [...messages, { role: "user", text: userText }];
    setMessages(history.map((m) => ({ ...m })));

    try {
      const dialog = history
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Пользователь" : "Ассистент"}: ${m.text}`)
        .join("\n");
      const logCtx = files
        .filter((f) => !f.isImage)
        .map((f) => `\n\nФайл «${f.name}» (первые строки):\n${(f.text || "").slice(0, 3000)}`)
        .join("");
      const buildsCtx = (builds || [])
        .map((b) => {
          let comps = [];
          try {
            comps = JSON.parse(b.components || "[]");
          } catch {}
          return `${b.title} (${b.coreName || b.core}, ${comps.length} компон., ${b.estimateNK} НК)`;
        })
        .join("; ");
      const eventsCtx = (sortedEvents || [])
        .slice(0, 5)
        .map((e) => e.text)
        .join("; ");
      const prompt = `${ROLE}\n\nЖурнал последних действий: ${eventsCtx || "пуст"}\nСохранённые сборки: ${buildsCtx || "нет"}${logCtx}\n\n${
        diagnostics.length ? "Предварительный разбор файлов:\n" + diagnostics.join("\n") + "\n\n" : ""
      }${dialog}\nПользователь: ${userText}\nАссистент:`;

      const res = await vibeli.functions.invoke("agentChat", {
        messages: [
          { role: "user", content: prompt },
        ],
      });
      if (!res || !res.ok) {
        const msg =
          res?.error === "key_missing"
            ? "Агент не настроен: ключ Nodul не найден в секретах проекта."
            : res?.error === "auth_failed"
            ? "Ключ Nodul отклонён — проверьте ключ и бюджет в кабинете Nodul Router."
            : res?.error === "rate_limited"
            ? "Слишком много запросов — подождите минуту и повторите."
            : res?.error === "empty_messages"
            ? "Пустой запрос — напишите сообщение агенту."
            : "Агент не ответил (Nodul). Попробуйте ещё раз.";
        console.error("agentChat failed", res);
        setMessages((m) => [...m, { role: "bot", text: msg }]);
        return;
      }
      const answer = String(res.answer || "Не удалось получить ответ. Попробуйте ещё раз.");
      setMessages((m) => [...m, { role: "bot", text: answer, costNK: extractCost(answer) }]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "bot", text: "Агент не ответил. Попробуйте ещё раз." }]);
    } finally {
      setThinking(false);
    }
  }

  async function confirmAction(idx, msg) {
    setConfirming(idx);
    try {
      const res = await vibeli.functions.invoke("applyAgentAction", {
        text: msg.text.slice(0, 300),
        costNK: msg.costNK,
      });
      if (res && res.ok) {
        toast(`Действие подтверждено: списано ${msg.costNK} НК`);
        setMessages((m) => m.map((x, i) => (i === idx ? { ...x, confirmed: true } : x)));
        refresh();
      } else if (res && res.error === "insufficient_funds") {
        toast(`Не хватает НК: на балансе ${res.balance}`);
      } else {
        toast(res && res.error === "unauthenticated" ? "Войдите, чтобы подтвердить" : "Не удалось подтвердить действие");
      }
    } catch (e) {
      console.error(e);
      toast("Не удалось подтвердить действие. Попробуйте ещё раз.");
    } finally {
      setConfirming(-1);
    }
  }

  const timeOf = (d) => {
    const t = new Date(d);
    return isNaN(t) ? "—" : t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Shell soft>
      <div className="mx-auto max-w-[72rem] px-5 py-8">
        <h2 className="text-3xl font-extrabold">Кабинет владельца</h2>
        <p className="mt-1 text-[var(--muted)]">
          Агент в чате, баланс НК и полный журнал его работы. Любое действие — только после вашего подтверждения.
        </p>

        {dataError && (
          <p className="mt-6 rounded-xl border border-[rgba(255,138,138,0.4)] bg-[rgba(255,138,138,0.08)] px-5 py-4 text-[var(--danger)]">
            {dataError}
          </p>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="card">
            <b className="grad-text block text-2xl">{tx === null ? "…" : `${balance} НК`}</b>
            <span className="text-sm text-[var(--muted)]">баланс: тариф + докупка (не сгорает)</span>
          </div>
          <div className="card">
            <b className="block text-2xl">27</b>
            <span className="text-sm text-[var(--muted)]">игроков онлайн сейчас (демо-данные)</span>
          </div>
          <div className="card">
            <b className="block text-lg">«Орхидея» · Paper 1.21.4</b>
            <span className="font-mono text-sm text-[var(--cyan)]">play.rubez.example:25565</span>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          {/* ——— Чат ——— */}
          <div
            className={
              "card flex h-[520px] flex-col p-0 transition-shadow " +
              (dragOver ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(255,123,168,0.35)]" : "")
            }
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer?.files?.length) readFiles(e.dataTransfer.files);
            }}
          >
            <div ref={logRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className={"msg " + m.role}>
                  {m.text}
                  {m.role === "bot" && m.costNK > 0 && !m.confirmed && (
                    <div className="mt-2">
                      <button
                        className="btn-p !px-3.5 !py-1.5 !text-[0.85rem]"
                        disabled={confirming === i}
                        onClick={() => confirmAction(i, m)}
                      >
                        {confirming === i ? "Проводим…" : `Подтвердить и списать ${m.costNK} НК`}
                      </button>
                    </div>
                  )}
                  {m.confirmed && (
                    <div className="mt-2 text-[0.82rem] text-[var(--green)]">✓ Подтверждено, списано в журнал</div>
                  )}
                </div>
              ))}
              {pendingFiles.map((f, i) => (
                <span
                  key={i}
                  className="self-start rounded-[10px] border border-[rgba(127,216,255,0.3)] bg-[rgba(127,216,255,0.1)] px-2.5 py-1 text-[0.8rem]"
                >
                  {f.isImage ? "🖼" : "📄"} {f.name} · прикреплён к следующему сообщению
                </span>
              ))}
              {thinking && <div className="msg bot">Печатает…</div>}
            </div>
            <div className="flex flex-wrap gap-2 px-3 pb-2.5">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3.5 py-1.5 text-[0.84rem] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  onClick={() => send(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[var(--line)] p-3">
              <label
                className="relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 text-lg text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                title="Прикрепить лог или конфиг (.log, .txt, .json, .yml, .properties)"
              >
                📎
                <input
                  type="file"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  multiple
                  accept=".log,.txt,.json,.yml,.yaml,.properties,.cfg"
                  onChange={(e) => {
                    if (e.target.files?.length) readFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                className="input flex-1"
                placeholder="Напишите агенту… или перетащите файлы сюда"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={thinking}
              />
              <button className="btn-p shrink-0" onClick={() => send()} disabled={thinking}>
                Отправить
              </button>
            </div>
          </div>

          {/* ——— Правая колонка ——— */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <b>Онлайн за 24 часа</b>{" "}
              <span className="text-[0.8rem] text-[var(--ink-faint)]">демо-данные</span>
              <svg viewBox="0 0 320 90" className="mt-2 w-full" role="img" aria-label="График онлайна за сутки (демо)">
                <polyline
                  className="drop-shadow-[0_0_6px_rgba(255,123,168,0.5)]"
                  points="0,78 22,74 44,70 66,60 88,52 110,40 132,34 154,30 176,26 198,22 220,25 242,30 264,38 286,48 308,60 320,66"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  fill="none"
                />
                <polyline
                  points="0,90 320,90 320,66 308,60 286,48 264,38 242,30 220,25 198,22 176,26 154,30 132,34 110,40 88,52 66,60 44,70 22,74 0,78"
                  fill="rgba(255,123,168,0.12)"
                  stroke="none"
                />
              </svg>
              <p className="text-[0.82rem] text-[var(--ink-faint)]">Пик: 21:40 — 42 игрока · Сейчас: 27</p>
            </div>

            <div className="card">
              <b>Журнал агента</b>
              <ul className="relative mt-3.5 list-none pl-6">
                {sortedEvents.map((e) => (
                  <li key={e.id} className="relative py-2.5">
                    <span
                      className="absolute -left-[18px] top-4 h-3 w-3 rounded-full"
                      style={{
                        background:
                          e.status === "done" ? "var(--green)" : e.status === "pending" ? "var(--gold)" : "var(--danger)",
                      }}
                    />
                    <span className="mr-2 text-[0.8rem] text-[var(--ink-faint)]">{timeOf(e.created_date)}</span>
                    {e.text}
                    {e.costNK ? <span className="ml-2 text-[0.84rem] text-[var(--gold)]">−{e.costNK} НК</span> : null}
                  </li>
                ))}
                {sortedEvents.length === 0 && (
                  <li className="text-sm text-[var(--muted)]">Журнал пуст — подтвердите первое действие агента.</li>
                )}
              </ul>
            </div>

            <div className="card">
              <b>История НК</b>
              <div className="mt-3">
                {sortedTx.map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between gap-3 border-b border-dashed border-[var(--line)] py-1.5 text-[0.9rem] last:border-0"
                  >
                    <span className="text-[var(--muted)]">{t.reason}</span>
                    <b className={t.amount >= 0 ? "text-[var(--green)]" : "text-[var(--gold)]"}>
                      {t.amount >= 0 ? "+" : ""}
                      {t.amount} НК
                    </b>
                  </div>
                ))}
                {tx === null && <p className="text-sm text-[var(--muted)]">Загрузка…</p>}
              </div>
            </div>

            {builds !== null && builds.length > 0 && (
              <div className="card">
                <b>Сохранённые сборки</b>
                <div className="mt-3">
                  {builds.map((b) => {
                    let comps = [];
                    try {
                      comps = JSON.parse(b.components || "[]");
                    } catch {}
                    return (
                      <div
                        key={b.id}
                        className="mb-2 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5 text-[0.9rem]"
                      >
                        <b>{b.title}</b>
                        <div className="text-[0.82rem] text-[var(--muted)]">
                          {b.coreName || b.core} · {comps.length} компонент(ов) · смета {b.estimateNK} НК
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
