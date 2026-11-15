// Юридические данные платформы.
// Пустые поля = блок не показывается на сайте (лучше ничего, чем «example»).
// Перед публичным запуском заполнить и проверить у юриста: оферта, политика
// обработки персональных данных (152-ФЗ), правила возврата НК.

export const LEGAL = {
  entity: "", // «ИП Иванов Иван Иванович»
  inn: "",
  ogrn: "",
  address: "",
  email: "", // «support@домен»
  phone: "",
  offerUpdated: "", // «15.11.2026»
};

export const hasRequisites = Boolean(LEGAL.entity && LEGAL.inn);
export const hasEmail = Boolean(LEGAL.email);
