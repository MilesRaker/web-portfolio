import React, { useEffect, useState } from 'react';

// Asthma attack & albuterol 3D airway simulation (Blender model + Three.js).
// The page is a self-contained HTML document (GLB, renders and data inlined). It is served
// as a .txt file because the hosting SPA rewrite rule only passes a short list of static
// extensions through, then turned into a same-origin blob URL and shown in an iframe.
const PAGE_URL = `${process.env.PUBLIC_URL}/asthma-sim/asthma-sim.txt`;

const frameStyle = {
  display: 'block',
  width: '100%',
  height: 'calc(100vh - 140px)',
  minHeight: 560,
  margin: '1em 0',
  border: '1px solid #1d2a44',
  borderRadius: 10,
  background: '#060a13',
};

export default function AsthmaSimulation() {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Asthma Attack & Albuterol Simulation | Miles Raker';
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
    return <p style={{ padding: '2em', textAlign: 'center' }}>Couldn't load the simulation ({error}).</p>;
  }
  if (!src) {
    return (
      <div style={{ ...frameStyle, display: 'grid', placeItems: 'center', color: '#93a3c2', fontFamily: 'monospace' }}>
        Loading 3D airway simulation…
      </div>
    );
  }
  return (
    <iframe
      title="Asthma attack and albuterol 3D airway simulation"
      src={src}
      style={frameStyle}
      allow="fullscreen"
    />
  );
}
