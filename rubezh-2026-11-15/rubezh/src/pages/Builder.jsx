import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Chrome.jsx";
import { useAuth } from "@/lib/AuthContext.jsx";
import { entities } from "@/lib/vibeli.js";
import { CORES, COMPS, PRESETS, EFFECTS, compById, coreById } from "@/lib/builderData.js";
import { makeZip, downloadZip } from "@/lib/zip.js";

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem("rubez_draft") || "null");
    if (saved && CORES.some((c) => c.id === saved.core)) return saved;
  } catch {}
  return { core: "paper", sel: ["vault", "essentials"] };
}

export default function Builder() {
  const { isAuthenticated, login } = useAuth();
  const draft = loadDraft();
  const [core, setCore] = useState(draft.core);
  const [sel, setSel] = useState(Array.isArray(draft.sel) ? draft.sel : []);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const isBlocked = (c) => c.core !== coreById(core).kind;
  const estimate = 5 + sel.length * 1;

  const save = (nextCore, nextSel) => {
    setCore(nextCore);
    setSel(nextSel);
    try {
      localStorage.setItem("rubez_draft", JSON.stringify({ core: nextCore, sel: nextSel }));
    } catch {}
  };

  const comps = useMemo(
    () =>
      COMPS.filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
      ),
    [q]
  );

  const timeEst = useMemo(() => {
    const tmin = Math.ceil((60 + sel.length * 20 + 30) / 60);
    const tmax = Math.ceil((120 + sel.length * 20 + 30) / 60);
    let est = `сборка будет готова через ~${tmin}–${tmax} мин`;
    if (sel.length >= 6) est += " · тяжёлый набор: первый запуск потребует больше памяти";
    return est;
  }, [sel.length]);

  function exportZip() {
    if (!sel.length) {
      toast("Добавьте хотя бы один компонент");
      return;
    }
    const c = coreById(core);
    const manifest = {
      name: `rubez-build-${core}-1214`,
      generated: new Date().toISOString().slice(0, 10),
      core: { id: c.id, name: c.name, kind: c.kind },
      minecraft: "1.21.4",
      estimate_NK: estimate,
      plugins: sel.filter((id) => compById(id)?.type === "plugin").map((id) => compById(id).name),
      mods: sel.filter((id) => compById(id)?.type === "mod").map((id) => compById(id).name),
      note: "Jar-файлы компонентов платформа скачивает с Modrinth/Hangar в Э-2 и сверяет SHA-1. Здесь — плейсхолдеры.",
    };
    const files = [
      { name: "manifest.json", data: JSON.stringify(manifest, null, 2) },
      {
        name: "README.txt",
        data:
          `Сборка «${manifest.name}»\nЯдро: ${c.name}\nКомпоненты: ${manifest.plugins.concat(manifest.mods).join(", ")}\n\n` +
          "Jar-файлы появятся после Э-2: платформа скачает их с Modrinth/Hangar и сверит SHA-1.\nПока это плейсхолдеры с версиями в manifest.json.",
      },
    ];
    sel.forEach((id) => {
      const comp = compById(id);
      if (!comp) return;
      files.push({
        name: (comp.type === "plugin" ? "plugins/" : "mods/") + comp.id + ".jar.placeholder",
        data: `Плейсхолдер. Реальный jar: ${comp.name} (${comp.type})\nБудет скачан платформой в Э-2.`,
      });
    });
    downloadZip(makeZip(files), `rubez-build-${core}-1214.zip`);
    toast("Сборка выгружена: rubez-build-" + core + "-1214.zip");
  }

  async function saveBuild() {
    if (!sel.length) {
      toast("Добавьте хотя бы один компонент");
      return;
    }
    setSaving(true);
    try {
      const c = coreById(core);
      await entities.Build.create({
        title: `rubez-build-${core}-${new Date().toISOString().slice(0, 10)}`,
        core,
        coreName: c.name,
        components: JSON.stringify(sel),
        estimateNK: estimate,
      });
      toast("Сборка сохранена — откройте кабинет, чтобы применить её через агента");
    } catch (e) {
      console.error(e);
      toast("Не удалось сохранить сборку. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell soft>
      <div className="mx-auto max-w-[72rem] px-5 py-8">
        <h2 className="text-3xl font-extrabold">Конструктор сборок</h2>
        <p className="mt-1 max-w-[45rem] text-[var(--muted)]">
          Выберите ядро, плагины и моды — агент проверит совместимость, покажет смету и то, каким будет ваш сервер.
          Готовую сборку выгружаете архивом.
        </p>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1fr_21.25rem]">
          <div>
            <div className="card mb-5">
              <b>Ядро и версия</b>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {CORES.map((c) => (
                  <button
                    key={c.id}
                    className={
                      "rounded-xl border px-4 py-2 transition-colors " +
                      (core === c.id
                        ? "border-[var(--accent)] bg-[rgba(255,123,168,0.14)]"
                        : "border-[var(--line)] bg-[rgba(255,255,255,0.05)] hover:border-[var(--accent)]")
                    }
                    onClick={() => {
                      const k = coreById(c.id).kind;
                      save(c.id, sel.filter((id) => compById(id)?.core === k));
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="mt-3.5 text-[0.82rem] text-[var(--ink-faint)]">
                Paper и Purpur — для плагинов. Fabric и NeoForge — для модов. Смена ядра снимает несовместимые
                компоненты.
              </p>
            </div>

            <div className="card">
              <b>Компоненты</b>
              <input
                className="input mt-3.5"
                placeholder="Поиск: экономика, кланы, мини-игры…"
                value={q}
                onChange={(e) => setQ(e.target.value.toLowerCase())}
                aria-label="Поиск компонентов"
              />
              <div className="mt-3.5">
                {comps.map((c) => {
                  const blocked = isBlocked(c);
                  const on = sel.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={
                        "mb-2 flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3 " +
                        (blocked ? "opacity-45" : "")
                      }
                    >
                      <div className="min-w-0">
                        <b>{c.name}</b>
                        <div className="text-[0.82rem] text-[var(--ink-faint)]">
                          {c.desc}
                          {blocked && " · несовместимо с ядром"}
                        </div>
                      </div>
                      <button
                        className={"btn-p ml-auto shrink-0 !px-3.5 !py-1.5 !text-[0.85rem] " + (on ? "" : "")}
                        disabled={blocked}
                        onClick={() => {
                          save(core, on ? sel.filter((x) => x !== c.id) : [...sel, c.id]);
                        }}
                      >
                        {on ? "✓ выбран" : "добавить"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="card mb-5">
              <b>Предпросмотр: каким будет сервер</b>
              <div className="mt-3.5 rounded-xl border border-[rgba(255,123,168,0.3)] bg-[rgba(255,123,168,0.08)] p-4 text-[0.93rem]">
                Агент поставит <b>{coreById(core).name}</b>: {coreById(core).desc}.
                <ul className="mt-2 ml-4 list-disc text-[var(--muted)]">
                  {(sel.length
                    ? sel.map((id) => {
                        const c = compById(id);
                        return c ? `${c.name} — ${EFFECTS[id] || "установлю и настрою"}` : null;
                      })
                    : ["пока ничего не выбрано — добавьте компоненты слева"]
                  )
                    .filter(Boolean)
                    .map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="card mb-5">
              <b>Смета</b>
              <div className="mt-3.5">
                <div className="flex justify-between border-b border-dashed border-[var(--line)] py-1.5 text-[0.93rem]">
                  <span>Конфигурация агента</span>
                  <b className="text-[var(--gold)]">5 НК</b>
                </div>
                {sel.map((id) => {
                  const c = compById(id);
                  return c ? (
                    <div key={id} className="flex justify-between border-b border-dashed border-[var(--line)] py-1.5 text-[0.93rem]">
                      <span>{c.name}</span>
                      <b className="text-[var(--gold)]">1 НК</b>
                    </div>
                  ) : null;
                })}
                <div className="flex justify-between py-1.5 text-[0.93rem]">
                  <span>Итого</span>
                  <b className="text-[var(--gold)]">{estimate} НК</b>
                </div>
                <div className="flex justify-between border-b border-dashed border-[var(--line)] pb-1.5 text-[0.93rem]">
                  <span>Экспорт сборки</span>
                  <b className="text-[var(--gold)]">0 НК</b>
                </div>
              </div>
              <div className="my-2.5 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full transition-[width] duration-300"
                  style={{ width: Math.min(100, 18 + sel.length * 7) + "%", background: "var(--grad)" }}
                />
              </div>
              <p className="text-[0.82rem] text-[var(--ink-faint)]">{timeEst}</p>
              <div className="mt-3.5 flex gap-2">
                <button className="btn-p flex-1" onClick={exportZip}>
                  Применить и выгрузить
                </button>
                <button className="btn-g" onClick={() => { save("paper", []); toast("Сборка очищена"); }}>
                  Сброс
                </button>
              </div>
              {isAuthenticated ? (
                <button className="btn-g mt-2 w-full" disabled={saving} onClick={saveBuild}>
                  {saving ? "Сохраняем…" : "Сохранить сборку в кабинет"}
                </button>
              ) : (
                <button className="btn-g mt-2 w-full" onClick={() => login(window.location.href)}>
                  Войти, чтобы сохранить сборку
                </button>
              )}
              <p className="mt-3.5 text-[0.82rem] text-[var(--ink-faint)]">
                Экспорт и сохранение бесплатны. Смета списывается в кабинете при подтверждении.
              </p>
            </div>

            <div className="card">
              <b>Пресеты</b>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {Object.keys(PRESETS).map((p) => (
                  <button
                    key={p}
                    className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-4 py-2 transition-colors hover:border-[var(--accent)]"
                    onClick={() => {
                      save(PRESETS[p].core, PRESETS[p].comps.slice());
                      toast("Пресет применён: " + p);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
