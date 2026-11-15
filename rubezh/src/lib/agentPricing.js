// Прайс агента и разбор структурированных блоков из ответа модели.
//
// Главное правило: цена НК берётся ТОЛЬКО из этого файла по id услуги.
// Раньше клиент вытаскивал первое «N НК» из текста ответа — значит, цену
// можно было «уговорить» в промпте. Теперь модель выбирает услугу,
// а сумму подставляет код.

export const SERVICES = {
  diagnose: {
    label: "Диагностика по логам",
    nk: 1,
    eta: "2–5 минут",
    steps: ["Разобрать лог и конфиги", "Назвать причины лагов", "Дать план исправления"],
  },
  backup: {
    label: "Бэкап мира",
    nk: 1,
    eta: "3–10 минут",
    steps: ["Остановить запись в мир", "Сжать и сохранить копию", "Проверить целостность архива"],
  },
  memory: {
    label: "Поднять память",
    nk: 3,
    eta: "1–2 минуты",
    steps: ["Остановить сервер", "Изменить лимит памяти", "Запустить и проверить TPS"],
  },
  plugin: {
    label: "Установка плагина",
    nk: 2,
    eta: "5–15 минут",
    steps: ["Подобрать версию под ядро", "Проверить зависимости", "Установить и перезапустить"],
  },
  arena: {
    label: "Постройка арены",
    nk: 12,
    eta: "20–40 минут",
    steps: ["Разметить площадку по размеру", "Собрать трибуны и свет", "Проверить спавны и границы"],
  },
  economy: {
    label: "Настройка экономики",
    nk: 4,
    eta: "10–20 минут",
    steps: ["Поставить Vault + Essentials", "Задать валюту и стартовый баланс", "Проверить магазины и оплату"],
  },
};

export function priceOf(service) {
  const s = SERVICES[service];
  return s ? s.nk : 0;
}

const clip = (v, max) => String(v ?? "").trim().slice(0, max);

function toStrArray(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .slice(0, maxItems)
    .map((x) => x.trim().slice(0, maxLen));
}

function normalizePlan(raw) {
  const service = clip(raw.service, 40).toLowerCase();
  const svc = SERVICES[service];
  if (!svc) {
    // Неизвестная услуга: показываем карточку без кнопки списания.
    return {
      kind: "plan",
      service: null,
      title: clip(raw.title, 120) || "План работ",
      summary: clip(raw.summary, 600),
      steps: toStrArray(raw.steps, 6, 140),
      notes: clip(raw.notes, 300),
      nk: 0,
      eta: clip(raw.eta, 40),
      priced: false,
    };
  }
  const steps = toStrArray(raw.steps, 6, 140);
  return {
    kind: "plan",
    service,
    title: clip(raw.title, 120) || svc.label,
    summary: clip(raw.summary, 600),
    steps: steps.length ? steps : svc.steps,
    notes: clip(raw.notes, 300),
    nk: svc.nk,
    eta: clip(raw.eta, 40) || svc.eta,
    priced: true,
  };
}

function normalizeChoice(raw) {
  const options = toStrArray(raw.options, 4, 60);
  if (options.length < 2) return null;
  return {
    kind: "choice",
    question: clip(raw.question, 200) || "Уточните вариант",
    options,
  };
}

function normalizeDiagnosis(raw) {
  if (!Array.isArray(raw.issues)) return null;
  const severity = new Set(["high", "medium", "low"]);
  const issues = raw.issues
    .filter((i) => i && typeof i === "object")
    .slice(0, 5)
    .map((i) => ({
      severity: severity.has(i.severity) ? i.severity : "medium",
      title: clip(i.title, 120),
      cause: clip(i.cause, 300),
      fix: clip(i.fix, 300),
    }))
    .filter((i) => i.title);
  if (!issues.length) return null;
  return { kind: "diagnosis", issues };
}

// Разбирает ответ модели на чистый текст + карточки.
export function parseCards(answer) {
  const src = String(answer || "");
  const cards = [];
  const re = /```(plan|choice|diagnosis)\s*\n([\s\S]*?)```/g;
  let body = src;
  let m;
  while ((m = re.exec(src))) {
    body = body.replace(m[0], "");
    let raw;
    try {
      raw = JSON.parse(m[2]);
    } catch {
      continue; // битый блок — просто выкидываем, текст остаётся
    }
    const card =
      m[1] === "plan" ? normalizePlan(raw) : m[1] === "choice" ? normalizeChoice(raw) : normalizeDiagnosis(raw);
    if (card) cards.push(card);
  }
  // Модель иногда дублирует блок словами «Смета: N НК» — убираем хвост.
  body = body
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s\-–—]+$/gm, "")
    .trim();
  return { body, cards };
}

export function formatNK(n) {
  return `${n} НК`;
}
