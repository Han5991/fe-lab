// Analytics dashboard variation + Section 5 ideas
const { useState: useStateA, useMemo: useMemoA } = React;

window.Analytics = function Analytics() {
  const [range, setRange] = useStateA('30d');
  const [hovered, setHovered] = useStateA(null);
  const a = window.ANALYTICS;
  return (
    <div className="felab" style={{ width: 1280, minHeight: 880, background: 'var(--paper-50)', overflow: 'hidden' }}>
      {/* Admin frame */}
      <div style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="serif" style={{ fontSize: 16, fontWeight: 500, fontStyle: 'italic' }}>Frontend Lab</span>
        <span className="mono" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--marker-300)', color: 'var(--ink-950)', letterSpacing: '0.08em' }}>ADMIN</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-300)' }}>한상욱 · sangwook@</span>
      </div>

      {/* Page header */}
      <header style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--ink-border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>ANALYTICS / OVERVIEW</div>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.015em' }}>독자들이 무엇을 읽고 있는가</h1>
          </div>
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--ink-border)', borderRadius: 6, padding: 2, background: 'var(--paper-100)' }}>
            {[['7d','7일'],['30d','30일'],['90d','90일'],['1y','1년']].map(([id,l]) => (
              <button key={id} onClick={() => setRange(id)} className="mono" style={{ padding: '6px 14px', fontSize: 11, borderRadius: 4, background: range===id?'var(--ink-950)':'transparent', color: range===id?'var(--paper-50)':'var(--ink-600)', letterSpacing: '0.06em' }}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Summary stat row */}
      <section style={{ padding: '32px', borderBottom: '1px solid var(--ink-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          <StatCard num={window.fmtNum(a.total)} label="총 조회수" delta={a.totalDelta} series={a.totalSeries} />
          <StatCard num={window.fmtNum(a.uniques)} label="고유 방문자" delta={a.uniquesDelta} series={a.totalSeries.map(d => ({ ...d, value: Math.round(d.value * 0.5) }))} />
          <StatCard num="2:48" label="평균 체류시간" delta={0.04} small="3분 미만 의미 있음" />
          <StatCard num="68%" label="스크롤 완독률" delta={0.06} small="50% 이상 도달" />
        </div>
      </section>

      {/* Main chart */}
      <section style={{ padding: '32px', borderBottom: '1px solid var(--ink-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 20, fontWeight: 500 }}>조회수 추이</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{a.range}</span>
          <div style={{ flex: 1 }} />
          <Legend items={[
            { color: 'var(--ink-950)', label: '총 조회수' },
            { color: 'var(--marker-600)', label: '인기 글 (4편)' },
          ]} />
        </div>
        <BigChart series={a.totalSeries} hovered={hovered} setHovered={setHovered} />
      </section>

      {/* Top posts ranking */}
      <section style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 48 }}>
          <div>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--ink-border)' }}>글별 조회수 랭킹</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {a.topPosts.map((p, i) => (
                <div key={p.slug} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px 80px 60px', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px dotted var(--ink-300)' }}>
                  <span className="serif" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--marker-600)', fontWeight: 500 }}>{String(i+1).padStart(2,'0')}</span>
                  <div>
                    <h4 className="serif" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{p.title}</h4>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>/posts/{p.slug}</span>
                  </div>
                  <Sparkline data={p.series} w={100} h={24} color="var(--ink-700)" fill="var(--ink-700)" />
                  <div className="mono" style={{ fontSize: 13, color: 'var(--ink-950)', textAlign: 'right' }}>{window.fmtNum(p.views)}</div>
                  <div className="mono" style={{ fontSize: 11, color: p.delta >= 0 ? 'var(--moss-600)' : 'var(--marker-600)', textAlign: 'right' }}>
                    {p.delta >= 0 ? '↑' : '↓'} {Math.abs(p.delta * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 500, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--ink-border)' }}>태그별 분포</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {window.TAGS.slice(0, 8).map(t => {
                const max = Math.max(...window.TAGS.map(x => x.count));
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 30px', gap: 12, alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-700)' }}>#{t.label}</span>
                    <div style={{ height: 14, background: 'var(--paper-100)', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(t.count/max)*100}%`, background: t.id === 'bundler' ? 'var(--marker-300)' : 'var(--ink-700)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'right' }}>{t.count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 24, padding: 16, background: 'var(--marker-100)', borderLeft: '3px solid var(--marker-300)' }} className="serif">
              <div className="label" style={{ marginBottom: 4 }}>요약 / 메모</div>
              <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-800)', lineHeight: 1.55 }}>
                "번들러" 시리즈가 30일간 조회수의 41%를 가져갔다. React 19 단편이 유입 1위.
                다음 글은 시리즈 #4로 잇는 게 좋겠다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

function StatCard({ num, label, delta, series, small }) {
  return (
    <div style={{ paddingBottom: 0 }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <span className="serif" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>{num}</span>
        {series && <Sparkline data={series} w={80} h={32} color="var(--ink-700)" fill="var(--ink-700)" />}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 8 }}>
        {delta !== undefined && (
          <span className="mono" style={{ fontSize: 11, color: delta >= 0 ? 'var(--moss-600)' : 'var(--marker-600)' }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {small && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)' }}>{small}</span>}
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 10, height: 2, background: it.color }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-600)', letterSpacing: '0.06em' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function BigChart({ series, hovered, setHovered }) {
  const w = 1216, h = 220, pad = 32;
  const vals = series.map(d => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((d, i) => [pad + i * step, h - pad - ((d.value - min) / range) * (h - pad * 2)]);
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1][0]},${h-pad} L${pad},${h-pad} Z`;
  return (
    <div style={{ position: 'relative' }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
          <line key={i} x1={pad} y1={pad + g * (h - pad * 2)} x2={w - pad} y2={pad + g * (h - pad * 2)} stroke="var(--ink-200)" strokeWidth="1" strokeDasharray={i===0||i===4?'none':'2 4'} />
        ))}
        <path d={areaPath} fill="var(--ink-950)" opacity="0.06" />
        <path d={linePath} fill="none" stroke="var(--ink-950)" strokeWidth="1.5" />
        {hovered != null && (
          <>
            <line x1={pts[hovered][0]} y1={pad} x2={pts[hovered][0]} y2={h - pad} stroke="var(--marker-600)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={pts[hovered][0]} cy={pts[hovered][1]} r="5" fill="var(--marker-300)" stroke="var(--ink-950)" strokeWidth="1.5" />
          </>
        )}
        {/* hit areas */}
        {pts.map((p, i) => (
          <rect key={i} x={p[0] - step/2} y={0} width={step} height={h} fill="transparent"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'crosshair' }} />
        ))}
      </svg>
      {hovered != null && (
        <div style={{ position: 'absolute', left: Math.min(pts[hovered][0] + 12, w - 160), top: pts[hovered][1] - 50, background: 'var(--ink-950)', color: 'var(--paper-50)', padding: '8px 12px', pointerEvents: 'none', minWidth: 140 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--marker-300)', letterSpacing: '0.08em' }}>DAY {hovered + 1}</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 500, fontStyle: 'italic' }}>{window.fmtNum(series[hovered].value)} <span style={{ fontSize: 11, color: 'var(--ink-300)' }}>views</span></div>
        </div>
      )}
    </div>
  );
}

// ─────────── SECTION 5 — proposals (concept cards, not built-out) ───────────
window.Section5 = function Section5() {
  const ideas = [
    {
      tag: 'embed',
      title: '포스트 안에 인터랙티브 데모',
      sub: '코드 옆에 직접 돌리는 데모를 끼운다.',
      desc: 'webpack vs vite의 빌드 단계를 실제로 ▶︎재생 해 보고, 슬라이더로 모듈 수를 조절하면 시간이 어떻게 변하는지 즉시 볼 수 있게. <BundlerDemo />, <DepGraphDemo />, <DiffPlayer /> 같은 임베디드 컴포넌트를 MDX 안에서 자유롭게 호출.',
      sketchType: 'demo',
    },
    {
      tag: 'series',
      title: '시리즈 진행률 + 다음 글 예고',
      sub: '연재의 흐름을 시각화한다.',
      desc: '글 하단에 시리즈의 5개 칸이 보이고, 현재 위치가 점으로 찍히고, 다음 글이 무엇인지 카드로. "오픈소스 일기"처럼 8편짜리 긴 시리즈일수록 효과가 큼.',
      sketchType: 'series',
    },
    {
      tag: 'TIL',
      title: 'TIL / 짧은 노트',
      sub: '글을 쓰기에는 짧은 발견들.',
      desc: '"오늘 알게 된 것" — 트위터에 쓸 만한 1-2줄짜리 메모를 별도 스트림으로. 검색 가능, 태그 가능, 1년 뒤 검색하면 자기 자신에게 가장 도움.',
      sketchType: 'til',
    },
    {
      tag: 'now',
      title: 'Now / Reading list 페이지',
      sub: '"지금 무엇을 보고 있나" 한 페이지.',
      desc: '읽고 있는 책, 보고 있는 강의, 만지고 있는 코드. 한 달에 한 번 갱신되는 정적 페이지로 충분. 첫 방문자가 "이 사람이 어떤 사람인가"를 가장 빠르게 이해하게 됨.',
      sketchType: 'now',
    },
    {
      tag: 'cmd-k',
      title: '⌘K 검색 강화',
      sub: '글 + 태그 + 시리즈 + 페이지를 한 번에.',
      desc: '제목/본문 검색에 그치지 않고, 태그로 점프, 시리즈로 점프, 외부 링크(GitHub PR, 슬라이드)도 검색 결과에 같이 노출. 키보드로 모든 글에 도달.',
      sketchType: 'cmdk',
    },
  ];
  return (
    <div className="felab" style={{ width: 1280, padding: 40, background: 'var(--paper-100)' }}>
      <div style={{ marginBottom: 32 }}>
        <div className="label" style={{ marginBottom: 8 }}>SECTION 05 — PROPOSALS</div>
        <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em' }}>새 기능 제안 5가지</h1>
        <p className="serif" style={{ fontSize: 16, color: 'var(--ink-700)', marginTop: 8, fontStyle: 'italic' }}>이번엔 만들지 않고 컨셉만 — 어느 게 흥미로운지 골라 주세요.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {ideas.map((idea, i) => (
          <article key={i} style={{ background: 'var(--paper-50)', border: '1px solid var(--ink-border)', padding: 24, display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--marker-300)', color: 'var(--ink-950)', letterSpacing: '0.08em' }}>IDEA · {String(i+1).padStart(2, '0')}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.08em' }}>{idea.tag}</span>
              </div>
              <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25, marginBottom: 4 }}>{idea.title}</h3>
              <p className="serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-600)', marginBottom: 12 }}>{idea.sub}</p>
              <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>{idea.desc}</p>
            </div>
            <IdeaSketch type={idea.sketchType} />
          </article>
        ))}
      </div>
    </div>
  );
};

function IdeaSketch({ type }) {
  const wrap = { background: 'var(--paper-100)', border: '1px solid var(--ink-border)', height: 200, padding: 12, position: 'relative', overflow: 'hidden' };
  if (type === 'demo') return (
    <div style={wrap}>
      <div className="mono" style={{ fontSize: 9, color: 'var(--marker-600)', letterSpacing: '0.1em', marginBottom: 8 }}>● LIVE</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[1,1,1,0,0].map((v,i) => <div key={i} style={{ flex: 1, height: 4, background: v?'var(--marker-300)':'var(--ink-200)' }} />)}
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-700)', background: 'var(--paper-50)', padding: 8, borderLeft: '2px solid var(--marker-300)', lineHeight: 1.5 }}>⚙ esbuild로 0.4ms만에 ts → js 변환</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span className="mono" style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--ink-border)' }}>▶ 재생</span>
      </div>
    </div>
  );
  if (type === 'series') return (
    <div style={wrap}>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-500)', letterSpacing: '0.1em', marginBottom: 12 }}>SERIES · 03 / 05</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[1,1,2,0,0].map((v,i) => (
          <div key={i} style={{ flex: 1, height: 6, background: v===1?'var(--ink-700)':v===2?'var(--marker-300)':'var(--ink-200)' }} />
        ))}
      </div>
      <div style={{ background: 'var(--paper-50)', border: '1px solid var(--ink-border)', padding: 8 }}>
        <div className="mono" style={{ fontSize: 8, color: 'var(--marker-600)', marginBottom: 2 }}>NEXT · #04</div>
        <div className="serif" style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>Rollup tree-shaking의 함정</div>
      </div>
    </div>
  );
  if (type === 'til') return (
    <div style={wrap}>
      {['vite의 deps optimizer는 esbuild 호출을 캐싱한다','TypeScript 5.4의 NoInfer 마커는 함수 추론을 좁힌다','React 19 use()는 사실 Babel 변환에 비밀이 있다'].map((t,i) => (
        <div key={i} style={{ borderLeft: '2px solid var(--marker-300)', paddingLeft: 8, marginBottom: 8 }}>
          <div className="mono" style={{ fontSize: 8, color: 'var(--ink-500)' }}>2026.05.0{8-i}</div>
          <div className="serif" style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--ink-800)' }}>{t}</div>
        </div>
      ))}
    </div>
  );
  if (type === 'now') return (
    <div style={wrap}>
      <div className="serif" style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 10 }}>지금</div>
      <div style={{ fontSize: 11, color: 'var(--ink-700)', lineHeight: 1.7 }}>
        <div>📖 <span className="serif">Crafting Interpreters</span></div>
        <div>🛠 vite plugin api v6 마이그</div>
        <div>🎯 Mantine v8 PR 리뷰</div>
        <div>🌱 한국어 폰트 메트릭 노트</div>
      </div>
    </div>
  );
  if (type === 'cmdk') return (
    <div style={wrap}>
      <div style={{ background: 'var(--paper-50)', border: '1px solid var(--ink-950)', padding: 10 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 8 }}>› bundler_</div>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div className="serif" style={{ background: 'var(--marker-100)', padding: '2px 4px' }}>📄 webpack vs vite — 그래프 빌드</div>
          <div className="serif">📄 esbuild 플러그인을 직접…</div>
          <div className="serif" style={{ color: 'var(--ink-500)' }}>🏷 #bundler · 6편</div>
          <div className="serif" style={{ color: 'var(--ink-500)' }}>📚 시리즈: 번들러 밑바닥부터</div>
        </div>
      </div>
    </div>
  );
  return null;
}
