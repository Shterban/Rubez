import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Shell, Reveal } from "@/components/Chrome.jsx";
import { useAuth } from "@/lib/AuthContext.jsx";
import { SERVICES } from "@/lib/agentPricing.js";

/* ————————————————————————————————————————————————
   Демо-диалог в первом экране.

   Правила, из-за которых он переписан:
   • ни одного пустого состояния — первая реплика появляется сразу,
     «печатает» показывается индикатором, а не пустым блоком;
   • бот сначала думает (три точки), потом печатает — как живой;
   • карточка-план появляется по шагам, а не разом;
   • prefers-reduced-motion — статичная готовая сцена без таймеров;
   • у контейнера фиксированная высота, поэтому секция не «прыгает» (CLS).
   ———————————————————————————————————————————————— */

const SCENES = [
  [
    { role: "user", text: "Лагает после 30 игроков, вот лог" },
    { role: "bot", text: "Разобрал лог: 4 раза OutOfMemoryError и 12 «Can’t keep up!». Причина — лимит памяти 2 ГБ." },
    { role: "plan", title: "Поднять память до 4 ГБ", nk: SERVICES.memory.nk, steps: 3 },
  ],
  [
    { role: "user", text: "Нужна арена для PvP на 16 игроков" },
    { role: "bot", text: "Понял: площадка 24×24, две трибуны, факелы по периметру. Собрал план — проверьте смету." },
    { role: "plan", title: "Арена PvP 16 игроков", nk: SERVICES.arena.nk, steps: 3 },
  ],
  [
    { role: "user", text: "Собери выживание с экономикой и кланами" },
    { role: "bot", text: "Беру Paper 1.21.4. Vault + Essentials + SimpleClans совместимы. План готов." },
    { role: "plan", title: "Выживание: экономика и кланы", nk: SERVICES.economy.nk, steps: 3 },
  ],
];

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

function AgentScene() {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (reduce) {
      setLines(SCENES[0].map((l) => ({ ...l, done: true })));
      return;
    }
    let alive = true;
    const pending = new Set();
    const sleep = (ms) =>
      new Promise((res) => {
        const id = setTimeout(() => {
          pending.delete(res);
          res();
        }, ms);
        pending.add(() => {
          clearTimeout(id);
          res();
        });
      });

    (async () => {
      let si = 0;
      while (alive) {
        const scene = SCENES[si % SCENES.length];
        setLines([]);
        for (const line of scene) {
          if (!alive) return;
          if (line.role === "bot") {
            setThinking(true);
            await sleep(900);
            setThinking(false);
            if (!alive) return;
          }
          const key = line.role + si;
          if (line.role === "plan") {
            setLines((m) => [...m, { ...line, key, visible: true }]);
            await sleep(1500);
            continue;
          }
          setLines((m) => [...m, { ...line, key, shown: 0 }]);
          for (let i = 2; i <= line.text.length + 1; i += 2) {
            if (!alive) return;
            const n = Math.min(i, line.text.length);
            setLines((m) => m.map((x) => (x.key === key ? { ...x, shown: n } : x)));
            await sleep(16);
          }
          await sleep(line.role === "user" ? 420 : 1250);
        }
        await sleep(2400);
        si++;
      }
    })();

    return () => {
      alive = false;
      pending.forEach((r) => r());
      pending.clear();
    };
  }, [reduce]);

  return (
    <div className="flex h-[344px] flex-col justify-end gap-2.5 overflow-hidden px-5 pb-4" aria-live="polite">
      {lines.map((l) =>
        l.role === "plan" ? (
          <div key={l.key} className="hero-plan">
            <div className="hero-plan-head">
              <span className="agent-tag">План</span>
              <b>{l.title}</b>
              <span className="agent-price">{l.nk} НК</span>
            </div>
            <div className="hero-plan-steps">{l.steps} шага · ≈ 2 минуты</div>
            <span className="hero-plan-btn">Подтвердить · {l.nk} НК</span>
          </div>
        ) : (
          <div key={l.key} className={"msg " + l.role}>
            {l.text.slice(0, l.shown ?? l.text.length)}
          </div>
        )
      )}
      {thinking && (
        <div className="msg bot agent-dots" aria-label="Агент печатает">
          <span /> <span /> <span />
        </div>
      )}
      {!lines.length && (
        <div className="msg user">Хочу сервер для друзей — с экономикой и кланами</div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    tab: "Сборки",
    lead: "Сборки из плагинов и модов.",
    body: "В конструкторе выберите ядро — Paper, Purpur, Fabric или NeoForge — и компоненты. Агент проверит совместимость версий и соберёт архив с манифестом: его можно поставить на любой хостинг.",
  },
  {
    tab: "Диагностика",
    lead: "Диагностика по логам.",
    body: "Прикрепите лог прямо в чат — агент найдёт ошибки, назовёт причины лагов и предложит исправление карточкой со сметой. Память, кривой плагин, таймауты — его язык.",
  },
  {
    tab: "Планы и смета",
    lead: "Смета до действия, журнал после.",
    body: "Каждое платное действие — карточка: что будет сделано, сколько шагов, что не входит и сколько НК. Вы подтверждаете — агент списывает и пишет в журнал. Цены фиксированы прайсом платформы.",
  },
  {
    tab: "Постройки",
    lead: "Постройки и события — в планах.",
    body: "«Построй арену для PvP на 16 игроков» — агент разложит задачу на шаги, покажет смету и выполнит её после подтверждения. Декор спавна, ивенты, лавки — по описанию словами.",
  },
];

const FAQ = [
  {
    q: "Что такое НК?",
    a: "НК — внутренняя единица платформы. Тариф начисляет её каждый месяц, израсходованное восполняется докупкой, докупка не сгорает. Агент списывает НК только за действия из прайса: диагностика 1 НК, бэкап 1 НК, память 3 НК, плагин 2 НК, экономика 4 НК, постройка арены 12 НК.",
  },
  {
    q: "Агент что-то делает без моего согласия?",
    a: "Нет. Любое платное действие сначала приходит карточкой со сметой, и только после кнопки «Подтвердить» списываются НК. Всё, что агент сделал, видно в журнале с ценой и временем.",
  },
  {
    q: "Сервер действительно поднимается сам?",
    a: "Пока нет — и мы говорим об этом прямо. Сейчас работают агент в кабинете, разбор логов, конструктор сборок с выгрузкой архива и планирование со сметой. Автоматический запуск серверов, скачивание jar-файлов и постройки в мире — следующий этап (Э-2). Тарифы до его запуска дают НК и инструменты, а не готовый сервер.",
  },
  {
    q: "Можно выгрузить сборку и уйти?",
    a: "Да. Собранная в конструкторе сборка выгружается архивом с manifest.json и структурой plugins/mods. Ничего не блокируем.",
  },
  {
    q: "Где живут мои логи, когда я их прикрепляю?",
    a: "Файл читается локально в браузере. В модель уходит только текст вашего запроса и фрагмент файла, который нужен для ответа. Мы не храним логи и не используем их ни для чего, кроме ответа.",
  },
  {
    q: "Сколько стоит НК в рублях?",
    a: "Тариф указан в НК; стоимость пакета НК в рублях фиксируется на странице докупки в кабинете — курс не «плавает» внутри оплаченного пакета. Перед оплатой вы видите точную сумму в рублях.",
  },
];

const PLANS = [
  {
    name: "Старт",
    price: "350",
    best: false,
    items: ["До 350 НК в месяц", "Разбор логов", "Сборки из каталога", "Журнал действий агента"],
  },
  {
    name: "Комьюнити",
    price: "1200",
    best: true,
    items: ["До 1 200 НК в месяц", "Планы построек и ивентов", "Приоритет ответа агента", "Экспорт сборок без лимита"],
  },
  {
    name: "Сеть",
    price: "3500",
    best: false,
    items: ["До 3 500 НК в месяц", "Несколько сборок и лобби", "Кастомные конфиги", "Отчёты по онлайну"],
  },
];

export default function Home() {
  const { isOwner, login } = useAuth();
  const [tab, setTab] = useState(0);
  const [faqOpen, setFaqOpen] = useState(-1);

  const goCabinet = () => {
    if (isOwner) window.location.assign("/owner");
    else login(window.location.href);
  };

  return (
    <Shell>
      <section className="flex min-h-[88vh] items-center px-5 py-14">
        <div className="mx-auto grid w-full max-w-[72rem] items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="mb-4 inline-block rounded-full border border-[rgba(255,208,138,0.35)] px-3.5 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              AI-агент для владельцев серверов
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.12] sm:text-5xl">
              Опишите сервер словами — <span className="grad-text">агент соберёт план и смету</span>
            </h1>
            <p className="mt-4 max-w-[35rem] text-lg text-[var(--muted)]">
              Рубеж — платформа для владельцев Minecraft-серверов с живым агентом: собирает сборки из плагинов и
              модов, чинит лаги по логам, планирует постройки. Каждое платное действие — карточкой со сметой,
              каждое списание — в журнале.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="btn-p" onClick={goCabinet}>
                Попробовать агента
              </button>
              <Link to="/builder" className="btn-g">
                Собрать сборку
              </Link>
            </div>
            <p className="mt-3 text-[0.86rem] text-[var(--ink-soft)]">
              Вход через Telegram · конструктор сборок бесплатный
            </p>
          </div>
          <div className="card">
            <AgentScene />
            <p className="pb-2 pt-1 text-center text-[0.86rem] text-[var(--ink-soft)]">
              демо-диалог — так это выглядит в кабинете
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[72rem] px-5">
        <Reveal className="grid grid-cols-2 gap-4 border-y border-[var(--line)] py-6 md:grid-cols-4">
          {[
            ["4 ядра", "Paper · Purpur · Fabric · NeoForge"],
            ["1 НК", "диагностика по логам"],
            ["6 услуг", "фиксированный прайс в НК"],
            ["1 фраза", "до плана со сметой"],
          ].map(([b, s]) => (
            <div key={s}>
              <b className="grad-text block text-2xl">{b}</b>
              <span className="text-sm text-[var(--muted)]">{s}</span>
            </div>
          ))}
        </Reveal>
      </div>

      <section className="mx-auto max-w-[72rem] px-5 py-16" id="status">
        <Reveal className="grid gap-5 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-extrabold">Работает сейчас</h2>
            <ul className="mt-3 flex flex-col gap-2 text-[0.95rem] text-[var(--muted)]">
              {[
                "Агент в кабинете: отвечает, разбирает логи, планирует",
                "Смета карточкой и подтверждение перед списанием НК",
                "Журнал действий и история НК",
                "Конструктор сборок с проверкой совместимости",
                "Выгрузка сборки архивом с manifest.json",
              ].map((t) => (
                <li key={t} className="before:mr-2 before:text-[var(--green)] before:content-['✓']">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="text-xl font-extrabold">Следующий этап (Э-2)</h2>
            <ul className="mt-3 flex flex-col gap-2 text-[0.95rem] text-[var(--muted)]">
              {[
                "Автоматический запуск серверов и адрес для игроков",
                "Скачивание jar с Modrinth и Hangar со сверкой SHA-1",
                "Постройки и ивенты внутри мира",
                "Разбор скриншотов в чате",
              ].map((t) => (
                <li key={t} className="before:mr-2 before:text-[var(--gold)] before:content-['◐']">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.86rem] text-[var(--ink-soft)]">
              Пока этап не вышел, тарифы дают НК и инструменты — а не готовый сервер.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[72rem] px-5 py-16" id="how">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Как агент думает</h2>
          <p className="mb-9 mt-1 max-w-[45rem] text-[var(--muted)]">
            Три состояния, которые вы видите в чате: размышление шагами, карточка-предложение и запись в журнале.
          </p>
        </Reveal>
        <Reveal className="grid gap-5 md:grid-cols-3">
          <div className="card">
            <b className="block">1 · Размышляет шагами</b>
            <div className="mock-think mt-3">
              {[
                ["done", "Понял задачу"],
                ["done", "Читаю «latest.log»"],
                ["run", "Смотрю журнал и сборки"],
                ["idle", "Готовлю план"],
              ].map(([s, t]) => (
                <div key={t} className={"mock-step " + s}>
                  <span>{s === "done" ? "✓" : s === "run" ? "◐" : "○"}</span>
                  {t}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Видно, что именно происходит: файл прочитан, найдено 4 проблемы. Никаких «загрузка…» на минуту.
            </p>
          </div>
          <div className="card">
            <b className="block">2 · Предлагает карточку</b>
            <div className="hero-plan mt-3">
              <div className="hero-plan-head">
                <span className="agent-tag">План</span>
                <b>Поднять память до 4 ГБ</b>
              </div>
              <div className="hero-plan-steps">3 шага · ≈ 2 минуты · не входит: перезапуск лобби</div>
              <div className="hero-plan-actions">
                <span className="hero-plan-btn">Подтвердить · 3 НК</span>
                <span className="hero-plan-ghost">Изменить</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              В карточке — шаги, срок, что не входит и цена. Сумму подставляет прайс платформы, а не текст модели.
            </p>
          </div>
          <div className="card">
            <b className="block">3 · Пишет в журнал</b>
            <div className="mock-journal mt-3">
              <div>
                <span className="dot done" /> 14:22 · Поднять память
                <em>−3 НК</em>
              </div>
              <div>
                <span className="dot done" /> 14:05 · Диагностика latest.log
                <em>−1 НК</em>
              </div>
              <div>
                <span className="dot pending" /> 13:58 · Ждёт подтверждения
                <em />
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Каждое списание — строка с временем и ценой. Баланс НК пересчитывается из журнала, вручную его не
              подкрутить.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[72rem] px-5 py-16" id="features">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Возможности</h2>
          <p className="mb-6 mt-1 max-w-[45rem] text-[var(--muted)]">
            Агент работает как команда: админ, билдер и саппорт в одном чате.
          </p>
        </Reveal>
        <Reveal>
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Возможности">
            {FEATURES.map((f, i) => (
              <button
                key={f.tab}
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={
                  "min-h-[44px] rounded-full border px-4 py-2 text-sm transition-colors " +
                  (tab === i
                    ? "border-[var(--accent)] bg-[rgba(255,123,168,0.15)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[rgba(255,255,255,0.05)] text-[var(--muted)] hover:text-[var(--ink)]")
                }
              >
                {f.tab}
              </button>
            ))}
          </div>
          <div className="card" role="tabpanel">
            <b>{FEATURES[tab].lead}</b>{" "}
            <span className="text-[var(--muted)]">{FEATURES[tab].body}</span>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[72rem] px-5 py-16" id="tariffs">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Тарифы в НК</h2>
          <p className="mb-9 mt-1 max-w-[45rem] text-[var(--muted)]">
            НК начисляются ежемесячно, докупаются пакетом и не сгорают. Стоимость пакета в рублях — на странице
            докупки, до оплаты.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <Reveal
              key={p.name}
              className={
                "card relative flex flex-col gap-2.5 " +
                (p.best ? "shadow-[0_0_0_1px_var(--accent),0_18px_48px_rgba(0,0,0,0.45)]" : "")
              }
            >
              {p.best && (
                <span
                  className="absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-extrabold"
                  style={{ background: "var(--grad)", color: "#1a0d14" }}
                >
                  Выбор владельцев
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="text-3xl font-extrabold">
                {p.price} <small className="text-sm font-normal text-[var(--muted)]">НК / месяц</small>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm text-[var(--muted)]">
                {p.items.map((it) => (
                  <li key={it} className="before:mr-2 before:text-[var(--green)] before:content-['✓']">
                    {it}
                  </li>
                ))}
              </ul>
              <button className={"mt-2 " + (p.best ? "btn-p" : "btn-g")} onClick={goCabinet}>
                {p.best ? "Выбрать" : "Начать"}
              </button>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-[0.86rem] text-[var(--ink-soft)]">
          Хостинг серверов и автозапуск — этап Э-2. До его выхода тариф даёт НК, агента, конструктор и разбор логов.
        </p>
      </section>

      <section className="mx-auto max-w-[51.25rem] px-5 py-16" id="faq">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Вопросы</h2>
        </Reveal>
        <Reveal>
          <div className="mt-6">
            {FAQ.map((f, i) => (
              <div key={f.q} className="mb-2.5 overflow-hidden rounded-xl border border-[var(--line)]">
                <button
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-bold text-[var(--ink)]"
                  aria-expanded={faqOpen === i}
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                >
                  {f.q}
                  <span className="text-xl text-[var(--accent)]">{faqOpen === i ? "−" : "+"}</span>
                </button>
                <div
                  className="overflow-hidden px-5 text-[var(--muted)] transition-[max-height] duration-300"
                  style={{ maxHeight: faqOpen === i ? 420 : 0 }}
                >
                  <p className="pb-4">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[72rem] px-5 pb-20">
        <Reveal className="card flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Проверьте агента на своём логе</h2>
            <p className="mt-1 text-[var(--muted)]">
              Вход через Telegram, диагностика — 1 НК. Смету увидите до списания.
            </p>
          </div>
          <button className="btn-p shrink-0" onClick={goCabinet}>
            Открыть кабинет
          </button>
        </Reveal>
      </section>
    </Shell>
  );
}
