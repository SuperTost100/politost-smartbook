/**
 * Paged.js can re-render earlier chunks when repeated text confuses the break
 * token (see pagedjs/pagedjs#208). Remove leading duplicate print-chunks on each
 * page when their data-chunk-id was already fully laid out on a prior page.
 */
export function dedupePagedChunks(pagesRoot: HTMLElement): void {
  const completed = new Set<string>();

  for (const page of pagesRoot.querySelectorAll('.pagedjs_page')) {
    const area = page.querySelector('.pagedjs_area');
    if (!area) continue;

    dedupeArea(area, completed);
  }
}

function isSplitContinuation(node: Element): boolean {
  return !!node.closest('[data-split-from]');
}

function dedupeArea(area: Element, completed: Set<string>): void {
  let chunks = [...area.querySelectorAll('.print-chunk')];
  let i = 0;

  while (i < chunks.length) {
    const chunk = chunks[i] as HTMLElement;
    const id = chunk.dataset.chunkId;
    const continuation = isSplitContinuation(chunk);

    if (id && completed.has(id) && !continuation) {
      while (i < chunks.length) {
        const current = chunks[i] as HTMLElement;
        const currentId = current.dataset.chunkId;
        const currentContinuation = isSplitContinuation(current);
        if (currentContinuation) break;
        if (currentId && !completed.has(currentId)) break;
        current.remove();
        i++;
      }
      chunks = [...area.querySelectorAll('.print-chunk')];
      continue;
    }

    if (id && !continuation) {
      completed.add(id);
    }
    i++;
  }

  dedupeParagraphTitles(area, completed);
}

function dedupeParagraphTitles(area: Element, completed: Set<string>): void {
  for (const title of area.querySelectorAll('.paragraph-title')) {
    const key = title.textContent?.replace(/\s+/g, ' ').trim();
    if (!key) continue;

    const continuation = isSplitContinuation(title);
    if (completed.has(`title:${key}`) && !continuation) {
      const section = title.closest('.paragraph-section');
      if (section) {
        const sectionChunks = section.querySelectorAll('.print-chunk');
        const allDuplicate = sectionChunks.length > 0
          && [...sectionChunks].every((c) => {
            const id = (c as HTMLElement).dataset.chunkId;
            return !id || completed.has(id);
          });
        if (allDuplicate) {
          section.remove();
          continue;
        }
      }
      title.remove();
      continue;
    }

    if (!continuation) {
      completed.add(`title:${key}`);
    }
  }
}
