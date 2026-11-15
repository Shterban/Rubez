import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell, Reveal } from "@/components/Chrome.jsx";
import { useAuth } from "@/lib/AuthContext.jsx";

// Печатающийся диалог агента: сцены по кругу, сцена очищается перед следующей.
const SCENES = [
  [
    ["user", "Хочу сервер для друзей с экономикой и кланами"],
    ["bot", "Понял: выживание, экономика, кланы. Смета: ядро Paper, 4 плагина — 9 НК. Подтвердить?"],
  ],
  [
    ["user", "Лагает, вот лог"],
    ["bot", "Прикрепите лог — найду причины. Обычно это память или кривой плагин."],
  ],
  [
    ["user", "Построй арену на 16 игроков"],
    ["bot", "План: площадка 24х24, трибуны, факелы. Смета: 12 НК. Начинаем?"],
  ],
];

function AgentScene() {
  const [msgs, setMsgs] = useState([]); // {role, text}
  useEffect(() => {
    let timer;
    let alive = true;
    let si = 0;
    let mi = 0;
    let line = 0;
    function typeLine() {
      if (!alive) return;
      const sc = SCENES[si][mi];
      if (line === 0) {
        setMsgs((m) => [...m.slice(-2), { role: sc[0], text: "" }]);
      }
      line++;
      setMsgs((m) => {
        const next = m.slice();
        next[next.length - 1] = { role: sc[0], text: sc[1].slice(0, line) };
        return next;
      });
      if (line < sc[1].length) {
        timer = setTimeout(typeLine, 26);
      } else {
        mi++;
        line = 0;
        if (mi >= SCENES[si].length) {
          mi = 0;
          si = (si + 1) % SCENES.length;
          // пауза на готовой сцене, затем чистый лист и новая сцена
          timer = setTimeout(() => {
            setMsgs([]);
            timer = setTimeout(typeLine, 300);
          }, 2600);
        } else {
          timer = setTimeout(typeLine, 700);
        }
      }
    }
    typeLine();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="flex h-[330px] flex-col justify-end gap-3 overflow-hidden px-5 pb-5" aria-live="polite">
      {msgs.map((m, i) => (
        <div key={i} className={"msg " + m.role}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    tab: "Создание сервера",
    lead: "Сервер с одной фразы.",
    body: "Опишите режим, агент выберет ядро, подберёт тариф и поднимет сервер. Хотите скайблок с аукционом — скажите, хотите ваниль с друзьями — просто скажите «ваниль». Перед запуском агент всегда показывает смету в НК.",
  },
  {
    tab: "Сборки",
    lead: "Сборки из плагинов и модов.",
    body: "В конструкторе выберите ядро — Paper, Purpur, Fabric или NeoForge — и компоненты. Агент проверит совместимость, а готовую сборку можно выгрузить архивом и поставить на любой хостинг.",
  },
  {
    tab: "Диагностика",
    lead: "Диагностика по логам.",
    body: "Прикрепите лог или конфиг прямо в чат — агент найдёт ошибки, назовёт причины лагов и предложит исправление со сметой. Память, кривой плагин, таймауты — всё это его язык.",
  },
  {
    tab: "Постройки",
    lead: "Постройки и события.",
    body: "«Построй арену для PvP на 16 игроков» — агент спланирует, построит и покажет смету. Декор на спавне, ивенты, торгашеские лавки — по описанию словами.",
  },
];

const FAQ = [
  {
    q: "Что такое НК?",
    a: "НК — валюта платформы. Тариф начисляет её каждый месяц, израсходованные НК восполняются докупкой один раз — докупка не сгорает. Агент списывает НК за действия: диагностика, постройки, настройка плагинов.",
  },
  {
    q: "Агент что-то делает без моего согласия?",
    a: "Нет. Любое действие — от постройки до смены ядра — сначала попадает в смету, и вы нажимаете «Подтвердить». Всё, что агент сделал, видно в журнале с ценой в НК.",
  },
  {
    q: "Можно выгрузить сборку и уйти?",
    a: "Да. Собранная в конструкторе сборка выгружается архивом с манифестом и структурой плагинов и модов. Ваши данные — ваши.",
  },
  {
    q: "Где живут мои логи, когда я их прикрепляю?",
    a: "Файл читается локально в вашем браузере, а его текст уходит в модель агента только как содержимое вашего запроса — мы не храним логи и не используем их ни для чего, кроме ответа.",
  },
  {
    q: "Агент настоящий?",
    a: "Да: в кабинете агент отвечает через языковую модель DeepSeek V4.1 Flash на серверах в России (Nodul Router) и разбирает прикреплённые логи. Реальное скачивание jar-файлов и хостинг серверов — следующий этап (Э-2).",
  },
];

const PLANS = [
  {
    name: "Старт",
    price: "350",
    best: false,
    items: ["Сервер до 10 игроков", "Диагностика от 1 НК", "Сборка из каталога", "Журнал действий агента"],
  },
  {
    name: "Комьюнити",
    price: "1200",
    best: true,
    items: ["Сервер до 50 игроков", "Постройки и ивенты", "Бэкапы каждый день", "Витрина сервера"],
  },
  {
    name: "Сеть",
    price: "3500",
    best: false,
    items: ["Несколько серверов и лобби", "Приоритет агента", "Кастомные сборки", "Отчёты по онлайну"],
  },
];

export default function Home() {
  const { isOwner, login } = useAuth();
  const [tab, setTab] = useState(0);
  const [faqOpen, setFaqOpen] = useState(-1);

  return (
    <Shell>
      <section className="flex min-h-[88vh] items-center px-5 py-14">
        <div className="mx-auto grid w-full max-w-[72rem] items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="mb-4 inline-block rounded-full border border-[rgba(255,208,138,0.35)] px-3.5 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              AI-агент для владельцев серверов
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.12] sm:text-5xl">
              Опишите сервер словами — <span className="grad-text">агент соберёт его за минуты</span>
            </h1>
            <p className="mt-4 max-w-[35rem] text-lg text-[var(--muted)]">
              Рубеж — платформа Minecraft-серверов с живым агентом: создаёт сервер, собирает сборки из плагинов
              и модов, чинит лаги по вашим логам и строит арены. Вы говорите — он делает.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {isOwner ? (
                <Link to="/owner" className="btn-p">
                  Создать сервер
                </Link>
              ) : (
                <button className="btn-p" onClick={() => login(window.location.href)}>
                  Создать сервер
                </button>
              )}
              <Link to="/builder" className="btn-g">
                Собрать сборку
              </Link>
            </div>
          </div>
          <div className="card">
            <AgentScene />
            <p className="pb-2 text-center text-[0.82rem] text-[var(--ink-faint)]">
              живой диалог агента — так это выглядит в кабинете
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[72rem] px-5">
        <Reveal className="grid grid-cols-2 gap-4 border-y border-[var(--line)] py-6 md:grid-cols-4">
          {[
            ["3 мин", "до готового сервера"],
            ["1 НК", "средняя диагностика"],
            ["24/7", "агент на связи"],
            ["0 ₽", "старт и тестовый сервер"],
          ].map(([b, s]) => (
            <div key={s}>
              <b className="grad-text block text-2xl">{b}</b>
              <span className="text-sm text-[var(--muted)]">{s}</span>
            </div>
          ))}
        </Reveal>
      </div>

      <section className="mx-auto max-w-[72rem] px-5 py-16" id="how">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Как это работает</h2>
          <p className="mb-9 mt-1 max-w-[45rem] text-[var(--muted)]">
            Четыре шага от «хочу свой сервер» до игроков на спавне.
          </p>
        </Reveal>
        <Reveal className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Опишите мечту", "«Хочу выживание с экономикой и кланами для друзей» — агент поймёт."],
            ["Подтвердите смету", "Агент покажет план и цену в НК до любого действия."],
            ["Смотрите, как он работает", "Сборка, настройка, постройки — каждое действие в журнале."],
            ["Приглашайте игроков", "Адрес сервера — в один клик. Игроки видят вас на витрине."],
          ].map(([b, t], i) => (
            <div key={i} className="card relative pl-16">
              <span
                className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-full font-extrabold"
                style={{ background: "var(--grad)", color: "#1a0d14" }}
              >
                {i + 1}
              </span>
              <b>{b}</b>
              <br />
              <span className="text-sm text-[var(--muted)]">{t}</span>
            </div>
          ))}
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
                key={i}
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={
                  "rounded-full border px-4 py-2 text-sm transition-colors " +
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
            НК — внутренняя валюта платформы: начисляется ежемесячно тарифом, докупается один раз и не сгорает.
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
              {isOwner ? (
                <Link to="/owner" className={"mt-2 " + (p.best ? "btn-p" : "btn-g")}>
                  {p.best ? "Выбрать" : "Начать бесплатно"}
                </Link>
              ) : (
                <button
                  className={"mt-2 " + (p.best ? "btn-p" : "btn-g")}
                  onClick={() => login(window.location.href)}
                >
                  {p.best ? "Выбрать" : "Начать бесплатно"}
                </button>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[51.25rem] px-5 py-16" id="faq">
        <Reveal>
          <h2 className="text-3xl font-extrabold">Вопросы</h2>
        </Reveal>
        <Reveal>
          <div className="mt-6">
            {FAQ.map((f, i) => (
              <div key={i} className="mb-2.5 overflow-hidden rounded-xl border border-[var(--line)]">
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
                  style={{ maxHeight: faqOpen === i ? 320 : 0 }}
                >
                  <p className="pb-4">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </Shell>
  );
}
