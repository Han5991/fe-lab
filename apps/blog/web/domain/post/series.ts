import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');

export interface SeriesMeta {
  name: string;
  title?: string;
  description?: string;
  order?: string[];
}

const _metaCache = new Map<string, SeriesMeta | null>();

export function getSeriesMeta(seriesName: string): SeriesMeta | null {
  if (process.env.NODE_ENV !== 'development' && _metaCache.has(seriesName)) {
    return _metaCache.get(seriesName) ?? null;
  }

  const candidates = ['_series.yml', '_series.yaml'].map(name =>
    join(postsDirectory, seriesName, name),
  );
  const filePath = candidates.find(p => existsSync(p)) ?? null;

  if (!filePath) {
    _metaCache.set(seriesName, null);
    return null;
  }

  const raw = readFileSync(filePath, 'utf8');
  const { data } = matter(`---\n${raw}\n---\n`);

  const meta: SeriesMeta = {
    name: seriesName,
    title: typeof data.title === 'string' ? data.title : undefined,
    description:
      typeof data.description === 'string' ? data.description : undefined,
    order: Array.isArray(data.order)
      ? data.order.filter((s): s is string => typeof s === 'string')
      : undefined,
  };

  _metaCache.set(seriesName, meta);
  return meta;
}

export function clearSeriesMetaCache(): void {
  _metaCache.clear();
}
