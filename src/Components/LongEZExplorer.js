import React, { useEffect, useState } from 'react';

// Long-EZ ply & structures explorer: a notional, public-data design and build tool for the Rutan Long-EZ
// (ply books, load cases, strength checks, systems, nose gear, canopy latch, engine installation).
// The page is a self-contained HTML document (scripts, styles and the 3D model inlined; three.js from its CDN).
// It is served as a .txt file because the hosting SPA rewrite rule only passes a short list of static
// extensions through, then turned into a same-origin blob URL and shown in an iframe (as /engines).
const PAGE_URL = `${process.env.PUBLIC_URL}/long-ez/explorer.txt`;

const frameStyle = {
  display: 'block',
  width: '100%',
  height: 'calc(100vh - 140px)',
  minHeight: 560,
  margin: '1em 0',
  border: '1px solid #2a3340',
  borderRadius: 10,
  background: '#121821',
};

export default function LongEZExplorer() {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Long-EZ Ply & Structures Explorer | Miles Raker';
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
    return <p style={{ padding: '2em', textAlign: 'center' }}>Couldn't load the Long-EZ explorer ({error}).</p>;
  }
  if (!src) {
    return (
      <div style={{ ...frameStyle, display: 'grid', placeItems: 'center', color: '#9aa9b8', fontFamily: 'monospace' }}>
        Loading Long-EZ explorer…
      </div>
    );
  }
  return (
    <iframe
      title="Long-EZ ply & structures explorer (demonstration only, not for construction)"
      src={src}
      style={frameStyle}
      allow="fullscreen"
    />
  );
}
