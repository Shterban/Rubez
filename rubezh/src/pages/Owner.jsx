import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Chrome.jsx";
import AgentChat from "@/components/AgentChat.jsx";
import { entities } from "@/lib/vibeli.js";

export default function Owner() {
  const [tx, setTx] = useState(null);
  const [events, setEvents] = useState(null);
  const [builds, setBuilds] = useState(null);
  const [dataError, setDataError] = useState("");

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

  const balance = (tx || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const sortedTx = [...(tx || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const sortedEvents = [...(events || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Контекст для агента: что уже было и какие сборки сохранены.
  const buildsCtx = (builds || [])
    .map((b) => {
      let comps = [];
      try {
        comps = JSON.parse(b.components || "[]");
      } catch {}
      return `${b.title} (${b.coreName || b.core}, ${comps.length} компон., ${b.estimateNK} НК)`;
    })
    .join("; ");
  const eventsCtx = sortedEvents.slice(0, 5).map((e) => e.text).join("; ");
  const context = `Журнал последних действий: ${eventsCtx || "пуст"}\nСохранённые сборки: ${buildsCtx || "нет"}\nБаланс: ${balance} НК`;

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
            <span className="mt-1 block text-[0.76rem] text-[var(--ink-faint)]">адрес-пример демо-стенда</span>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <AgentChat balance={balance} onBalanceChange={refresh} context={context} />

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
