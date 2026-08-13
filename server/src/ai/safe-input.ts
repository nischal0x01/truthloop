/**
 * safe-input.ts — prompt-injection guard.
 *
 * Per CLAUDE.md: every Claude prompt wraps user-provided content in
 * `<user_input>...</user_input>` tags and explicitly tells Claude to treat
 * it as data, not instructions. The wrapped string is otherwise literal.
 */

/**
 * Wrap a piece of user-supplied text so the model sees it as data, not
 * as instructions. Strips nothing — the source content is preserved
 * verbatim inside the tag block.
 */
export function wrapUserInput(text: string, label = 'user_input'): string {
  // Trim at most to keep size predictable. Never alter the content itself.
  const safe = String(text ?? '').trim();
  return `<${label}>\n${safe}\n</${label}>`;
}

/**
 * Same as `wrapUserInput` but guarantees the model cannot escape the tag
 * block by emitting its own closing tag — we escape any existing closing
 * tag inside the content.
 */
export function wrapUserInputEscaped(text: string, label = 'user_input'): string {
  const safe = String(text ?? '')
    .trim()
    .replaceAll(`</${label}>`, `&lt;/${label}&gt;`);
  return `<${label}>\n${safe}\n</${label}>`;
}
