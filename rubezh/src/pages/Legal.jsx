import { Shell } from "@/components/Chrome.jsx";
import { LEGAL, hasEmail, hasRequisites } from "@/lib/legal.js";

const SECTIONS = [
  {
    title: "Что продаётся",
    body: [
      "Тариф даёт пакет НК — внутренних единиц платформы. НК списываются только за действия агента по опубликованному прайсу (диагностика, бэкап, память, плагин, экономика, постройка арены) и не являются деньгами, валютой или ценной бумагой.",
      "НК нельзя обменять на рубли, вывести или передать другому пользователю. Стоимость пакета НК в рублях показывается до оплаты.",
    ],
  },
  {
    title: "Подтверждение действий",
    body: [
      "Платное действие выполняется только после нажатия «Подтвердить» в карточке плана. Списанные НК фиксируются в журнале кабинета: время, описание, сумма.",
      "Если действие не было выполнено по вине платформы, НК возвращаются на баланс; обращение — на почту поддержки с номером записи из журнала.",
    ],
  },
  {
    title: "Персональные данные",
    body: [
      "Мы обрабатываем минимум: идентификатор входа (Telegram), адрес почты, если вы её указали, и содержимое ваших запросов к агенту. Логи и конфиги, прикреплённые к запросу, читаются в браузере; в модель уходит только текст, нужный для ответа.",
      "Данные не продаются и не передаются третьим лицам, кроме технических подрядчиков, обеспечивающих работу сервиса. Запрос на удаление данных — на почту поддержки.",
    ],
  },
  {
    title: "Чего пока нет",
    body: [
      "Автоматический запуск серверов, скачивание jar-файлов плагинов и постройки внутри мира — следующий этап (Э-2). До его запуска тариф даёт НК и инструменты: агента, конструктор сборок, разбор логов и планирование.",
    ],
  },
];

export default function Legal() {
  return (
    <Shell soft>
      <div className="mx-auto max-w-[46rem] px-5 py-12">
        <h1 className="text-3xl font-extrabold">Документы и реквизиты</h1>
        <p className="mt-2 text-[var(--muted)]">
          Коротко и без юридического тумана: что продаётся, как подтверждаются действия и что мы делаем с данными.
        </p>

        <div className="card mt-6 border-[rgba(255,208,138,0.35)] bg-[rgba(255,208,138,0.06)]">
          <b className="text-[var(--gold)]">Черновик</b>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Тексты ниже — рабочая редакция для превью. Итоговые формулировки (оферта, политика по 152-ФЗ, правила
            возврата) утверждаются юристом до публичного запуска и приёма платежей.
          </p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="text-xl font-extrabold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-[0.95rem] leading-relaxed text-[var(--muted)]">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-8">
          <h2 className="text-xl font-extrabold">Реквизиты</h2>
          {hasRequisites ? (
            <ul className="mt-2 flex flex-col gap-1 text-[0.95rem] text-[var(--muted)]">
              <li>{LEGAL.entity}</li>
              <li>ИНН {LEGAL.inn}</li>
              {LEGAL.ogrn && <li>ОГРН(ИП) {LEGAL.ogrn}</li>}
              {LEGAL.address && <li>{LEGAL.address}</li>}
            </ul>
          ) : (
            <p className="mt-2 text-[0.95rem] text-[var(--muted)]">
              Реквизиты оператора публикуются перед запуском приёма платежей.
            </p>
          )}
          {hasEmail && (
            <p className="mt-3 text-[0.95rem]">
              Почта поддержки:{" "}
              <a className="text-[var(--cyan)] underline underline-offset-4" href={`mailto:${LEGAL.email}`}>
                {LEGAL.email}
              </a>
            </p>
          )}
          {LEGAL.offerUpdated && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Редакция от {LEGAL.offerUpdated}</p>
          )}
        </section>

        <p className="mt-10 text-sm text-[var(--ink-soft)]">
          Вопросы по списаниям — с номером записи из журнала кабинета: так видно, за что именно ушли НК.
        </p>
      </div>
    </Shell>
  );
}
