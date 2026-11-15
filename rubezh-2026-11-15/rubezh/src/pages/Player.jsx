import { Link } from "react-router-dom";
import { Shell } from "@/components/Chrome.jsx";

export default function Player() {
  return (
    <Shell soft>
      <div className="mx-auto max-w-[48.75rem] px-5 py-10">
        <h2 className="text-3xl font-extrabold">Как подключиться к серверу</h2>
        <p className="mt-1 text-[var(--muted)]">Три шага — и вы на спавне.</p>
        <div className="mt-8">
          {[
            [
              "Найдите сервер",
              <>на <Link to="/servers" className="text-[var(--accent)] underline">витрине</Link> — по режиму и онлайну.</>,
            ],
            ["Скопируйте адрес", <>кликом по адресу в карточке.</>],
            [
              "Добавьте сервер в Minecraft",
              <>«Мультиплеер» → «Добавить сервер» → вставьте адрес → «Готово». Версия сервера указана в карточке
              (например, 1.21.4) — под неё и заходите.</>,
            ],
          ].map(([b, t], i) => (
            <div key={i} className="card relative mb-5 pl-16">
              <span
                className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-full font-extrabold"
                style={{ background: "var(--grad)", color: "#1a0d14" }}
              >
                {i + 1}
              </span>
              <b>{b}</b>{" "}
              <span className="text-[var(--muted)]">{t}</span>
            </div>
          ))}
        </div>
        <div className="card mt-8">
          <b>Частые вопросы игроков</b>
          <p className="mt-3 text-[var(--muted)]">
            «Не пускает» — версия клиента должна совпадать с версией сервера. «Лагает» — напишите владельцу:
            у него агент разберёт логи. Адрес не работает — сервер мог уйти на перезапуск, подождите минуту.
          </p>
        </div>
      </div>
    </Shell>
  );
}
