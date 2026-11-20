import type { SmartbookData } from './loader';

/**
 * Whether formulas may skip DOMPurify: the copy the book was opened with is trusted
 * (`SmartbookData.mathTrusted`) and is still the copy loadSmartbook serves. If another copy took its
 * place while the book is open, such as an imported file or a cloud book with the same id, formulas
 * are sanitized until the book opens again with the new copy.
 */
export function mathTrustedFor(opened: SmartbookData | null, current: SmartbookData | null): boolean {
  return opened !== null && opened.mathTrusted && current === opened;
}
