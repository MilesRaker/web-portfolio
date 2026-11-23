import React, { useEffect, useState } from 'react';

// Long-EZ ply & structures explorer: a notional, public-data design and build tool for the Rutan Long-EZ
// (ply books, load cases, strength checks, systems, nose gear, canopy latch, engine installation).
// This is the "Build-Ready Development" build: a page plus ~420 ES modules under public/long-ez/app/ (the parts,
// the definition, the 3D solids it loads on demand, a module worker; three.js from its CDN). The page is served as
// index.txt because the hosting SPA rewrite rule only passes a short list of static extensions through; it is turned
// into a same-origin blob URL and shown in an iframe (as /engines), with a <base> pointing at the app folder so its
// relative module imports, worker and data fetches resolve to the real files. Its data file is .txt for the same reason.
const APP_DIR = `${process.env.PUBLIC_URL}/long-ez/app/`;
const PAGE_URL = `${APP_DIR}index.txt`;

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
        const base = `<base href="${new URL(APP_DIR, window.location.href).href}">`;
        url = URL.createObjectURL(new Blob([html.replace(/<head>/i, `<head>\n${base}`)], { type: 'text/html' }));
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
