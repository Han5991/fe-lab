/** 검색어 해석·매칭·하이라이트. 검색어는 공백으로 나눈 낱말들의 AND다. */

export function searchTokens(query: string): string[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return [...new Set(words)];
}

/** 모든 낱말이 필드 중 어딘가에 있으면 참. 낱말이 없으면 참. */
export function matchesAllTokens(
  fields: readonly string[],
  tokens: readonly string[],
): boolean {
  const haystack = fields.join('\n').toLowerCase();
  return tokens.every(token => haystack.includes(token));
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** 텍스트를 낱말이 걸린 조각과 아닌 조각으로 나눈다(대소문자 무시, 겹치면 합침). */
export function splitByTokens(
  text: string,
  tokens: readonly string[],
): TextPart[] {
  if (!text || tokens.length === 0) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const marked = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    for (
      let at = lower.indexOf(token);
      at !== -1;
      at = lower.indexOf(token, at + token.length)
    ) {
      marked.fill(true, at, at + token.length);
    }
  }
  const parts: TextPart[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marked[i] !== marked[start]) {
      parts.push({ text: text.slice(start, i), match: marked[start] === true });
      start = i;
    }
  }
  return parts;
}

/** 본문 미리보기에서 첫 낱말이 걸린 자리 주변을 잘라 낸다. 없으면 앞부분. */
export function pickContentSnippet(
  content: string,
  tokens: readonly string[],
  radius = 60,
): string {
  if (!content) return '';
  const lower = content.toLowerCase();
  const hits = tokens
    .map(token => ({ at: lower.indexOf(token), length: token.length }))
    .filter(hit => hit.at !== -1)
    .sort((a, b) => a.at - b.at);
  const first = hits.at(0);
  if (!first) return content.slice(0, 140);
  const start = Math.max(0, first.at - radius);
  const end = Math.min(content.length, first.at + first.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${content.slice(start, end)}${suffix}`;
}
