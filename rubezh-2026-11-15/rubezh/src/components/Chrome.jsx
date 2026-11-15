import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext.jsx";
import { Toaster } from "sonner";

/* ——— Фон: фото сакуры под скримом ——— */
export function PageBg({ soft = false }) {
  return <div className={"page-bg" + (soft ? " soft" : "")} aria-hidden="true" />;
}

/* ——— Частицы: лепестки на лендинге, светлячки в кабинетах ——— */
export function Particles({ petals = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = cv.getContext("2d");
    let P = [];
    const size = () => {
      cv.width = innerWidth;
      cv.height = innerHeight;
    };
    const spawn = () => {
      P = [];
      const n = petals ? (innerWidth < 768 ? 14 : 26) : innerWidth < 768 ? 12 : 22;
      for (let i = 0; i < n; i++) {
        P.push({
          x: Math.random() * cv.width,
          y: Math.random() * cv.height,
          s: petals ? 3 + Math.random() * 4 : 1 + Math.random() * 2,
          vy: petals ? 0.4 + Math.random() * 0.7 : 0.15 + Math.random() * 0.35,
          vx: (Math.random() - 0.5) * 0.5,
          ph: Math.random() * 6.28,
          tw: 0.4 + Math.random() * 0.6,
        });
      }
    };
    size();
    spawn();
    addEventListener("resize", size);
    addEventListener("resize", spawn);
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const t = Date.now() / 1000;
      P.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + (petals ? Math.sin(p.ph) * 0.4 : 0);
        p.ph += petals ? 0.02 : 0;
        if (p.y > cv.height + 10) {
          p.y = -10;
          p.x = Math.random() * cv.width;
        }
        if (p.x < -10) p.x = cv.width + 10;
        if (p.x > cv.width + 10) p.x = -10;
        ctx.save();
        if (petals) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.ph);
          ctx.fillStyle = `rgba(255,150,185,${0.28 * p.tw + 0.1})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.29);
          ctx.fill();
        } else {
          const a = 0.25 + 0.25 * Math.sin(t * p.tw * 2 + p.ph);
          ctx.fillStyle = `rgba(255,214,140,${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.29);
          ctx.fill();
        }
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      removeEventListener("resize", spawn);
    };
  }, [petals]);
  return <canvas ref={ref} className="canv" aria-hidden="true" />;
}

/* ——— Появление секций при скролле ——— */
export function Reveal({ children, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={"reveal " + className}>
      {children}
    </Tag>
  );
}

const NAV = [
  { to: "/", label: "Главная", end: true },
  { to: "/builder", label: "Конструктор" },
  { to: "/servers", label: "Серверы" },
  { to: "/player", label: "Игрокам" },
];

/* ——— Шапка ——— */
export function Header() {
  const { isAuthenticated, isOwner, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const canAdmin = isOwner;
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(11,14,20,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[72rem] items-center gap-5 px-5">
        <Link to="/" className="text-xl font-extrabold tracking-wide text-[var(--ink)]" aria-label="Рубеж — на главную">
          Рубе<span className="grad-text">ж</span>
        </Link>
        <nav className="hidden flex-1 gap-1.5 md:flex" aria-label="Основная навигация">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                "rounded-[10px] px-3 py-2 text-[0.94rem] text-[var(--muted)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--ink)]" +
                (isActive ? " text-[var(--accent)]" : "")
              }
            >
              {n.label}
            </NavLink>
          ))}
          {canAdmin && (
            <NavLink
              to="/owner"
              className={({ isActive }) =>
                "rounded-[10px] px-3 py-2 text-[0.94rem] text-[var(--muted)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--ink)]" +
                (isActive ? " text-[var(--accent)]" : "")
              }
            >
              Кабинет
            </NavLink>
          )}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {canAdmin ? (
            <button className="btn-g" onClick={() => logout(window.location.href)}>
              Выйти
            </button>
          ) : isAuthenticated ? null : (
            <button className="btn-p" onClick={() => login(window.location.href)}>
              Войти
            </button>
          )}
        </div>
        <button
          className="ml-auto flex flex-col rounded-lg p-2 md:hidden"
          aria-label="Меню"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="my-1 block h-0.5 w-6 rounded bg-[var(--ink)]" />
          <span className="my-1 block h-0.5 w-6 rounded bg-[var(--ink)]" />
          <span className="my-1 block h-0.5 w-6 rounded bg-[var(--ink)]" />
        </button>
      </div>
      {open && (
        <div className="border-b border-[var(--line)] bg-[rgba(11,14,20,0.97)] px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Мобильная навигация">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-3 py-2.5 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {n.label}
              </Link>
            ))}
            {canAdmin && (
              <Link to="/owner" onClick={() => setOpen(false)} className="rounded-[10px] px-3 py-2.5 text-[var(--muted)] hover:text-[var(--ink)]">
                Кабинет
              </Link>
            )}
            {canAdmin ? (
              <button className="btn-g mt-2" onClick={() => { setOpen(false); logout(window.location.href); }}>
                Выйти
              </button>
            ) : isAuthenticated ? null : (
              <button className="btn-p mt-2" onClick={() => { setOpen(false); login(window.location.href); }}>
                Войти
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/* ——— Футер ——— */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] py-9 text-sm text-[var(--ink-faint)]">
      <div className="mx-auto flex max-w-[72rem] flex-wrap justify-between gap-10 px-5">
        <div>Рубеж — свой сервер за минуты. Оплата в НК.</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/builder" className="text-[var(--muted)] hover:text-[var(--ink)]">Конструктор</Link> ·
          <Link to="/servers" className="text-[var(--muted)] hover:text-[var(--ink)]">Серверы</Link> ·
          <Link to="/player" className="text-[var(--muted)] hover:text-[var(--ink)]">Игрокам</Link> ·
          <span>help@rubez.example</span>
        </div>
      </div>
    </footer>
  );
}

/* ——— Тосты ——— */
export function Toasts() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "rgba(24,29,42,0.9)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          borderRadius: "0.75rem",
          backdropFilter: "blur(10px)",
        },
      }}
    />
  );
}

/* ——— Обёртка страницы ——— */
export function Shell({ soft = false, children }) {
  return (
    <>
      <PageBg soft={soft} />
      <Particles petals={!soft} />
      <Header />
      <main>{children}</main>
      <Footer />
      <Toasts />
    </>
  );
}
