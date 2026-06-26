import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Label colours per COCO category group ──────────────────────────────────
const CLASS_COLORS = {
  person:       '#ff2a5f',
  car:          '#38bdf8', truck: '#38bdf8', bus: '#38bdf8', motorcycle: '#38bdf8', bicycle: '#38bdf8',
  dog:          '#fbbf24', cat: '#fbbf24', bird: '#fbbf24', horse: '#fbbf24',
  laptop:       '#a78bfa', 'cell phone': '#a78bfa', keyboard: '#a78bfa', mouse: '#a78bfa', tv: '#a78bfa',
  chair:        '#34d399', bench: '#34d399', couch: '#34d399', bed: '#34d399',
  backpack:     '#fb923c', handbag: '#fb923c', suitcase: '#fb923c', umbrella: '#fb923c',
  bottle:       '#e2e8f0', cup: '#e2e8f0', fork: '#e2e8f0', knife: '#e2e8f0',
};
const defaultColor = '#ffffff';

const getColor = (cls) => CLASS_COLORS[cls] || defaultColor;

// ── Detection filter groups ──────────────────────────────────────────────
const FILTER_GROUPS = [
  { key: 'person',   label: '👤 Person',    classes: ['person'],                                            color: '#ff2a5f' },
  { key: 'vehicle',  label: '🚗 Vehicle',   classes: ['car','truck','bus','motorcycle','bicycle'],          color: '#38bdf8' },
  { key: 'animal',   label: '🐕 Animal',    classes: ['dog','cat','bird','horse','cow','sheep'],            color: '#fbbf24' },
  { key: 'device',   label: '💻 Device',    classes: ['laptop','cell phone','keyboard','mouse','tv'],       color: '#a78bfa' },
  { key: 'furniture',label: '🪑 Furniture', classes: ['chair','bench','couch','bed','dining table'],        color: '#34d399' },
  { key: 'other',    label: '📦 Other',     classes: [],  color: '#e2e8f0' },
];

function getGroup(cls) {
  for (const g of FILTER_GROUPS) {
    if (g.classes.includes(cls)) return g.key;
  }
  return 'other';
}

export default function WebcamViewer() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const modelRef  = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);
  const lastFpsRef = useRef(Date.now());
  const frameCount = useRef(0);

  const [status, setStatus]       = useState('idle');   // idle | requesting | loading | running | error | stopped
  const [errorMsg, setErrorMsg]   = useState('');
  const [fps, setFps]             = useState(0);
  const [detections, setDetections] = useState([]);
  const [activeFilters, setActiveFilters] = useState(
    Object.fromEntries(FILTER_GROUPS.map(g => [g.key, true]))
  );
  const [minConf, setMinConf]     = useState(0.50);
  const [expanded, setExpanded]   = useState(true);

  // ── Load TF.js + COCO‑SSD via npm dynamic imports (no CDN) ────────
  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    // Dynamically import the libraries; Vite will bundle them.
    const tf = await import('@tensorflow/tfjs'); // ensure tf is loaded
    const cocoSsdModule = await import('@tensorflow-models/coco-ssd');
    const model = await cocoSsdModule.default.load({ base: 'lite_mobilenet_v2' });
    modelRef.current = model;
    return model;
  }, []);

  // ── Start camera + detection loop ────────────────────────────────────────
  const handleStart = async () => {
    try {
      setStatus('requesting');
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setStatus('loading');
      const model = await loadModel();

      setStatus('running');
      runLoop(model);
    } catch (err) {
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Please allow camera access in your browser and try again.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('No camera found on this device.');
      } else {
        setErrorMsg(err.message || 'Failed to start webcam.');
      }
    }
  };

  const handleStop = () => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('stopped');
    setDetections([]);
    setFps(0);
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ── Detection + drawing loop ─────────────────────────────────────────────
  const runLoop = useCallback((model) => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const loop = async () => {
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      // Mirror the canvas to match a front-facing camera feel
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Run inference
      try {
        const preds = await model.detect(video);
        const filtered = preds.filter(p => p.score >= minConf);

        // Draw boxes
        filtered.forEach(({ class: cls, score, bbox }) => {
          const group = getGroup(cls);
          const activeF = activeFiltersRef.current;
          if (!activeF[group]) return;

          const color = getColor(cls);
          const [x, y, w, h] = bbox;
          // Flip x for mirrored canvas
          const mx = canvas.width - x - w;

          // Box
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(mx, y, w, h);
          ctx.fillStyle = `${color}18`;
          ctx.fillRect(mx, y, w, h);

          // Corner brackets
          const len = Math.min(14, w * 0.2, h * 0.2);
          ctx.fillStyle = color;
          const corners = [
            [mx, y], [mx + w - len, y], [mx, y + h - len], [mx + w - len, y + h - len]
          ];
          corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx, cy, len, 2);
            ctx.fillRect(cx + (cx === mx ? 0 : len - 2), cy, 2, len);
          });

          // Label
          const label = `${cls.toUpperCase()}  ${(score * 100).toFixed(0)}%`;
          ctx.font = 'bold 11px JetBrains Mono, monospace';
          const tw = ctx.measureText(label).width + 10;
          ctx.fillStyle = 'rgba(0,0,0,0.82)';
          ctx.fillRect(mx, y - 22, tw, 20);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(mx, y - 22, tw, 20);
          ctx.fillStyle = color;
          ctx.fillText(label, mx + 5, y - 8);
        });

        setDetections(filtered);

        // FPS
        frameCount.current++;
        const now = Date.now();
        if (now - lastFpsRef.current >= 1000) {
          setFps(frameCount.current);
          frameCount.current = 0;
          lastFpsRef.current = now;
        }
      } catch (_) {}

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [minConf]);

  // Keep a ref to activeFilters so the loop closure sees updates without restarts
  const activeFiltersRef = useRef(activeFilters);
  useEffect(() => { activeFiltersRef.current = activeFilters; }, [activeFilters]);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const toggleFilter = (key) =>
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));

  const personCount  = detections.filter(d => d.class === 'person').length;
  const vehicleCount = detections.filter(d => ['car','truck','bus','motorcycle','bicycle'].includes(d.class)).length;

  // ── Status colours & labels ──────────────────────────────────────────────
  const statusMeta = {
    idle:       { color: 'var(--color-text-muted)', dot: '#64748b', label: 'IDLE — Camera Off' },
    requesting: { color: '#fbbf24',                 dot: '#fbbf24', label: 'REQUESTING PERMISSION...' },
    loading:    { color: '#38bdf8',                 dot: '#38bdf8', label: 'LOADING AI MODEL...' },
    running:    { color: '#34d399',                 dot: '#34d399', label: `LIVE · ${fps} FPS` },
    error:      { color: '#ff2a5f',                 dot: '#ff2a5f', label: 'ERROR' },
    stopped:    { color: 'var(--color-text-muted)', dot: '#64748b', label: 'STOPPED' },
  };
  const sm = statusMeta[status];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: sm.dot,
            boxShadow: status === 'running' ? `0 0 8px ${sm.dot}` : 'none',
            animation: status === 'loading' || status === 'requesting' ? 'pulse 1s infinite' : 'none'
          }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>🎥 Webcam AI Screening</h3>
          <span style={{ fontSize: '0.68rem', color: sm.color, fontWeight: 700, letterSpacing: '0.05em' }}>
            {sm.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {status === 'running' && (
            <>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,42,95,0.12)', border: '1px solid rgba(255,42,95,0.3)', color: '#ff2a5f', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
                👤 {personCount} Person{personCount !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
                🚗 {vehicleCount} Vehicle{vehicleCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.3rem 0.6rem', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* ── Video + Canvas overlay ── */}
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#050810', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              muted playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: status === 'running' ? 'block' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: status === 'running' ? 'block' : 'none' }}
            />

            {/* Idle / error / loading overlay */}
            {status !== 'running' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
                {status === 'idle' || status === 'stopped' ? (
                  <>
                    <div style={{ fontSize: '3rem' }}>🎥</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      Click <strong style={{ color: 'var(--color-text)' }}>START SCREENING</strong> to activate your laptop camera and run real-time AI object detection.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Detects: humans · vehicles · animals · devices · furniture and 70+ object classes
                    </div>
                  </>
                ) : status === 'requesting' ? (
                  <>
                    <div style={{ fontSize: '2.5rem' }}>🔓</div>
                    <div style={{ fontSize: '0.85rem', color: '#fbbf24', textAlign: 'center', fontWeight: 600 }}>
                      Waiting for camera permission…
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Check the browser address bar and click "Allow" to grant camera access.
                    </div>
                  </>
                ) : status === 'loading' ? (
                  <>
                    <div style={{ fontSize: '2.5rem', animation: 'pulse 1.2s infinite' }}>🧠</div>
                    <div style={{ fontSize: '0.85rem', color: '#38bdf8', textAlign: 'center', fontWeight: 600 }}>
                      Loading COCO-SSD AI model…
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      First load takes ~3–5 seconds. Model runs 100% in-browser.
                    </div>
                    <div style={{ width: '160px', height: '4px', background: 'rgba(56,189,248,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '60%', height: '100%', background: '#38bdf8', borderRadius: '4px', animation: 'pulse 1s infinite' }} />
                    </div>
                  </>
                ) : status === 'error' ? (
                  <>
                    <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                    <div style={{ fontSize: '0.82rem', color: '#ff2a5f', textAlign: 'center', fontWeight: 600 }}>{errorMsg}</div>
                  </>
                ) : null}
              </div>
            )}

            {/* Live HUD overlay */}
            {status === 'running' && (
              <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                  COCO-SSD · MobileNetV2
                </span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(52,211,153,0.9)', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                  {fps} FPS · {detections.length} obj
                </span>
              </div>
            )}

            {/* Scan-line effect when running */}
            {status === 'running' && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: '2px', pointerEvents: 'none',
                background: 'linear-gradient(to right, transparent, rgba(56,189,248,0.6), transparent)',
                boxShadow: '0 0 8px rgba(56,189,248,0.5)',
                animation: 'scan-line 3s infinite linear'
              }} />
            )}
          </div>

          {/* ── Controls Row ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {status !== 'running' ? (
              <button
                onClick={handleStart}
                disabled={status === 'requesting' || status === 'loading'}
                style={{
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)',
                  color: '#34d399', padding: '0.5rem 1.2rem', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em',
                  opacity: (status === 'requesting' || status === 'loading') ? 0.6 : 1
                }}
              >
                ▶ START SCREENING
              </button>
            ) : (
              <button
                onClick={handleStop}
                style={{
                  background: 'rgba(255,42,95,0.12)', border: '1px solid rgba(255,42,95,0.3)',
                  color: '#ff2a5f', padding: '0.5rem 1.2rem', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em'
                }}
              >
                ⏹ STOP
              </button>
            )}

            {/* Confidence threshold slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '180px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                Min Confidence
              </span>
              <input
                type="range" min={20} max={90} step={5}
                value={Math.round(minConf * 100)}
                onChange={e => setMinConf(Number(e.target.value) / 100)}
                style={{ flex: 1, accentColor: '#38bdf8' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, minWidth: '36px' }}>
                {Math.round(minConf * 100)}%
              </span>
            </div>
          </div>

          {/* ── Detection class filters ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {FILTER_GROUPS.map(g => (
              <button
                key={g.key}
                onClick={() => toggleFilter(g.key)}
                style={{
                  background: activeFilters[g.key] ? `${g.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activeFilters[g.key] ? g.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  color: activeFilters[g.key] ? g.color : 'var(--color-text-muted)',
                  padding: '0.25rem 0.65rem', borderRadius: '20px',
                  fontSize: '0.68rem', fontWeight: activeFilters[g.key] ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* ── Live detections list ── */}
          {status === 'running' && detections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {detections
                .filter(d => activeFilters[getGroup(d.class)])
                .sort((a, b) => b.score - a.score)
                .map((d, i) => (
                  <span key={i} style={{
                    fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace',
                    padding: '0.15rem 0.5rem', borderRadius: '4px',
                    background: `${getColor(d.class)}18`,
                    border: `1px solid ${getColor(d.class)}44`,
                    color: getColor(d.class),
                    fontWeight: 700
                  }}>
                    {d.class} {(d.score * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          )}

          {/* ── Info footer ── */}
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>🧠 Model: COCO-SSD (MobileNet v2) · In-browser inference</span>
            <span>🔒 No video data leaves your device</span>
            <span>📦 80 object classes supported</span>
          </div>
        </>
      )}
    </div>
  );
}
