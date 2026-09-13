import type { SortKey, ViewMode } from '$lib/client/archiveParams';

/**
 * 아카이브 화면이 주고받는 모양들. `apps/blog/web`은 `PostSummary`를 그대로
 * 들고 다니지만, 이 앱은 **서버가 URL과 썸네일을 미리 풀어** 내려보낸다
 * (`+layout.server.ts` 주석의 이유와 같다 — 화면이 `@blog/content` 배럴을 열면
 * `node:fs`가 클라이언트 그래프로 딸려 온다).
 */

/** 아카이브가 필터·정렬·렌더에 쓰는 글 한 편. */
export interface ArchivePost {
  slug: string;
  /** 서버에서 `postPath()`로 푼 완성된 href. */
  href: string;
  title: string;
  excerpt: string;
  tags: string[];
  /**
   * `_series.yml`로 선언된 폴더에 속한 글만 값이 있다. `null`이 아니라
   * `undefined`인 것은 `filterAndSortPostsByArchiveParams`의 제약
   * (`Pick<PostSummary, 'series'>` = `string | undefined`)과 맞추기 위해서다.
   */
  series: string | undefined;
  /** 정렬·연도 필터가 쓰는 원본 값(`YYYY-MM-DD` 또는 ISO datetime). */
  date: string | null;
  /** 화면에 찍는 `YYYY-MM-DD`. `fmtDate`를 서버에서 한 번만 돌린다. */
  dateLabel: string;
  readMin: number;
  /** `resolveThumbnailSrc`의 결과 — 없으면 빌드가 만든 OG 카드를 가리킨다. */
  thumb: string;
}

/** 태그·시리즈·연도 필터 그룹의 항목 하나. */
export interface FilterItem {
  id: string;
  label: string;
  count: number;
}

/**
 * 필터 패널이 받는 것 전부. **데스크톱 사이드바와 모바일 바텀시트가 같은 패널을
 * 세우므로** 호출부가 이 묶음을 한 번 만들어 두 자리에 편다 — 열다섯 개를 두 번
 * 적으면 한쪽만 고쳤을 때 두 화면이 조용히 갈린다.
 */
export interface FilterPanelProps {
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  view: ViewMode;
  onViewChange: (next: ViewMode) => void;
  tagItems: FilterItem[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  seriesItems: FilterItem[];
  activeSeries: string | null;
  onToggleSeries: (id: string) => void;
  yearItems: FilterItem[];
  activeYear: string | null;
  onToggleYear: (id: string) => void;
}
