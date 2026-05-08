// Shared atoms for the FE Lab variations
const { useState, useMemo, useEffect, useRef } = React;

// — Tag chip
window.Tag = function Tag({ children, active, onClick, size = 'md' }) {
  const padY = size === 'sm' ? '2px' : '4px';
  const padX = size === 'sm' ? '8px' : '10px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <button
      onClick={onClick}
      className="mono"
      style={{
        padding: `${padY} ${padX}`,
        fontSize: fs,
        letterSpacing: '0.04em',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--ink-950)' : 'var(--ink-border)'}`,
        background: active ? 'var(--ink-950)' : 'transparent',
        color: active ? 'var(--paper-50)' : 'var(--ink-700)',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--ink-border-strong)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--ink-border)'; }}
    >
      {children}
    </button>
  );
};

// — Section header (compact, with run number)
window.SectionHead = function SectionHead({ num, eyebrow, title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: 14, borderBottom: '1px solid var(--ink-border)' }}>
      {num && <span className="mono" style={{ fontSize: 11, color: 'var(--marker-600)', letterSpacing: '0.12em' }}>§{num}</span>}
      {eyebrow && <span className="label">{eyebrow}</span>}
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
};

// — A subtle journal-style sparkline
window.Sparkline = function Sparkline({ data, w = 100, h = 28, color = 'var(--ink-700)', fill }) {
  if (!data || data.length === 0) return null;
  const vals = data.map(d => typeof d === 'number' ? d : d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`).join(' ');
  const fillPath = fill ? `M0,${h} L${pts.replace(/ /g,' L')} L${w},${h} Z` : null;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fillPath && <path d={fillPath} fill={fill} opacity="0.18" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// — Search input with hover/focus
window.SearchInput = function SearchInput({ value, onChange, placeholder = '글 제목, 태그, 본문…' }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, color: 'var(--ink-500)', pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px 10px 34px',
          background: 'var(--paper-50)',
          border: '1px solid var(--ink-border)',
          borderRadius: 8,
          font: 'inherit',
          fontSize: 13,
          color: 'var(--ink-950)',
          outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--ink-950)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--ink-border)'}
      />
      <span className="mono" style={{ position: 'absolute', right: 10, fontSize: 10, color: 'var(--ink-400)', border: '1px solid var(--ink-border)', padding: '1px 5px', borderRadius: 4, background: 'var(--paper-100)' }}>⌘K</span>
    </div>
  );
};

// — Image placeholder (subtle stripes)
window.ImgPlaceholder = function ImgPlaceholder({ label, w = '100%', h = 200, bg = 'var(--paper-100)' }) {
  return (
    <div style={{
      width: w, height: h, background: bg,
      backgroundImage: `repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.025) 8px 9px)`,
      border: '1px solid var(--ink-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-500)', fontSize: 11,
      borderRadius: 0,
    }} className="mono">
      {label}
    </div>
  );
};

// — Mini stat block
window.Stat = function Stat({ num, label, delta }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1, color: 'var(--ink-950)', letterSpacing: '-0.02em' }}>{num}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <span className="label">{label}</span>
        {delta !== undefined && (
          <span className="mono" style={{ fontSize: 11, color: delta >= 0 ? 'var(--moss-600)' : 'var(--marker-600)' }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

// — Frame chrome: emulates the FE Lab nav + footer compactly inside artboards
window.SiteFrame = function SiteFrame({ width = 1200, height, children, scrollable = false, themeBg = 'var(--paper-50)' }) {
  return (
    <div className="felab" style={{ width, height: height || 'auto', background: themeBg, overflow: scrollable ? 'auto' : 'hidden', position: 'relative' }}>
      <Nav />
      {children}
      <Footer />
    </div>
  );
};

window.Nav = function Nav() {
  return (
    <nav style={{ borderBottom: '1px solid var(--ink-border)', background: 'rgba(252,250,247,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 5 }}>
      <div style={{ maxWidth: 1200, margin: 'auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="serif" style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.01em' }}>Frontend Lab</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '0.12em' }}>EST. 2023</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavLink>Posts</NavLink>
          <NavLink>Series</NavLink>
          <NavLink>About</NavLink>
          <NavLink icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

window.NavLink = function NavLink({ children, icon }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '6px 12px', fontSize: 13, color: hover ? 'var(--ink-950)' : 'var(--ink-600)', borderRadius: 6, background: hover ? 'var(--paper-100)' : 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all .15s' }}
    >
      {children}
    </a>
  );
};

window.Footer = function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--ink-border)', marginTop: 0, padding: '32px', background: 'var(--paper-100)' }}>
      <div style={{ maxWidth: 1200, margin: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.08em' }}>© 2026 FRONTEND LAB · 한상욱</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['About', '개인정보', 'GitHub', 'LinkedIn', 'RSS'].map(l => (
            <a key={l} className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
};

// Hook: filter / sort logic shared by list views
window.usePostFilter = function usePostFilter(posts) {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [sort, setSort] = useState('recent'); // recent | popular | shortest
  const filtered = useMemo(() => {
    let r = posts;
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some(t => t.includes(q)));
    }
    if (activeTags.length) {
      r = r.filter(p => activeTags.every(t => p.tags.includes(t)));
    }
    if (sort === 'popular') r = [...r].sort((a, b) => b.views - a.views);
    else if (sort === 'shortest') r = [...r].sort((a, b) => a.readMin - b.readMin);
    else r = [...r].sort((a, b) => b.date.localeCompare(a.date));
    return r;
  }, [posts, query, activeTags, sort]);
  return { query, setQuery, activeTags, setActiveTags, sort, setSort, filtered };
};
