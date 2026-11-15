// Честный разбор лога в браузере — перенос из прототипа owner.html.
const ERRORS = [/OutOfMemoryError/i, /Connection timed out/i, /Can't keep up!/i, /Exception/i, /Caused by:/i, /ERROR/i];

export function analyzeLog(name, text) {
  const hits = {};
  let total = 0;
  ERRORS.forEach((rx) => {
    const m = text.match(new RegExp(rx.source, "g"));
    if (m) {
      hits[rx.source] = m.length;
      total += m.length;
    }
  });
  const oom = text.match(/OutOfMemoryError/g);
  const timeout = text.match(/Connection timed out/g);
  const keepup = text.match(/Can't keep up!/g);
  const reasons = [];
  const plan = [];
  let cost = 0;
  if (oom) {
    reasons.push(`не хватает памяти Java (${oom.length}× OutOfMemoryError)`);
    plan.push("поднять память сервера");
    cost += 3;
  }
  if (keepup) {
    reasons.push(`сервер не успевает за тиками (${keepup.length}× Can't keep up!)`);
    if (cost === 0) cost += 2;
  }
  if (timeout) {
    reasons.push(`таймауты соединений (${timeout.length}×)`);
    if (cost === 0) cost += 2;
    plan.push("разобрать таймауты соединений");
  }
  if (!reasons.length && total) {
    reasons.push(`строки с ERROR/Exception: ${total}`);
    plan.push("разобрать исключения по стектрейсам");
    cost += 1;
  }
  if (!total) {
    return {
      summary: `Файл «${name}» прочитан: явных ошибок не нашёл. Пришлите полный лог или опишите проблему словами.`,
      cost: 0,
      problems: 0,
    };
  }
  return {
    summary: `Разобрал «${name}»: нашёл ${total} проблемных строк. Причины: ${reasons.join("; ")}. Предлагаю: ${plan.join(", ")}.`,
    cost,
    problems: total,
  };
}
