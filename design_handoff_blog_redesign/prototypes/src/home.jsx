// Home — 3 variations: A (Conservative), B (Mid), C (Bold)
const { useState: useStateH } = React;

// ─────────── HOME A — Conservative: refined journal index, two-column ───────────
window.HomeA = function HomeA() {
  const [q, setQ] = useStateH('');
  const recent = window.POSTS.slice(0, 6);
  const popular = window.POSTS.filter(p => p.popular).slice(0, 4);
  return (
    <SiteFrame>
      {/* Masthead */}
      <header style={{ borderBottom: '1px solid var(--ink-border)', padding: '64px 32px 56px', background: 'var(--paper-50)' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--marker-600)', letterSpacing: '0.16em', marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span>VOL. 03 · ISSUE 17</span>
            <span style={{ flex: 1, height: 1, background: 'var(--ink-border)' }} />
            <span>2026 · 4월호</span>
          </div>
          <h1 className="serif" style={{ fontSize: 72, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 24, fontFamily: 'var(--font-serif)' }}>
            공부하다 남긴<br />
            <span style={{ fontStyle: 'italic', color: 'var(--ink-700)' }}>짧은 노트</span>들.
          </h1>
          <p className="serif" style={{ fontSize: 19, color: 'var(--ink-700)', maxWidth: 620, lineHeight: 1.6 }}>
            실험하고 기록하며 성장하는 프론트엔드 엔지니어 <span className="marker">한상욱</span>의 공간. TypeScript 설계 패턴, 번들러 내부 구조, 오픈소스 기여 경험을 노트처럼 남깁니다.
          </p>
          <div style={{ marginTop: 32, maxWidth: 480 }}>
            <SearchInput value={q} onChange={setQ} placeholder="이 노트장에서 찾기…" />
          </div>
        </div>
      </header>

      {/* Two-col index */}
      <div style={{ maxWidth: 1200, margin: 'auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: '7fr 4fr', gap: 64 }}>
        <section>
          <SectionHead num="01" eyebrow="LATEST ENTRIES" title="최근 기록" right={<a className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.08em' }}>모두 보기 →</a>} />
          <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
            {recent.map((p, i) => <PostRowA key={p.slug} post={p} idx={i + 1} />)}
          </ol>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Popular */}
          <section>
            <SectionHead num="02" eyebrow="MOST READ" title="이 달의 정독" />
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {popular.map((p, i) => (
                <li key={p.slug} style={{ display: 'flex', gap: 14, paddingTop: 14, borderTop: i ? '1px solid var(--ink-200)' : 'none' }}>
                  <span className="serif" style={{ fontSize: 24, fontStyle: 'italic', color: 'var(--marker-600)', minWidth: 32, fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1 }}>
                    <a className="serif" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-950)', display: 'block', lineHeight: 1.4, cursor: 'pointer' }}>{p.title}</a>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '0.04em' }}>
                      {window.fmtNum(p.views)} reads · {p.readMin}min
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Series */}
          <section>
            <SectionHead num="03" eyebrow="ONGOING SERIES" title="연재 노트" />
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {window.SERIES.map(s => (
                <li key={s.id} style={{ paddingTop: 14, borderTop: '1px solid var(--ink-200)', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="serif" style={{ fontSize: 16, fontWeight: 500, fontStyle: 'italic' }}>{s.title}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{s.count}편</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 4, lineHeight: 1.55 }}>{s.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </SiteFrame>
  );
};

function PostRowA({ post, idx }) {
  const [hover, setHover] = useStateH(false);
  return (
    <li
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px', gap: 20, padding: '22px 0', borderBottom: '1px solid var(--ink-200)', cursor: 'pointer', alignItems: 'baseline', position: 'relative' }}
    >
      <span className="mono" style={{ fontSize: 11, color: hover ? 'var(--marker-600)' : 'var(--ink-400)', letterSpacing: '0.08em', transition: 'color .2s' }}>{String(idx).padStart(2, '0')}</span>
      <div>
        <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25, color: 'var(--ink-950)', marginBottom: 6, transition: 'color .15s' }}>
          {hover && <span style={{ color: 'var(--marker-600)' }}>— </span>}{post.title}
        </h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', lineHeight: 1.6, marginBottom: 8 }}>{post.excerpt}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {post.series && <span className="mono" style={{ fontSize: 10, color: 'var(--marker-600)', letterSpacing: '0.06em' }}>{post.series} · #{post.seriesIdx}</span>}
          {post.tags.slice(0, 3).map(t => <span key={t} className="mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>#{t}</span>)}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{window.fmtDate(post.date)}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>{post.readMin}min · {window.fmtNum(post.views)}</div>
      </div>
    </li>
  );
}

// ─────────── HOME B — Mid: editorial grid w/ feature card + dense index ───────────
window.HomeB = function HomeB() {
  const [tab, setTab] = useStateH('latest');
  const feature = window.POSTS[0];
  const others = window.POSTS.slice(1, 5);
  const list = tab === 'latest' ? window.POSTS.slice(0, 8)
              : tab === 'popular' ? [...window.POSTS].sort((a,b)=>b.views-a.views).slice(0, 8)
              : window.POSTS.filter(p => p.series).slice(0, 8);
  return (
    <SiteFrame>
      {/* Top strip */}
      <div style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: '8px 32px' }}>
        <div className="mono" style={{ maxWidth: 1200, margin: 'auto', fontSize: 11, letterSpacing: '0.08em', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--marker-300)' }}>● LIVE</span>
          <span>지금 작성 중 ─ "Module Federation 실무 도입기 #6"</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--ink-400)' }}>2026.05.08 목요일 · 서울</span>
        </div>
      </div>

      {/* Hero with feature card */}
      <header style={{ padding: '48px 32px 0' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--ink-500)', marginBottom: 16 }}>FRONTEND LAB · 한상욱의 실험 노트</div>
          <h1 className="serif" style={{ fontSize: 88, fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
            그냥,<br />
            <span style={{ fontStyle: 'italic' }}>적어 두는</span> 공부방.
          </h1>
          <p className="serif" style={{ fontSize: 20, color: 'var(--ink-700)', maxWidth: 580, lineHeight: 1.55, marginBottom: 40 }}>
            번들러, 타입 시스템, 컴파일러. 추상화의 한 층 아래를 직접 걸어보고 남기는 기록.
          </p>
        </div>
      </header>

      {/* Feature + sidebar */}
      <section style={{ padding: '0 32px 56px' }}>
        <div style={{ maxWidth: 1200, margin: 'auto', display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 48, paddingTop: 40, borderTop: '2px solid var(--ink-950)' }}>
          {/* Feature */}
          <article style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
              <span className="mono" style={{ fontSize: 10, padding: '3px 8px', background: 'var(--marker-300)', color: 'var(--ink-950)', letterSpacing: '0.08em' }}>FEATURE</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{feature.series} · #{feature.seriesIdx}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>· {window.fmtDate(feature.date)}</span>
            </div>
            <ImgPlaceholder label="이 글의 헤더 일러스트 — webpack/vite 그래프 시각화" h={300} bg="var(--paper-100)" />
            <h2 className="serif" style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '24px 0 12px', color: 'var(--ink-950)' }}>{feature.title}</h2>
            <p className="serif" style={{ fontSize: 17, color: 'var(--ink-700)', lineHeight: 1.6, marginBottom: 16 }}>{feature.excerpt} 의존성 그래프가 만들어지는 순간을 단계별로 들여다본다.</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{feature.readMin}분 정독 · {window.fmtNum(feature.views)} reads</span>
              <span style={{ flex: 1 }} />
              <span className="serif" style={{ fontStyle: 'italic', fontSize: 14, color: 'var(--accent-600)' }}>전문 읽기 →</span>
            </div>
          </article>

          {/* Side stack */}
          <aside>
            <div className="label" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--ink-border)' }}>이번 주 함께 읽기 좋은 글</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {others.map((p, i) => (
                <li key={p.slug} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--ink-200)', cursor: 'pointer' }}>
                  <span className="serif" style={{ fontSize: 28, fontWeight: 400, fontStyle: 'italic', color: 'var(--ink-300)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h4 className="serif" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, marginBottom: 6 }}>{p.title}</h4>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.04em' }}>
                      {p.tags.slice(0, 2).map(t => `#${t}`).join(' · ')} · {p.readMin}min
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Tabbed index */}
      <section style={{ background: 'var(--paper-100)', borderTop: '1px solid var(--ink-border)', borderBottom: '1px solid var(--ink-border)', padding: '56px 32px' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 32 }}>
            <h3 className="serif" style={{ fontSize: 28, fontWeight: 500 }}>색인</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['latest','최신순'],['popular','인기순'],['series','시리즈']].map(([id,label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className="mono"
                  style={{ padding: '6px 12px', fontSize: 12, color: tab===id?'var(--ink-950)':'var(--ink-500)',
                    background: tab===id?'var(--paper-50)':'transparent', border: '1px solid', borderColor: tab===id?'var(--ink-950)':'var(--ink-border)',
                    borderRadius: 6, letterSpacing: '0.06em' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>총 {window.POSTS.length}편</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 48, rowGap: 0 }}>
            {list.map((p, i) => (
              <a key={p.slug} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px', gap: 12, padding: '14px 0', borderBottom: '1px dotted var(--ink-300)', cursor: 'pointer', alignItems: 'baseline' }}
                onMouseEnter={(e)=>e.currentTarget.querySelector('h4').style.color='var(--accent-600)'}
                onMouseLeave={(e)=>e.currentTarget.querySelector('h4').style.color='var(--ink-950)'}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{String(i+1).padStart(3,'0')}</span>
                <h4 className="serif" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, transition: 'color .15s' }}>{p.title}</h4>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', textAlign: 'right' }}>{p.readMin}min</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </SiteFrame>
  );
};

// ─────────── HOME C — Bold: lab notebook, archive index style ───────────
window.HomeC = function HomeC() {
  const [hover, setHover] = useStateH(null);
  const [searchQ, setSearchQ] = useStateH('');
  const all = window.POSTS;
  return (
    <SiteFrame themeBg="var(--paper-100)">
      {/* Wide header w/ index strip */}
      <header style={{ borderBottom: '2px solid var(--ink-950)', padding: '40px 32px 24px', background: 'var(--paper-50)', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.16em', marginBottom: 20 }}>
            <span>FRONTEND-LAB / NOTEBOOK</span>
            <span>fol. 0247 — 2026.05.08</span>
            <span>한상욱 · SANGWOOK HAN</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 48, alignItems: 'end' }}>
            <h1 className="serif" style={{ fontSize: 120, fontWeight: 400, lineHeight: 0.92, letterSpacing: '-0.04em', margin: 0 }}>
              <span style={{ display: 'inline-block', borderBottom: '4px solid var(--marker-300)', paddingBottom: 4 }}>공부방</span>에<br />
              <span style={{ fontStyle: 'italic', color: 'var(--ink-700)' }}>그냥 쌓아둔</span> 메모.
            </h1>
            <div>
              <div className="serif" style={{ fontSize: 14, color: 'var(--ink-700)', lineHeight: 1.55, marginBottom: 16, fontStyle: 'italic' }}>
                정제되기 전의 메모, 코드 한 줄을 두고 6시간 헤맨 흔적, 결국 PR로 통과한 결정들 — 모두 같은 노트장에 둡니다.
              </div>
              <SearchInput value={searchQ} onChange={setSearchQ} placeholder="노트 검색" />
            </div>
          </div>
        </div>
      </header>

      {/* Counter strip */}
      <div style={{ borderBottom: '1px solid var(--ink-border)', background: 'var(--paper-50)', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1200, margin: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32, alignItems: 'baseline' }}>
          {[
            { n: '33', l: '글' }, { n: '3', l: '연재' }, { n: '38', l: '오픈소스 PR' }, { n: '84K', l: '월간 조회' }, { n: '2.4Y', l: '운영' }
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: i?16:0, borderLeft: i?'1px solid var(--ink-200)':'none' }}>
              <span className="serif" style={{ fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--ink-950)' }}>{s.n}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Series shelf */}
      <section style={{ padding: '40px 32px', borderBottom: '1px solid var(--ink-border)' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <SectionHead num="A" eyebrow="ONGOING SERIES" title="연재 노트" right={<span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>3개 시리즈 · 17편</span>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 24 }}>
            {window.SERIES.map((s, i) => (
              <article key={s.id} style={{ background: 'var(--paper-50)', border: '1px solid var(--ink-border)', padding: 24, position: 'relative', cursor: 'pointer', minHeight: 220 }}
                onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--ink-950)'}
                onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--ink-border)'}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: i===0?'var(--accent-600)':i===1?'var(--marker-300)':'var(--moss-100)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.12em', marginBottom: 8 }}>SERIES · {String(i+1).padStart(2,'0')}</div>
                <h3 className="serif" style={{ fontSize: 24, fontWeight: 500, fontStyle: 'italic', marginBottom: 12, lineHeight: 1.2 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, marginBottom: 16 }}>{s.desc}</p>
                <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--ink-200)', paddingTop: 12 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-700)' }}>{s.count}편 · 진행중</span>
                  <span className="serif" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--accent-600)' }}>이어 읽기 →</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Big archive index */}
      <section style={{ padding: '48px 32px', background: 'var(--paper-50)' }}>
        <div style={{ maxWidth: 1200, margin: 'auto' }}>
          <SectionHead num="B" eyebrow="FULL INDEX" title="전체 색인" right={
            <div style={{ display: 'flex', gap: 6 }}>
              {window.TAGS.slice(0,4).map(t => <Tag key={t.id} size="sm">#{t.label} · {t.count}</Tag>)}
              <Tag size="sm">···</Tag>
            </div>
          } />
          <ol style={{ listStyle: 'none', padding: 0, margin: '0' }}>
            {all.slice(0, 12).map((p, i) => (
              <li key={p.slug}
                onMouseEnter={() => setHover(p.slug)} onMouseLeave={() => setHover(null)}
                style={{ display: 'grid', gridTemplateColumns: '50px 1fr 200px 90px 70px', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--ink-200)', cursor: 'pointer', alignItems: 'baseline', position: 'relative', background: hover===p.slug?'var(--marker-100)':'transparent', transition: 'background .15s', marginLeft: -8, paddingLeft: 8, paddingRight: 8, marginRight: -8 }}>
                <span className="mono" style={{ fontSize: 11, color: hover===p.slug?'var(--marker-600)':'var(--ink-400)', letterSpacing: '0.08em' }}>{String(all.length-i).padStart(3,'0')}</span>
                <h4 className="serif" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.35, color: 'var(--ink-950)' }}>
                  {p.title}
                </h4>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-600)' }}>
                  {p.tags.map(t => `#${t}`).join('  ')}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{window.fmtDate(p.date)}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'right' }}>{p.readMin}m / {window.fmtNum(p.views)}</div>
              </li>
            ))}
          </ol>
          <div style={{ paddingTop: 20, textAlign: 'center' }}>
            <span className="serif" style={{ fontStyle: 'italic', fontSize: 15, color: 'var(--ink-500)' }}>… 21편 더 보기 →</span>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
};
