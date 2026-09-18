/**
 * Утилиты преобразования между простым текстом (заметки, промты) и HTML
 * (документы «WORD AI»). Используются при переносе записей между вкладками,
 * чтобы содержимое сразу структурировалось в целевом формате.
 */

/** Экранирование спецсимволов HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Простой текст → HTML для редактора «WORD AI».
 * Каждый абзац (разделённый пустой строкой или переводом строки) оборачивается
 * в <p>, одиночные переводы строки — в <br>, чтобы структура сохранилась.
 */
export function textToHtml(text: string): string {
  const trimmed = (text ?? "").trim()
  if (!trimmed) return ""
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const inner = escapeHtml(block.trim()).replace(/\n/g, "<br>")
      return `<p>${inner}</p>`
    })
    .join("")
}

/**
 * HTML документа «WORD AI» → простой текст для заметок и промтов.
 * Блочные теги превращаются в переводы строк, разметка удаляется. Работает
 * и на сервере (без DOM) через безопасный текстовый разбор.
 */
export function htmlToText(html: string): string {
  if (!html) return ""

  // На клиенте используем DOM — он корректно разбирает вложенную разметку.
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div")
    // Заменяем блочные разделители на переводы строк ДО разбора.
    tmp.innerHTML = html
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
    const text = tmp.textContent || ""
    return text.replace(/\n{3,}/g, "\n\n").trim()
  }

  // Фолбэк для сервера: грубое, но безопасное удаление тегов.
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
