import React from 'react';

export default function GateControl({ 
  gateId, 
  gateName, 
  gateStatus, 
  onOverride, 
  logs 
}) {
  // Count today's gate openings from events log
  const gateLogs = logs.filter(l => l.gate === gateName);
  const totalOpenings = gateLogs.filter(l => l.type === 'granted').length;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
        Barrier Actuator Controls ({gateId.toUpperCase()})
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'center' }}>
        {/* Animated Dial */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          position: 'relative'
        }}>
          {/* Radial Angle Visualization */}
          <svg width="100" height="100" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
            {/* Active Arc */}
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              fill="none" 
              stroke={
                gateStatus === 'OPEN' ? 'var(--color-granted)' : 
                gateStatus === 'OPENING' || gateStatus === 'CLOSING' ? 'var(--color-warning)' : 'var(--color-denied)'
              } 
              strokeWidth="8" 
              strokeDasharray="251.2"
              strokeDashoffset={
                gateStatus === 'OPEN' ? '188.4' : // 75% rotation for open 90deg
                gateStatus === 'OPENING' ? '219.8' : // opening swing
                gateStatus === 'CLOSING' ? '235.5' : // closing swing
                '251.2' // closed (0deg)
              }
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.4s' }}
            />
            {/* Center Angle Text */}
            <text 
              x="50" 
              y="55" 
              textAnchor="middle" 
              fill="var(--color-text)" 
              fontFamily="var(--font-mono)" 
              fontSize="16" 
              fontWeight="bold"
            >
              {gateStatus === 'OPEN' ? '90°' : 
               gateStatus === 'OPENING' ? '45°' : 
               gateStatus === 'CLOSING' ? '15°' : '0°'}
            </text>
          </svg>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Actuator Angle
          </div>
        </div>

        {/* Telemetry / Sensors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
            <span style={{ 
              fontWeight: 'bold',
              color: gateStatus === 'OPEN' ? 'var(--color-granted)' : 
                     gateStatus === 'OPENING' || gateStatus === 'CLOSING' ? 'var(--color-warning)' : 'var(--color-denied)'
            }}>
              {gateStatus}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Loop Detector:</span>
            <span style={{ 
              fontWeight: 'bold', 
              color: gateStatus !== 'CLOSED' ? 'var(--color-granted)' : 'var(--color-text-muted)' 
            }}>
              {gateStatus !== 'CLOSED' ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>IR Safety Beam:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-granted)' }}>CLEAR</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Relay Comms:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-granted)' }}>ONLINE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Today's Cycles:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{totalOpenings}</span>
          </div>
        </div>
      </div>

      {/* Manual Override Action Console */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button 
          className="btn-primary" 
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
          onClick={() => onOverride(gateId, 'OPEN')}
          disabled={gateStatus === 'OPEN'}
        >
          FORCE OPEN
        </button>
        <button 
          className="btn-danger" 
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
          onClick={() => onOverride(gateId, 'CLOSE')}
          disabled={gateStatus === 'CLOSED'}
        >
          FORCE LOCK
        </button>
        <button 
          className="btn-secondary" 
          style={{ flex: 0.8, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
          onClick={() => onOverride(gateId, 'RESET')}
        >
          RESET
        </button>
      </div>
    </div>
  );
}
