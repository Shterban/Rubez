import { Link } from "react-router-dom";
import { Shell } from "@/components/Chrome.jsx";

export default function NotFound() {
  return (
    <Shell soft>
      <div className="mx-auto flex min-h-[60vh] max-w-[36rem] flex-col items-start justify-center px-5 py-16">
        <span className="rounded-full border border-[rgba(255,208,138,0.35)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
          404
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">Такой страницы нет</h1>
        <p className="mt-2 text-[var(--muted)]">
          Возможно, ссылка устарела или в адресе опечатка. Агент и конструктор на месте — начните с них.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="btn-p">
            На главную
          </Link>
          <Link to="/builder" className="btn-g">
            В конструктор
          </Link>
          <Link to="/legal" className="btn-g">
            Документы
          </Link>
        </div>
      </div>
    </Shell>
  );
}
