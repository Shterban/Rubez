import { Link } from "react-router-dom";
import { LoginForm } from "@/lib/AuthForms.jsx";
import { PageBg, Particles } from "@/components/Chrome.jsx";

export default function Login() {
  return (
    <>
      <PageBg soft />
      <Particles />
      <main className="grid min-h-screen place-items-center px-5 py-12">
        <div className="card w-full max-w-sm space-y-6">
          <div>
            <Link to="/" className="text-xl font-extrabold tracking-wide text-[var(--ink)]">
              Рубе<span className="grad-text">ж</span>
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold">Вход</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Кабинет владельца и агент — после входа.</p>
          </div>
          <LoginForm registerHref="/register" />
          <Link to="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            ← На главную
          </Link>
        </div>
      </main>
    </>
  );
}
