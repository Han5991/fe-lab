export interface Post {
  id: number;
  title: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** api.vercel.app/blog 응답을 확인한다 — 모양이 다르면 화면 대신 에러 경계로 보낸다 */
export const parsePost = (value: unknown): Post => {
  if (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.title === 'string'
  ) {
    return { id: value.id, title: value.title };
  }
  throw new Error('api.vercel.app/blog 응답이 글 모양이 아닙니다');
};

export const parsePosts = (value: unknown): Post[] => {
  if (!Array.isArray(value)) {
    throw new Error('api.vercel.app/blog 응답이 글 목록이 아닙니다');
  }
  return value.map(parsePost);
};
