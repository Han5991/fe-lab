// Post detail — 3 variations: A (Conservative), B (Sidenotes), C (Bold lab notebook)
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

const SAMPLE_BODY = [
  { type: 'p', text: '번들러 안에 들어가 본 사람이라면 누구나 같은 질문을 한 번씩 한다. "왜 이렇게 느려?" 그 답을 찾으려면 의존성 그래프가 만들어지는 순간으로 거슬러 올라가야 한다.' },
  { type: 'h2', text: '1. webpack의 그래프 빌드' },
  { type: 'p', text: 'webpack은 entry로부터 시작해 각 모듈을 enhanced-resolve로 해소하고, NormalModule을 만든다. 이 과정에서 매 모듈마다 loader 체인을 거쳐 코드를 변환한다.', note: { type: 'side', text: '엄밀하게는 loader가 아니라 parser가 코드를 AST로 만든다. 다만 변환 작업의 90%는 loader 체인 안에서 일어난다.' } },
  { type: 'p', text: '여기서 핵심은 "각 모듈을 만난 시점에 변환을 결정한다"는 점. 즉 그래프 빌드와 코드 변환이 같은 패스 안에서 이루어진다.', note: { type: 'fn', n: 1, text: 'webpack 5에서 도입된 lazy compilation은 이 원칙을 일부 깬다 — 진입점이 아닌 모듈은 요청 시점에야 그래프에 추가된다.' } },
  { type: 'code', lang: 'typescript', text: `// webpack의 NormalModuleFactory 단순화
async function build(request) {
  const resolved = await resolve(request);
  const source = await readFile(resolved);
  const transformed = await runLoaders(source, loaders);
  const ast = parse(transformed);
  const deps = collectDependencies(ast);
  return { resolved, ast, deps };
}` },
  { type: 'h2', text: '2. vite는 두 단계를 분리했다' },
  { type: 'p', text: '개발 모드에서 vite는 그래프를 만들지 않는다. 브라우저가 import할 때마다 그 파일만 변환해 보낸다 — esbuild가 매 요청을 0~5ms 안에 처리한다는 가정 위에 선 설계다.', note: { type: 'side', text: '이 가정이 깨지는 순간이 있다. node_modules 안에 CommonJS만 잔뜩 있는 패키지를 만나면 미리 ESM으로 번들링하는 "pre-bundle" 단계가 끼어든다.' } },
  { type: 'h3', text: '결정적 차이' },
  { type: 'quote', text: '두 도구는 "언제 변환할 것인가"에 대해 다른 답을 내렸다. webpack은 빌드 타임에 모두, vite는 요청 타임에 그때 그때.' },
  { type: 'p', text: '이 차이가 HMR 속도, 캐시 전략, 그리고 프로덕션 빌드의 모양까지 모두 결정한다. 다음 글에서는 vite가 프로덕션에서 Rollup을 쓰는 이유를 본다.' },
];

// ─────────── POST A — Conservative: classic article + TOC sticky right ───────────
window.PostA = function PostA() {
  const [progress, setProgress] = useStateP(0);
  const ref = useRefP(null);
  useEffectP(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const el = ref.current;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(Math.min(100, Math.max(0, (el.scrollTop / total) * 100)));
    };
    const el = ref.current;
    el?.addEventListener('scroll', onScroll);
    return () => el?.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="felab" style={{ width: 1200, height: 900, background: 'var(--paper-50)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ height: 2, background: 'var(--ink-200)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'var(--marker-300)', transition: 'width .1s' }} />
      </div>
      <div ref={ref} style={{ flex: 1, overflow: 'auto' }}>
        <article style={{ maxWidth: 1080, margin: 'auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '1fr 200px', gap: 64 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--marker-600)', letterSpacing: '0.12em', marginBottom: 12 }}>번들러 밑바닥부터 · #1 / 5</div>
            <h1 className="serif" style={{ fontSize: 48, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16 }}>
              번들러 밑바닥부터 — webpack과 vite는 왜 다른 길을 갔는가
            </h1>
            <p className="serif" style={{ fontSize: 18, color: 'var(--ink-700)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 24 }}>
              esbuild, Rollup, SWC가 만나는 지점. 두 번들러의 그래프 빌드 전략을 디스어셈블해 비교합니다.
            </p>
            <div style={{ display: 'flex', gap: 16, paddingBottom: 24, borderBottom: '1px solid var(--ink-border)', marginBottom: 32 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-600)' }}>2026.04.28 · 한상욱</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>· 14분 정독</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-500)' }}>· {window.fmtNum(8420)} reads</span>
            </div>
            <BodyRender body={SAMPLE_BODY} />

            {/* Footnotes */}
            <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid var(--ink-border)' }}>
              <div className="label" style={{ marginBottom: 12 }}>각주</div>
              <ol style={{ paddingLeft: 18, color: 'var(--ink-700)', fontSize: 13.5, lineHeight: 1.65 }}>
                <li>webpack 5에서 도입된 lazy compilation은 이 원칙을 일부 깬다 — 진입점이 아닌 모듈은 요청 시점에야 그래프에 추가된다.</li>
              </ol>
            </div>

            {/* Prev/Next */}
            <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <a style={{ padding: 20, border: '1px solid var(--ink-border)', cursor: 'pointer' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.08em', marginBottom: 6 }}>← 이전 글</div>
                <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>Module Federation을 실무 도입할 때 흔히 빠지는 함정 5가지</div>
              </a>
              <a style={{ padding: 20, border: '1px solid var(--ink-border)', cursor: 'pointer', textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.08em', marginBottom: 6 }}>다음 글 →</div>
                <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>esbuild 플러그인을 직접 만들면서 배운 것들</div>
              </a>
            </div>
          </div>

          {/* Right TOC */}
          <aside style={{ position: 'relative' }}>
            <div style={{ position: 'sticky', top: 24 }}>
              <div className="label" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--ink-border)' }}>이 글의 목차</div>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                {[
                  { id: '1', t: 'webpack의 그래프 빌드', active: true },
                  { id: '2', t: 'vite는 두 단계를 분리했다' },
                  { id: '2-1', t: '결정적 차이', sub: true },
                ].map(s => (
                  <li key={s.id} style={{ paddingLeft: s.sub?16:0, color: s.active?'var(--marker-600)':'var(--ink-600)', borderLeft: s.active?'2px solid var(--marker-600)':'2px solid transparent', paddingLeft: s.sub?20:8, marginLeft: -2, cursor: 'pointer' }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginRight: 6 }}>{s.id}</span>
                    {s.t}
                  </li>
                ))}
              </ol>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--ink-border)', display: 'flex', gap: 8 }}>
                <button title="공유" style={{ width: 32, height: 32, border: '1px solid var(--ink-border)', borderRadius: 6 }} className="mono">⤴</button>
                <button title="북마크" style={{ width: 32, height: 32, border: '1px solid var(--ink-border)', borderRadius: 6 }} className="mono">☆</button>
                <button title="복사" style={{ width: 32, height: 32, border: '1px solid var(--ink-border)', borderRadius: 6 }} className="mono">⎘</button>
              </div>
            </div>
          </aside>
        </article>
      </div>
    </div>
  );
};

// ─────────── POST B — Sidenotes (Tufte-style margin notes) ───────────
window.PostB = function PostB() {
  return (
    <div className="felab" style={{ width: 1200, minHeight: 900, background: 'var(--paper-50)', overflow: 'hidden' }}>
      <Nav />
      <article style={{ maxWidth: 1100, margin: 'auto', padding: '48px 32px 64px' }}>
        <header style={{ marginBottom: 40, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 48 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--marker-600)', letterSpacing: '0.12em', marginBottom: 16 }}>SERIES · 번들러 밑바닥부터 · 01/05</div>
            <h1 className="serif" style={{ fontSize: 56, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              번들러는 왜 <span style={{ fontStyle: 'italic' }}>다른 길</span>을 갔는가
            </h1>
            <p className="serif" style={{ fontSize: 19, color: 'var(--ink-700)', lineHeight: 1.6, marginTop: 16, fontStyle: 'italic' }}>esbuild, Rollup, SWC가 만나는 지점. 두 번들러의 그래프 빌드 전략을 따라가며 디스어셈블한다.</p>
          </div>
          <div className="serif" style={{ fontSize: 13, color: 'var(--ink-600)', borderLeft: '1px solid var(--ink-border)', paddingLeft: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>NOTE</div>
            <p style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
              이 시리즈는 webpack/vite의 소스를 부분적으로 발췌해 단순화한 의사 코드를 사용합니다. <br/>
              실제 구현은 더 많은 가지치기와 캐싱이 있습니다.
            </p>
          </div>
        </header>

        <BodyTufte body={SAMPLE_BODY} />

        <footer style={{ marginTop: 64, paddingTop: 32, borderTop: '2px solid var(--ink-950)', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 48 }}>
          <div>
            <div className="label" style={{ marginBottom: 12 }}>이 시리즈 다음 글</div>
            <a style={{ display: 'block', padding: 24, border: '1px solid var(--ink-border)', cursor: 'pointer' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--marker-600)', letterSpacing: '0.08em', marginBottom: 6 }}>#02 / 05</div>
              <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.25 }}>esbuild 플러그인을 직접 만들면서 배운 것들</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 8, lineHeight: 1.55 }}>onResolve / onLoad의 호출 순서, 캐싱, 그리고 Go 바이너리와 JS 사이의 IPC.</p>
            </a>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 12 }}>한상욱</div>
            <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>프론트엔드 엔지니어. 번들러 내부, TypeScript 설계, 오픈소스 기여에 관심.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <a className="mono" style={{ fontSize: 11, color: 'var(--accent-600)' }}>GitHub →</a>
              <a className="mono" style={{ fontSize: 11, color: 'var(--accent-600)' }}>LinkedIn →</a>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
};

function BodyTufte({ body }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 48 }}>
      <div>
        {body.map((b, i) => {
          if (b.type === 'h2') return <h2 key={i} className="serif" style={{ fontSize: 30, fontWeight: 500, marginTop: 40, marginBottom: 12, letterSpacing: '-0.015em' }}>{b.text}</h2>;
          if (b.type === 'h3') return <h3 key={i} className="serif" style={{ fontSize: 22, fontWeight: 500, fontStyle: 'italic', marginTop: 28, marginBottom: 8 }}>{b.text}</h3>;
          if (b.type === 'quote') return (
            <blockquote key={i} className="serif" style={{ fontSize: 24, fontStyle: 'italic', color: 'var(--ink-800)', borderLeft: '3px solid var(--marker-300)', padding: '8px 0 8px 24px', margin: '32px 0', lineHeight: 1.4 }}>
              {b.text}
            </blockquote>
          );
          if (b.type === 'code') return (
            <pre key={i} className="mono" style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: 20, fontSize: 13, lineHeight: 1.7, overflow: 'auto', margin: '20px 0', borderRadius: 0 }}>
              <code>{b.text}</code>
            </pre>
          );
          // p with optional sidenote
          return (
            <div key={i} style={{ position: 'relative', marginBottom: 18 }}>
              <p className="serif" style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink-900)' }}>
                {b.text}
                {b.note && b.note.type === 'fn' && <sup className="mono" style={{ fontSize: 10, color: 'var(--marker-600)', marginLeft: 2 }}> [{b.note.n}]</sup>}
              </p>
              {b.note && (
                <aside style={{ position: 'absolute', left: 'calc(100% + 48px)', top: 0, width: 280 }}>
                  <p className="serif" style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-600)', lineHeight: 1.6, borderLeft: '2px solid var(--marker-300)', paddingLeft: 12 }}>
                    {b.note.type === 'fn' && <span className="mono" style={{ fontSize: 10, color: 'var(--marker-600)', marginRight: 4 }}>[{b.note.n}]</span>}
                    {b.note.text}
                  </p>
                </aside>
              )}
            </div>
          );
        })}
      </div>
      <div />
    </div>
  );
}

function BodyRender({ body }) {
  return (
    <div>
      {body.map((b, i) => {
        if (b.type === 'h2') return <h2 key={i} className="serif" style={{ fontSize: 28, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>{b.text}</h2>;
        if (b.type === 'h3') return <h3 key={i} className="serif" style={{ fontSize: 20, fontWeight: 500, fontStyle: 'italic', marginTop: 24, marginBottom: 8 }}>{b.text}</h3>;
        if (b.type === 'quote') return (
          <blockquote key={i} className="serif" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-800)', borderLeft: '3px solid var(--marker-300)', padding: '8px 0 8px 24px', margin: '32px 0', lineHeight: 1.4 }}>{b.text}</blockquote>
        );
        if (b.type === 'code') return (
          <pre key={i} className="mono" style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: 20, fontSize: 13, lineHeight: 1.7, overflow: 'auto', margin: '20px 0' }}>
            <code>{b.text}</code>
          </pre>
        );
        return <p key={i} className="serif" style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--ink-900)', marginBottom: 18 }}>{b.text}</p>;
      })}
    </div>
  );
}

// ─────────── POST C — Bold lab notebook with interactive demo embed ───────────
window.PostC = function PostC() {
  return (
    <div className="felab" style={{ width: 1200, minHeight: 900, background: 'var(--paper-100)', overflow: 'hidden' }}>
      <Nav />
      {/* Lab notebook header */}
      <header style={{ background: 'var(--paper-50)', borderBottom: '2px solid var(--ink-950)', padding: '40px 32px' }}>
        <div style={{ maxWidth: 1100, margin: 'auto' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.16em', display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <span>STUDY NOTE / 0247</span>
            <span>SUBJ — BUNDLER GRAPH BUILD</span>
            <span>2026.04.28</span>
          </div>
          <h1 className="serif" style={{ fontSize: 64, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 16 }}>
            <span style={{ fontStyle: 'italic' }}>두 번들러</span>는<br />
            왜 다른 길을 갔는가.
          </h1>
          <div style={{ display: 'flex', gap: 24, paddingTop: 16, borderTop: '1px solid var(--ink-border)', alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-600)' }}><strong style={{color:'var(--ink-950)'}}>GUESS</strong> · 둘 다 의존성 그래프를 만든다. 그런데 왜 vite는 빠른가?</span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--marker-600)' }}>14분 · 한상욱</span>
          </div>
        </div>
      </header>

      {/* Body w/ inline interactive demo */}
      <article style={{ maxWidth: 920, margin: 'auto', padding: '48px 32px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.12em', marginBottom: 8 }}>§ 01 — 가설</div>
        <p className="serif" style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-900)', marginBottom: 18 }}>
          번들러 안에 들어가 본 사람이라면 누구나 같은 질문을 한 번씩 한다. <span className="marker">"왜 이렇게 느려?"</span> 그 답을 찾으려면 의존성 그래프가 만들어지는 순간으로 거슬러 올라가야 한다.
        </p>

        {/* Interactive demo embed */}
        <BundlerDemo />

        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.12em', marginBottom: 8, marginTop: 40 }}>§ 02 — 관찰</div>
        <p className="serif" style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-900)', marginBottom: 18 }}>
          위 데모에서 보이듯, webpack은 그래프를 빌드 시점에 모두 만든다. 모듈마다 loader 체인을 거쳐 변환하고, 그 결과를 다시 그래프에 추가한다.
        </p>

        <pre className="mono" style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: 20, fontSize: 13, lineHeight: 1.7, margin: '20px 0', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 8, right: 12, fontSize: 10, color: 'var(--ink-400)' }}>typescript · NormalModuleFactory.ts</span>
          <code>{`async function build(request) {
  const resolved = await resolve(request);
  const source = await readFile(resolved);
  const transformed = await runLoaders(source, loaders);
  const ast = parse(transformed);
  const deps = collectDependencies(ast);
  return { resolved, ast, deps };
}`}</code>
        </pre>

        <p className="serif" style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--ink-900)', marginBottom: 18 }}>
          반면 vite는 <span style={{ fontStyle: 'italic' }}>그래프를 만들지 않는다</span>. 브라우저가 import할 때마다 그 파일만 변환해 보낸다.
        </p>

        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.12em', marginBottom: 8, marginTop: 40 }}>§ 03 — 결론</div>
        <blockquote className="serif" style={{ fontSize: 26, fontStyle: 'italic', color: 'var(--ink-800)', padding: '20px 28px', margin: '24px 0', background: 'var(--marker-100)', borderLeft: '4px solid var(--marker-300)', lineHeight: 1.4 }}>
          두 도구는 "언제 변환할 것인가"에 대해 다른 답을 내렸다. webpack은 빌드 타임에 모두, vite는 요청 타임에 그때 그때.
        </blockquote>
      </article>
    </div>
  );
};

function BundlerDemo() {
  const [tool, setTool] = useStateP('webpack');
  const [step, setStep] = useStateP(0);
  const [playing, setPlaying] = useStateP(false);
  useEffectP(() => {
    if (!playing) return;
    const t = setInterval(() => setStep(s => {
      if (s >= 4) { setPlaying(false); return s; }
      return s + 1;
    }), 800);
    return () => clearInterval(t);
  }, [playing]);
  const stages = tool === 'webpack'
    ? ['entry 해소', 'loader 체인', 'AST 파싱', '의존성 수집', '그래프 추가']
    : ['요청 수신', 'esbuild 변환', '응답 전송', '브라우저 import', '다음 모듈 요청'];
  return (
    <figure style={{ margin: '32px 0', border: '1px solid var(--ink-950)', background: 'var(--paper-50)' }}>
      <div style={{ background: 'var(--ink-950)', color: 'var(--paper-50)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--marker-300)', letterSpacing: '0.12em' }}>● LIVE DEMO</span>
        <span className="mono" style={{ fontSize: 11 }}>의존성 그래프 빌드 — 단계별</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: '1px solid oklch(40% 0.022 60)', borderRadius: 4, overflow: 'hidden' }}>
          {['webpack','vite'].map(t => (
            <button key={t} onClick={() => { setTool(t); setStep(0); setPlaying(false); }} className="mono"
              style={{ padding: '4px 10px', fontSize: 11, background: tool===t?'var(--marker-300)':'transparent', color: tool===t?'var(--ink-950)':'var(--paper-50)' }}>{t}</button>
          ))}
        </div>
        <button onClick={() => { if (step >= 4) setStep(0); setPlaying(p => !p); }} className="mono" style={{ padding: '4px 10px', fontSize: 11, border: '1px solid oklch(40% 0.022 60)', borderRadius: 4 }}>
          {playing ? '❙❙ 일시정지' : '▶ 재생'}
        </button>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {stages.map((s, i) => (
            <div key={i} style={{ flex: 1, position: 'relative' }}>
              <div style={{ height: 8, background: i <= step ? (tool==='webpack'?'var(--accent-600)':'var(--marker-300)') : 'var(--ink-200)', transition: 'background .3s' }} />
              <div className="mono" style={{ fontSize: 10, color: i === step ? 'var(--ink-950)' : 'var(--ink-500)', marginTop: 8, fontWeight: i===step?600:400 }}>
                {String(i+1).padStart(2,'0')}. {s}
              </div>
            </div>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-700)', padding: 16, background: 'var(--paper-100)', borderLeft: '3px solid var(--marker-300)', minHeight: 60 }}>
          {tool === 'webpack' ? (
            ['📦 entry: ./src/index.ts → resolved','⚙ ts-loader → babel-loader → 변환된 코드','🌳 acorn으로 AST 생성','🔗 import "./util" → 의존성 그래프에 추가','✓ 모듈 노드 1개 추가, 다음 모듈로'][step]
          ) : (
            ['🌐 GET /src/App.tsx (브라우저로부터)','⚡ esbuild로 0.4ms만에 ts → js','📤 변환된 코드 즉시 응답','🧭 브라우저가 import 만나면 또 GET','♻ 그래프 없음, 요청-응답만 반복'][step]
          )}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 12, textAlign: 'center', letterSpacing: '0.08em' }}>
          drag, click 단계, 또는 ▶ 재생 — 차이를 직접 보세요.
        </div>
      </div>
    </figure>
  );
}
