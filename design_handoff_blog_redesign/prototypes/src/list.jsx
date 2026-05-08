// List/Archive page — 3 variations: A (Conservative), B (Mid), C (Bold)
const { useState: useStateL, useMemo: useMemoL } = React;

// ─────────── LIST A — Conservative: filter sidebar + simple list ───────────
window.ListA = function ListA() {
  const f = window.usePostFilter(window.POSTS);
  const [view, setView] = useStateL('list');
  return (
    <SiteFrame>
      <div style={{ maxWidth: 1200, margin: 'auto', padding: '40px 32px 64px' }}>
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--ink-border)' }}>
          <div className="label" style={{ marginBottom: 8 }}>POSTS / ARCHIVE</div>
          <h1 className="serif" style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em' }}>모든 노트</h1>
          <p className="serif" style={{ fontSize: 16, color: 'var(--ink-700)', marginTop: 8 }}>{window.POSTS.length}편 · 카테고리 {window.TAGS.length}개</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 48 }}>
          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: 80 }}>
              <SearchInput value={f.query} onChange={f.setQuery} />
              <div style={{ marginTop: 28 }}>
                <div className="label" style={{ marginBottom: 12 }}>정렬</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[['recent','최신순'],['popular','조회수'],['shortest','짧은순']].map(([id,l]) => (
                    <button key={id} onClick={() => f.setSort(id)}
                      className="serif"
                      style={{ textAlign: 'left', padding: '4px 0', fontSize: 14, fontStyle: f.sort===id?'italic':'normal', color: f.sort===id?'var(--marker-600)':'var(--ink-700)', borderBottom: '1px solid', borderColor: f.sort===id?'var(--marker-600)':'transparent' }}>
                      {f.sort===id?'→ ':''}{l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 28 }}>
                <div className="label" style={{ marginBottom: 12 }}>태그 ({f.activeTags.length} 선택)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {window.TAGS.map(t => {
                    const active = f.activeTags.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => f.setActiveTags(active ? f.activeTags.filter(x=>x!==t.id) : [...f.activeTags, t.id])}
                        className="mono"
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, color: active?'var(--paper-50)':'var(--ink-700)', background: active?'var(--ink-950)':'transparent', borderRadius: 4 }}>
                        <span>#{t.label}</span>
                        <span style={{ color: active?'var(--ink-300)':'var(--ink-400)' }}>{t.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 28 }}>
                <div className="label" style={{ marginBottom: 12 }}>보기</div>
                <div style={{ display: 'flex', border: '1px solid var(--ink-border)', borderRadius: 6, overflow: 'hidden' }}>
                  {[['list','리스트'],['card','카드']].map(([id,l]) => (
                    <button key={id} onClick={() => setView(id)}
                      className="mono"
                      style={{ flex: 1, padding: '8px', fontSize: 11, letterSpacing: '0.08em', background: view===id?'var(--ink-950)':'transparent', color: view===id?'var(--paper-50)':'var(--ink-600)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.08em' }}>{f.filtered.length}편</span>
              {f.activeTags.length > 0 && (
                <button onClick={() => f.setActiveTags([])} className="mono" style={{ fontSize: 11, color: 'var(--marker-600)' }}>필터 초기화 ✕</button>
              )}
            </div>
            {view === 'list' ? (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {f.filtered.map((p, i) => <PostRowA key={p.slug} post={p} idx={i + 1} />)}
              </ol>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {f.filtered.map(p => <PostCardSmall key={p.slug} post={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteFrame>
  );
};

function PostCardSmall({ post }) {
  return (
    <article style={{ border: '1px solid var(--ink-border)', padding: 20, background: 'var(--paper-50)', cursor: 'pointer' }}
      onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--ink-950)'}
      onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--ink-border)'}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 8 }}>{window.fmtDate(post.date)} · {post.readMin}min</div>
      <h3 className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.35, marginBottom: 8 }}>{post.title}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 10 }}>{post.excerpt}</p>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>{post.tags.map(t=>`#${t}`).join(' ')}</div>
    </article>
  );
}

// ─────────── LIST B — Mid: top filter bar + grouped by year/series ───────────
window.ListB = function ListB() {
  const f = window.usePostFilter(window.POSTS);
  const [groupBy, setGroupBy] = useStateL('series'); // year | series
  const grouped = useMemoL(() => {
    if (groupBy === 'year') {
      const map = {};
      f.filtered.forEach(p => {
        const y = p.date.slice(0, 4);
        if (!map[y]) map[y] = [];
        map[y].push(p);
      });
      return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]));
    }
    const map = { '__none': [] };
    f.filtered.forEach(p => {
      const k = p.series || '__none';
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    const series = Object.entries(map).filter(([k]) => k !== '__none');
    if (map['__none'].length) series.push(['단편', map['__none']]);
    return series;
  }, [f.filtered, groupBy]);

  return (
    <SiteFrame>
      {/* Hero strip */}
      <div style={{ background: 'var(--paper-100)', borderBottom: '1px solid var(--ink-border)', padding: '40px 32px' }}>
        <div style={{ maxWidth: 1200, margin: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>ARCHIVE / 색인</div>
            <h1 className="serif" style={{ fontSize: 56, fontWeight: 400, letterSpacing: '-0.025em' }}>
              모든 <span style={{ fontStyle: 'italic' }}>실험 노트</span>
            </h1>
          </div>
          <div style={{ width: 320 }}>
            <SearchInput value={f.query} onChange={f.setQuery} placeholder="제목 · 본문 · 태그 검색" />
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div style={{ borderBottom: '1px solid var(--ink-border)', background: 'rgba(252,250,247,0.95)', backdropFilter: 'blur(8px)', position: 'sticky', top: 56, zIndex: 4 }}>
        <div style={{ maxWidth: 1200, margin: 'auto', padding: '14px 32px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {window.TAGS.slice(0, 8).map(t => (
              <Tag key={t.id} size="sm" active={f.activeTags.includes(t.id)} onClick={() => {
                const a = f.activeTags.includes(t.id);
                f.setActiveTags(a ? f.activeTags.filter(x=>x!==t.id) : [...f.activeTags, t.id]);
              }}>#{t.label}</Tag>
            ))}
            {f.activeTags.length > 0 && <button onClick={() => f.setActiveTags([])} className="mono" style={{ fontSize: 11, color: 'var(--marker-600)', padding: '4px 8px' }}>초기화 ✕</button>}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="label" style={{ marginRight: 8 }}>그룹</span>
            {[['series','시리즈'],['year','연도']].map(([id,l]) => (
              <button key={id} onClick={() => setGroupBy(id)} className="mono" style={{ padding: '4px 10px', fontSize: 11, letterSpacing: '0.06em', borderRadius: 4, background: groupBy===id?'var(--ink-950)':'transparent', color: groupBy===id?'var(--paper-50)':'var(--ink-600)' }}>{l}</button>
            ))}
            <span style={{ width: 1, height: 16, background: 'var(--ink-border)', margin: '0 8px' }} />
            <span className="label" style={{ marginRight: 8 }}>정렬</span>
            <select value={f.sort} onChange={(e)=>f.setSort(e.target.value)} className="mono" style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-border)', borderRadius: 4, background: 'var(--paper-50)' }}>
              <option value="recent">최신순</option>
              <option value="popular">인기순</option>
              <option value="shortest">읽기시간 짧은순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouped list */}
      <div style={{ maxWidth: 1200, margin: 'auto', padding: '40px 32px 64px' }}>
        {grouped.length === 0 && (
          <p className="serif" style={{ fontSize: 18, color: 'var(--ink-500)', textAlign: 'center', padding: '80px 0' }}>해당하는 글이 없습니다.</p>
        )}
        {grouped.map(([key, posts], gi) => (
          <section key={key} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid var(--ink-950)' }}>
              <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, fontStyle: groupBy==='series' && key !== '단편' ?'italic':'normal' }}>
                {groupBy==='series' && key !== '단편' ? key : key}
              </h2>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{posts.length}편</span>
              <div style={{ flex: 1 }} />
              {groupBy==='series' && key !== '단편' && <span className="serif" style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--accent-600)' }}>시리즈 전체 →</span>}
            </div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {posts.map((p, i) => (
                <li key={p.slug} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 220px 100px', gap: 16, padding: '12px 0', borderBottom: '1px dotted var(--ink-300)', cursor: 'pointer', alignItems: 'baseline' }}
                  onMouseEnter={(e)=>e.currentTarget.style.background='var(--marker-100)'}
                  onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{groupBy==='series' && p.seriesIdx ? `#${p.seriesIdx}` : String(i+1).padStart(2,'0')}</span>
                  <h4 className="serif" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.4 }}>{p.title}</h4>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-600)' }}>{p.tags.map(t=>`#${t}`).join(' ')}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'right' }}>{window.fmtDate(p.date)}</div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </SiteFrame>
  );
};

// ─────────── LIST C — Bold: timeline w/ density toggle + tag cloud ───────────
window.ListC = function ListC() {
  const f = window.usePostFilter(window.POSTS);
  const [density, setDensity] = useStateL('comfortable'); // compact | comfortable
  const byMonth = useMemoL(() => {
    const map = {};
    f.filtered.forEach(p => {
      const k = p.date.slice(0, 7);
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]));
  }, [f.filtered]);

  return (
    <SiteFrame themeBg="var(--paper-100)">
      {/* Index header */}
      <header style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: '48px 32px' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--marker-300)', marginBottom: 16 }}>FULL ARCHIVE / TIMELINE</div>
          <h1 className="serif" style={{ fontSize: 76, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 0.95, color: 'var(--paper-50)' }}>
            <span style={{ fontStyle: 'italic' }}>{window.POSTS.length}편</span>의 노트, <br />
            한 페이지 안에.
          </h1>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {window.TAGS.map(t => {
              const active = f.activeTags.includes(t.id);
              return (
                <button key={t.id} onClick={() => {
                  f.setActiveTags(active ? f.activeTags.filter(x=>x!==t.id) : [...f.activeTags, t.id]);
                }}
                  className="mono"
                  style={{
                    fontSize: 11 + Math.min(t.count, 6) * 1.5,
                    color: active ? 'var(--ink-950)' : 'var(--paper-50)',
                    background: active ? 'var(--marker-300)' : 'transparent',
                    padding: '4px 10px',
                    border: `1px solid ${active ? 'var(--marker-300)' : 'oklch(40% 0.022 60)'}`,
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                  }}>
                  #{t.label} · {t.count}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Control bar */}
      <div style={{ borderBottom: '1px solid var(--ink-border)', background: 'var(--paper-50)', padding: '14px 32px', position: 'sticky', top: 56, zIndex: 4 }}>
        <div style={{ maxWidth: 1200, margin: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, maxWidth: 380 }}>
            <SearchInput value={f.query} onChange={f.setQuery} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{f.filtered.length} 결과</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="label" style={{ marginRight: 8 }}>밀도</span>
            {[['compact','촘촘'],['comfortable','넉넉']].map(([id,l]) => (
              <button key={id} onClick={()=>setDensity(id)} className="mono" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, background: density===id?'var(--ink-950)':'transparent', color: density===id?'var(--paper-50)':'var(--ink-600)' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 1200, margin: 'auto', padding: '40px 32px 64px' }}>
        {byMonth.map(([month, posts]) => {
          const [y, m] = month.split('-');
          const monthName = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'][parseInt(m)-1];
          return (
            <section key={month} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 32, marginBottom: density==='compact'?16:32, position: 'relative' }}>
              <div style={{ position: 'sticky', top: 130, alignSelf: 'start' }}>
                <div className="serif" style={{ fontSize: 32, fontWeight: 500, fontStyle: 'italic', lineHeight: 1, color: 'var(--ink-950)' }}>{monthName}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.08em', marginTop: 4 }}>{y} · {posts.length}편</div>
              </div>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: '1px solid var(--ink-border)', paddingLeft: 32, position: 'relative' }}>
                {posts.map((p, i) => (
                  <li key={p.slug} style={{ position: 'relative', padding: density==='compact'?'8px 0':'18px 0', borderBottom: '1px dotted var(--ink-300)', cursor: 'pointer' }}
                    onMouseEnter={(e)=>{e.currentTarget.style.background='var(--marker-100)'; e.currentTarget.style.paddingLeft='12px';}}
                    onMouseLeave={(e)=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.paddingLeft='0';}}>
                    <span style={{ position: 'absolute', left: -36, top: density==='compact'?14:24, width: 8, height: 8, borderRadius: '50%', background: p.popular?'var(--marker-300)':'var(--paper-50)', border: '2px solid var(--ink-950)', transition: 'left .15s' }} />
                    {density === 'compact' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 200px 80px', gap: 12, alignItems: 'baseline', transition: 'padding .15s' }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{window.fmtDate(p.date).slice(5)}</span>
                        <h4 className="serif" style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</h4>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-600)' }}>{p.tags.slice(0,3).map(t=>`#${t}`).join(' ')}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', textAlign: 'right' }}>{p.readMin}m</span>
                      </div>
                    ) : (
                      <div style={{ transition: 'padding .15s' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{window.fmtDate(p.date)}</span>
                          {p.series && <span className="mono" style={{ fontSize: 10, color: 'var(--marker-600)', letterSpacing: '0.06em' }}>{p.series} · #{p.seriesIdx}</span>}
                          {p.popular && <span className="mono" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--marker-300)', color: 'var(--ink-950)' }}>POPULAR</span>}
                        </div>
                        <h4 className="serif" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{p.title}</h4>
                        <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.55, marginBottom: 8 }}>{p.excerpt}</p>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>{p.tags.map(t=>`#${t}`).join('  ')} · {p.readMin}min · {window.fmtNum(p.views)} reads</div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </SiteFrame>
  );
};
