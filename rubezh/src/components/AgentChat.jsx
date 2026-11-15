// Чат с агентом: размышление шагами, живые действия и карточки-предложения.
//
// Три состояния, которые видит владелец:
//   1. «Размышляет» — список шагов с реальными статусами (что прочитано,
//      что найдено), а не бесконечный спиннер.
//   2. «Отвечает» — текст печатается, его можно прервать.
//   3. «Предлагает карточку» — план со сметой, уточнение варианта или разбор
//      лога. Платные действия — только через карточку и только по прайсу
//      из agentPricing.js (цену нельзя «уговорить» текстом).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { vibeli } from "@/lib/vibeli.js";
import { analyzeLog } from "@/lib/analyzeLog.js";
import { formatNK, parseCards } from "@/lib/agentPricing.js";

const CHIPS = ["Диагностика", "Бэкап", "Построй арену", "Поставь плагин"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

/* ——— Шаги размышления ——— */
function ThinkingPanel({ steps }) {
  if (!steps.length) return null;
  return (
    <div className="agent-think" role="status" aria-live="polite">
      <div className="agent-think-head">
        <span className="agent-pulse" aria-hidden="true" />
        Агент размышляет
      </div>
      <ul className="agent-steps">
        {steps.map((s) => (
          <li key={s.id} className={"agent-step " + s.status}>
            <span className="agent-step-icon" aria-hidden="true">
              {s.status === "done" ? "✓" : s.status === "run" ? "◐" : s.status === "error" ? "✕" : "○"}
            </span>
            <span className="agent-step-label">{s.label}</span>
            {s.detail && <span className="agent-step-detail">{s.detail}</span>}
            <span className="sr-only">
              {s.status === "done" ? "готово" : s.status === "run" ? "выполняется" : "ожидает"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ——— Карточки ——— */
function PlanCard({ card, balance, state, busy, onConfirm, onEdit, onReject, onAsk }) {
  const after = balance - card.nk;
  const short = card.nk > 0 && after < 0;
  return (
    <section className={"agent-card plan " + (state || "open")} aria-label={"План: " + card.title}>
      <header className="agent-card-head">
        <span className="agent-tag">План</span>
        <h4>{card.title}</h4>
        {card.priced ? (
          <span className="agent-price">{formatNK(card.nk)}</span>
        ) : (
          <span className="agent-price muted">цена по запросу</span>
        )}
      </header>
      {card.summary && <p className="agent-card-sub">{card.summary}</p>}
      {card.steps.length > 0 && (
        <ol className="agent-card-steps">
          {card.steps.map((s, i) => (
            <li key={i}>
              <span aria-hidden="true">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      {card.notes && <p className="agent-card-note">Не входит: {card.notes}</p>}
      <div className="agent-card-meta">
        {card.eta && <span>≈ {card.eta}</span>}
        {card.priced && <span>баланс после: {after} НК</span>}
      </div>
      {state === "done" ? (
        <p className="agent-receipt">✓ Подтверждено, {formatNK(card.nk)} списаны в журнал</p>
      ) : state === "rejected" ? (
        <p className="agent-rejected">План отклонён — ничего не списано</p>
      ) : (
        <div className="agent-actions">
          {card.priced ? (
            <button className="btn-p !py-2 !px-4" disabled={busy || short} onClick={onConfirm}>
              {busy ? "Проводим…" : short ? `Не хватает ${-after} НК` : `Подтвердить · ${card.nk} НК`}
            </button>
          ) : (
            <button className="btn-g !py-2 !px-4" onClick={onAsk}>
              Обсудить смету
            </button>
          )}
          <button className="btn-g !py-2 !px-4" disabled={busy} onClick={onEdit}>
            Изменить
          </button>
          <button className="agent-link" disabled={busy} onClick={onReject}>
            Отклонить
          </button>
        </div>
      )}
    </section>
  );
}

function ChoiceCard({ card, onPick }) {
  return (
    <section className="agent-card choice" aria-label={card.question}>
      <header className="agent-card-head">
        <span className="agent-tag cyan">Уточнение</span>
        <h4>{card.question}</h4>
      </header>
      <div className="agent-options">
        {card.options.map((o) => (
          <button key={o} className="btn-g !py-2 !px-3.5 !text-[0.86rem]" onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </section>
  );
}

function DiagnosisCard({ card, onPlan }) {
  const label = { high: "критично", medium: "средне", low: "мелочь" };
  return (
    <section className="agent-card diag" aria-label="Разбор лога">
      <header className="agent-card-head">
        <span className="agent-tag gold">Разбор</span>
        <h4>Найдено {card.issues.length} проблем(ы)</h4>
      </header>
      <ul className="agent-issues">
        {card.issues.map((i, k) => (
          <li key={k} className={"sev-" + i.severity}>
            <b>
              <span className="sev-dot" aria-hidden="true" /> {i.title}
            </b>
            <span className="sr-only">— {label[i.severity]}</span>
            {i.cause && <p>Причина: {i.cause}</p>}
            {i.fix && <p>Что делать: {i.fix}</p>}
          </li>
        ))}
      </ul>
      <div className="agent-actions">
        <button className="btn-g !py-2 !px-4" onClick={onPlan}>
          Предложить план исправления
        </button>
      </div>
    </section>
  );
}

export default function AgentChat({ balance = 0, onBalanceChange, context = "" }) {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState([
    {
      id: "hello",
      role: "bot",
      text: "Здравствуйте! Я агент вашего сервера. Опишите задачу словами — или прикрепите лог, найду ошибки. Любое платное действие я сначала покажу карточкой со сметой.",
      shown: Infinity,
    },
  ]);
  const [steps, setSteps] = useState([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const logRef = useRef(null);
  const busyRef = useRef(false);
  const stepSeq = useRef(0);
  const localBalance = useRef(balance);
  localBalance.current = balance;

  /* печать ответа: +4 символа каждые 16 мс, при reduce-motion — сразу */
  useEffect(() => {
    const pending = messages.some((m) => typeof m.shown === "number" && m.shown < (m.text || "").length);
    if (!pending) return;
    const t = setInterval(() => {
      setMessages((ms) =>
        ms.map((m) =>
          typeof m.shown === "number" && m.shown < (m.text || "").length
            ? { ...m, shown: Math.min((m.text || "").length, m.shown + 4) }
            : m
        )
      );
    }, 16);
    return () => clearInterval(t);
  }, [messages]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, steps]);

  const addStep = useCallback((label, detail) => {
    const id = ++stepSeq.current;
    setSteps((s) => [...s, { id, label, detail, status: "run" }]);
    return id;
  }, []);
  const doneStep = useCallback((id, detail, status = "done") => {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, status, detail: detail ?? x.detail } : x)));
  }, []);

  const readFiles = (list) => {
    Array.from(list || []).forEach((f) => {
      if (/^image\//.test(f.type)) {
        setPendingFiles((p) => [...p, { name: f.name, text: null, isImage: true }]);
        toast(`Картинку «${f.name}» вижу — опишите словами, что на ней (разбор изображений появится позже)`);
        return;
      }
      const r = new FileReader();
      r.onload = () => setPendingFiles((p) => [...p, { name: f.name, text: String(r.result), isImage: false }]);
      r.onerror = () => toast(`Не удалось прочитать «${f.name}»`);
      r.readAsText(f);
    });
  };

  function patchMessage(id, patch) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function send(text, filesArg) {
    if (busyRef.current) return;
    const q = String(text ?? input).trim();
    const files = filesArg ?? pendingFiles;
    if (!q && !files.length) return;
    busyRef.current = true;
    setBusy(true);
    setInput("");
    setPendingFiles([]);
    setSteps([]);

    let userText = q;
    files.forEach((f) => {
      userText += (userText ? "\n" : "") + `[прикреплён файл «${f.name}»]`;
    });

    setMessages((ms) => [...ms, { id: "u" + Date.now(), role: "user", text: userText, shown: Infinity }]);

    try {
      /* ——— шаг 1: понял задачу ——— */
      const s1 = addStep("Понял задачу", q ? q.slice(0, 90) : "только файлы");
      await wait(reduce ? 0 : 260);
      doneStep(s1);

      /* ——— шаг 2: реальный разбор файлов в браузере ——— */
      let localNote = "";
      for (const f of files) {
        if (f.isImage) {
          const si = addStep(`Смотрю «${f.name}»`, "изображение");
          await wait(reduce ? 0 : 220);
          doneStep(si, "передам текст запроса");
          continue;
        }
        const sf = addStep(`Читаю «${f.name}»`);
        await wait(reduce ? 0 : 220);
        const d = analyzeLog(f.name, f.text || "");
        doneStep(sf, d.problems ? `${d.problems} проблемных строк` : "явных ошибок нет");
        localNote += (localNote ? "\n" : "") + d.summary;
      }

      /* ——— шаг 3: контекст кабинета ——— */
      const s3 = addStep("Смотрю журнал и сборки");
      await wait(reduce ? 0 : 320);
      doneStep(s3);

      /* ——— шаг 4: запрос к модели ——— */
      const s4 = addStep("Думаю над планом", "цена — из прайса, не из текста");
      const startedAt = Date.now();

      const dialog = [...messages, { role: "user", text: userText }]
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Пользователь" : "Ассистент"}: ${m.text}`)
        .join("\n");
      const fullContext = [context, localNote && "Разбор файлов:\n" + localNote].filter(Boolean).join("\n\n");

      const res = await vibeli.functions.invoke("agentChat", {
        messages: [{ role: "user", content: dialog + "\nПользователь: " + userText + "\nАссистент:" }],
        context: fullContext,
      });

      doneStep(s4, res && res.ok ? "план готов" : "ответа нет", res && res.ok ? "done" : "error");

      if (!res || !res.ok) {
        const msg =
          res?.error === "key_missing"
            ? "Агент не настроен: ключ Nodul не найден в секретах проекта."
            : res?.error === "auth_failed"
            ? "Ключ Nodul отклонён — проверьте ключ и бюджет в кабинете Nodul Router."
            : res?.error === "rate_limited"
            ? "Слишком много запросов — подождите минуту и повторите."
            : "Агент не ответил (Nodul). Попробуйте ещё раз.";
        setMessages((ms) => [...ms, { id: "b" + Date.now(), role: "bot", text: msg, shown: Infinity }]);
        return;
      }

      const parsed = parseCards(res.answer || "");
      // Сумму берём из ответа сервера (там прайс — источник истины).
      const cards = parsed.cards.map((c) =>
        c.kind === "plan" && c.service && res.prices?.[c.service]
          ? { ...c, nk: res.prices[c.service].nk, priced: true }
          : c
      );
      const body = parsed.body;
      setMessages((ms) => [
        ...ms,
        {
          id: "b" + Date.now(),
          role: "bot",
          text: body || "Готово — смотрите карточку ниже.",
          cards,
          shown: reduce ? Infinity : 0,
        },
      ]);
      // луч надежды: задержка, чтобы шаги не мигали в конце
      await wait(minDelay(startedAt, 900));
    } catch (e) {
      console.error(e);
      setMessages((ms) => [
        ...ms,
        { id: "e" + Date.now(), role: "bot", text: "Агент не ответил. Попробуйте ещё раз.", shown: Infinity },
      ]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function confirmPlan(msgId, card) {
    if (confirming) return;
    setConfirming(msgId);
    try {
      const clientRef = crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
      const res = await vibeli.functions.invoke("applyAgentAction", {
        service: card.service,
        text: card.title,
        clientRef,
      });
      if (res && res.ok) {
        patchMessage(msgId, { cardState: "done" });
        toast(`Действие подтверждено: списано ${card.nk} НК`);
        if (typeof res.balance === "number") onBalanceChange?.(res.balance);
        setMessages((ms) => [
          ...ms,
          {
            id: "r" + Date.now(),
            role: "bot",
            text: `Записал в журнал: «${card.title}», −${card.nk} НК. Остаток — ${res.balance ?? "—"} НК.`,
            shown: Infinity,
          },
        ]);
      } else if (res && res.error === "insufficient_funds") {
        toast(`Не хватает НК: на балансе ${res.balance}`);
      } else if (res && res.error === "already_applied") {
        patchMessage(msgId, { cardState: "done" });
        toast("Это действие уже подтверждено — повторно не списываю");
      } else {
        toast(res && res.error === "unauthenticated" ? "Войдите, чтобы подтвердить" : "Не удалось подтвердить действие");
      }
    } catch (e) {
      console.error(e);
      toast("Не удалось подтвердить действие. Попробуйте ещё раз.");
    } finally {
      setConfirming(null);
    }
  }

  const composerDisabled = busy || !(input.trim() || pendingFiles.length);

  return (
    <div
      className={"agent-chat card flex flex-col p-0 " + (dragOver ? "drop" : "")}
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
      <div className="agent-head">
        <div>
          <b>Агент «Рубеж»</b>
          <span className="agent-status-dot" aria-hidden="true" /> <span className="text-[0.82rem] text-[var(--muted)]">на связи</span>
        </div>
        <span className="agent-balance">{balance} НК</span>
      </div>

      <div ref={logRef} className="agent-log">
        {messages.map((m) => {
          const shownText = typeof m.shown === "number" ? (m.text || "").slice(0, m.shown) : m.text;
          const typing = typeof m.shown === "number" && m.shown < (m.text || "").length;
          return (
            <div key={m.id} className="agent-row">
              <div className={"msg " + m.role}>
                {shownText}
                {typing && <span className="agent-caret" aria-hidden="true" />}
              </div>
              {(m.cards || []).map((c, i) =>
                c.kind === "plan" ? (
                  <PlanCard
                    key={i}
                    card={c}
                    balance={balance}
                    state={m.cardState}
                    busy={confirming === m.id}
                    onConfirm={() => confirmPlan(m.id, c)}
                    onEdit={() => setInput(`Измени план «${c.title}»: `)}
                    onReject={() => patchMessage(m.id, { cardState: "rejected" })}
                    onAsk={() => send(`Сколько будет стоить: ${c.title}?`)}
                  />
                ) : c.kind === "choice" ? (
                  <ChoiceCard key={i} card={c} onPick={(o) => send(o)} />
                ) : (
                  <DiagnosisCard key={i} card={c} onPlan={() => send("Предложи план исправления по найденным проблемам")} />
                )
              )}
            </div>
          );
        })}
        <ThinkingPanel steps={steps} />
        {pendingFiles.map((f, i) => (
          <span key={i} className="agent-attach">
            {f.isImage ? "🖼" : "📄"} {f.name} · уйдёт со следующим сообщением
          </span>
        ))}
      </div>

      <div className="agent-chips">
        {CHIPS.map((c) => (
          <button key={c} className="agent-chip" onClick={() => send(c)} disabled={busy}>
            {c}
          </button>
        ))}
      </div>

      <div className="agent-composer">
        <label
          className="agent-clip"
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
          placeholder="Напишите агенту… или перетащите логи"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!composerDisabled) send();
            }
          }}
          disabled={busy}
          aria-label="Сообщение агенту"
        />
        <button className="btn-p shrink-0" onClick={() => send()} disabled={composerDisabled}>
          {busy ? "Работаю…" : "Отправить"}
        </button>
      </div>
      <p className="agent-footnote">
        Агент планирует — вы подтверждаете. Цена берётся из прайса платформы, а не из текста ответа.
      </p>
    </div>
  );
}

function minDelay(startedAt, ms) {
  const left = ms - (Date.now() - startedAt);
  return left > 0 ? left : 0;
}
