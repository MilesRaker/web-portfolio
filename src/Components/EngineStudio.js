import React, { useEffect, useState } from 'react';

// Aircraft engine design studio: an educational engine cycle and sizing tool (training only, not for design).
// The page is a self-contained HTML document (its own scripts and styles inlined). It is served
// as a .txt file because the hosting SPA rewrite rule only passes a short list of static
// extensions through, then turned into a same-origin blob URL and shown in an iframe.
const PAGE_URL = `${process.env.PUBLIC_URL}/engines/engines.txt`;

const frameStyle = {
  display: 'block',
  width: '100%',
  height: 'calc(100vh - 140px)',
  minHeight: 560,
  margin: '1em 0',
  border: '1px solid #d2d8dc',
  borderRadius: 10,
  background: '#eceff0',
};

export default function EngineStudio() {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Aircraft Engine Design Studio | Miles Raker';
    let url = null;
    let cancelled = false;
    fetch(PAGE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        setSrc(url);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  if (error) {
    return <p style={{ padding: '2em', textAlign: 'center' }}>Couldn't load the engine studio ({error}).</p>;
  }
  if (!src) {
    return (
      <div style={{ ...frameStyle, display: 'grid', placeItems: 'center', color: '#56606a', fontFamily: 'monospace' }}>
        Loading engine design studio…
      </div>
    );
  }
  return (
    <iframe
      title="Aircraft engine design studio (training only, not for design)"
      src={src}
      style={frameStyle}
      allow="fullscreen"
    />
  );
}
