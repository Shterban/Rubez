import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Chrome.jsx";
import { entities, VibeliError } from "@/lib/vibeli.js";

const FAV_KEY = "rubez_favs";
function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function Servers() {
  const [servers, setServers] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState("online");
  const [favs, setFavs] = useState(loadFavs);

  useEffect(() => {
    entities.Server.list({ limit: 100 })
      .then((page) => setServers(page.items))
      .catch((e) => {
        console.error(e);
        setError(e instanceof VibeliError ? "Не удалось загрузить серверы. Попробуйте ещё раз." : "Ошибка загрузки.");
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch {}
  }, [favs]);

  const list = useMemo(() => {
    let l = (servers || []).filter(
      (s) => (!q || s.name.toLowerCase().includes(q.toLowerCase())) && (!mode || s.mode === mode)
    );
    l.sort(sort === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => (b.online || 0) - (a.online || 0));
    return l;
  }, [servers, q, mode, sort]);

  const copyAddr = (addr) => {
    const done = () => toast("Адрес скопирован");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(addr).then(done, done);
    else done();
  };

  const toggleFav = (name) => {
    setFavs((f) => {
      const on = f.includes(name);
      toast(on ? "Убрали из избранного" : "Добавлено в избранное");
      return on ? f.filter((x) => x !== name) : [...f, name];
    });
  };

  return (
    <Shell soft>
      <div className="mx-auto max-w-[72rem] px-5 py-8">
        <h2 className="text-3xl font-extrabold">Витрина серверов</h2>
        <p className="mt-1 text-[var(--muted)]">
          Серверы владельцев Рубежа. Клик по адресу — копирование, значок сердца — избранное.
        </p>

        <div className="card mt-6 flex flex-wrap items-center gap-2.5">
          <input
            className="input min-w-[200px] flex-1"
            placeholder="Поиск по названию…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Поиск по названию"
          />
          <select className="select w-auto" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Режим">
            <option value="">Все режимы</option>
            <option value="Выживание">Выживание</option>
            <option value="Скайблок">Скайблок</option>
            <option value="Анархия">Анархия</option>
            <option value="Мини-игры">Мини-игры</option>
          </select>
          <select className="select w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка">
            <option value="online">По онлайну</option>
            <option value="name">По названию</option>
          </select>
        </div>

        {error && (
          <p className="mt-8 rounded-xl border border-[rgba(255,138,138,0.4)] bg-[rgba(255,138,138,0.08)] px-5 py-4 text-[var(--danger)]">
            {error}
          </p>
        )}

        {!error && servers === null && <p className="mt-8 text-[var(--muted)]">Загружаем серверы…</p>}

        {servers !== null && !error && (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const pct = s.maxPlayers ? Math.round((s.online || 0) / s.maxPlayers * 100) : 0;
              const fav = favs.includes(s.name);
              return (
                <div key={s.id} className="card flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <b className="text-lg">{s.name}</b>
                    <button
                      className={"text-xl transition-colors " + (fav ? "text-[var(--accent)]" : "text-[var(--ink-faint)] hover:text-[var(--accent)]")}
                      onClick={() => toggleFav(s.name)}
                      aria-label={fav ? "Убрать из избранного" : "В избранное"}
                      aria-pressed={fav}
                    >
                      ♥
                    </button>
                  </div>
                  <div>
                    <span className="mr-1.5 inline-block rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                      {s.mode}
                    </span>
                    <span className="inline-block rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                      {s.online ?? 0}/{s.maxPlayers ?? "—"} онлайн
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{s.description}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div className="h-full" style={{ width: pct + "%", background: "var(--grad)" }} />
                  </div>
                  <button
                    onClick={() => copyAddr(s.addr)}
                    className="mt-1 w-full cursor-pointer rounded-lg bg-[rgba(255,255,255,0.05)] px-2.5 py-2 text-left font-mono text-[0.85rem] text-[var(--cyan)] hover:bg-[rgba(255,255,255,0.09)]"
                    title="Клик — скопировать"
                  >
                    {s.addr}
                  </button>
                </div>
              );
            })}
            {list.length === 0 && (
              <p className="text-[var(--muted)]">Ничего не нашлось — попробуйте другой фильтр.</p>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
