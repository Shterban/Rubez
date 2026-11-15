// Прайс платформы — единственный источник цены на сервере.
// Клиент показывает те же суммы из src/lib/agentPricing.js; если они
// разойдутся, списывается серверная цена (она же возвращается в ответе).
export type Service = { label: string; nk: number; steps: string[] };

export const SERVICES: Record<string, Service> = {
  diagnose: {
    label: "Диагностика по логам",
    nk: 1,
    steps: ["Разобрать лог и конфиги", "Назвать причины лагов", "Дать план исправления"],
  },
  backup: {
    label: "Бэкап мира",
    nk: 1,
    steps: ["Остановить запись в мир", "Сжать и сохранить копию", "Проверить целостность архива"],
  },
  memory: {
    label: "Поднять память",
    nk: 3,
    steps: ["Остановить сервер", "Изменить лимит памяти", "Запустить и проверить TPS"],
  },
  plugin: {
    label: "Установка плагина",
    nk: 2,
    steps: ["Подобрать версию под ядро", "Проверить зависимости", "Установить и перезапустить"],
  },
  arena: {
    label: "Постройка арены",
    nk: 12,
    steps: ["Разметить площадку по размеру", "Собрать трибуны и свет", "Проверить спавны и границы"],
  },
  economy: {
    label: "Настройка экономики",
    nk: 4,
    steps: ["Поставить Vault + Essentials", "Задать валюту и стартовый баланс", "Проверить магазины и оплату"],
  },
};

export const PRICES = Object.fromEntries(
  Object.entries(SERVICES).map(([id, s]) => [id, { label: s.label, nk: s.nk, steps: s.steps }])
);

export const catalogForPrompt = Object.entries(SERVICES)
  .map(([id, s]) => `- ${id} — ${s.label}, ${s.nk} НК`)
  .join("\n");

export function priceOf(service: string): number {
  return SERVICES[service]?.nk ?? 0;
}

export function labelOf(service: string): string {
  return SERVICES[service]?.label ?? "Действие агента";
}
