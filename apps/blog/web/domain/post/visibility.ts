import type { PostData } from './types';

/**
 * Frontmatter 데이터를 기반으로 포스트의 공개 여부를 판단합니다.
 *
 * - status가 없으면 published 필드로 하위호환 (기존 방식)
 * - status: 'published' → 공개
 * - status: 'draft' → 비공개
 * - status: 'scheduled' + scheduledDate가 현재 시간 이전 → 공개
 */
export interface VisibilityData {
  status?: string;
  scheduledDate?: string;
  published?: boolean;
}

export function isPostVisible(data: VisibilityData): boolean {
  if (!data.status) {
    return data.published === true;
  }

  switch (data.status) {
    case 'published':
      return true;
    case 'draft':
      return false;
    case 'scheduled': {
      if (typeof data.scheduledDate !== 'string') return false;
      return new Date(data.scheduledDate) <= new Date();
    }
    default:
      return false;
  }
}
