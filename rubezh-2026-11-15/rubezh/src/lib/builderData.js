// Каталог конструктора — перенос из прототипа builder.html.
export const CORES = [
  { id: "paper", name: "Paper 1.21.4", kind: "plugin", desc: "производительное ядро для плагинов — стандарт выживания" },
  { id: "purpur", name: "Purpur 1.21.4", kind: "plugin", desc: "Paper с дополнительными настройками геймплея" },
  { id: "fabric", name: "Fabric 1.21.4", kind: "mod", desc: "лёгкий загрузчик модов — для технических сборок" },
  { id: "neoforge", name: "NeoForge 21.1", kind: "mod", desc: "продолжение Forge — крупные модпаки" },
];

export const COMPS = [
  { id: "vault", name: "Vault", type: "plugin", core: "plugin", desc: "основа экономики: валюта и права" },
  { id: "essentials", name: "EssentialsX", type: "plugin", core: "plugin", desc: "дома, телепорты, магазин, набор команд" },
  { id: "worldguard", name: "WorldGuard", type: "plugin", core: "plugin", desc: "защита территорий от гриферства" },
  { id: "worldedit", name: "WorldEdit", type: "plugin", core: "plugin", desc: "массовое редактирование мира" },
  { id: "luckperms", name: "LuckPerms", type: "plugin", core: "plugin", desc: "права, роли и префиксы" },
  { id: "dynmap", name: "Dynmap", type: "plugin", core: "plugin", desc: "живая карта мира в браузере" },
  { id: "chestshop", name: "ChestShop", type: "plugin", core: "plugin", desc: "лавки игроков на спавне" },
  { id: "citizens", name: "Citizens", type: "plugin", core: "plugin", desc: "NPC-торговцы и квестодатели" },
  { id: "placeholderapi", name: "PlaceholderAPI", type: "plugin", core: "plugin", desc: "переменные для HUD и чата" },
  { id: "bedwars", name: "BedWars1058", type: "plugin", core: "plugin", desc: "мини-игра BedWars с аренами" },
  { id: "skywars", name: "SkyWars", type: "plugin", core: "plugin", desc: "мини-игра SkyWars" },
  { id: "serverutils", name: "ServerUtils", type: "plugin", core: "plugin", desc: "админ-панель прямо в браузере" },
  { id: "spark", name: "spark", type: "plugin", core: "plugin", desc: "профилировщик: найдёт лаги по TPS" },
  { id: "discordsrv", name: "DiscordSRV", type: "plugin", core: "plugin", desc: "чат между Discord и сервером" },
  { id: "create", name: "Create", type: "mod", core: "mod", desc: "механизмы, конвейеры, поезда" },
  { id: "jei", name: "JEI", type: "mod", core: "mod", desc: "справочник рецептов и предметов" },
  { id: "sodium", name: "Sodium", type: "mod", core: "mod", desc: "FPS-ускорение клиента" },
  { id: "immersive", name: "Immersive Engineering", type: "mod", core: "mod", desc: "индустрия и энергетика" },
  { id: "twilight", name: "Twilight Forest", type: "mod", core: "mod", desc: "новое измерение и боссы" },
  { id: "ae2", name: "Applied Energistics 2", type: "mod", core: "mod", desc: "цифровое хранилище и автокрафт" },
  { id: "botania", name: "Botania", type: "mod", core: "mod", desc: "магия через цветы и ритуалы" },
  { id: "waystones", name: "Waystones", type: "mod", core: "mod", desc: "телепорт-камни в мире" },
  { id: "farmers", name: "Farmer's Delight", type: "mod", core: "mod", desc: "готовка и фермерство" },
  { id: "mca", name: "Cataclysm", type: "mod", core: "mod", desc: "данжи и сильные боссы" },
];

export const PRESETS = {
  "Выживание с экономикой": { core: "paper", comps: ["vault", "essentials", "worldguard", "luckperms", "chestshop"] },
  "Мини-игры": { core: "paper", comps: ["vault", "luckperms", "bedwars", "skywars"] },
  "Технический модпак": { core: "fabric", comps: ["create", "jei", "sodium", "ae2", "immersive"] },
};

export const EFFECTS = {
  vault: "настрою единую валюту и права",
  essentials: "магазин, дома и телепорты для игроков",
  worldguard: "защита приватов и спавна от гриферства",
  worldedit: "быстрые правки мира для строителей",
  luckperms: "роли, префиксы и права в чате",
  dynmap: "живую карту мира в браузере",
  chestshop: "лавки игроков на спавне",
  citizens: "NPC-торговцев и квестодателей",
  bedwars: "арену BedWars со счётом и рестартами",
  skywars: "SkyWars-арены с автоперезапуском",
  serverutils: "админ-панель прямо в браузере",
  spark: "профилировщик TPS против лагов",
  discordsrv: "связку чата с Discord",
  create: "механизмы и конвейеры на базе",
  jei: "справочник рецептов у каждого игрока",
  sodium: "прирост FPS клиентам",
};

export function compById(id) {
  return COMPS.find((c) => c.id === id);
}
export function coreById(id) {
  return CORES.find((c) => c.id === id);
}
