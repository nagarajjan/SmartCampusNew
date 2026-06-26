import React, { useState } from 'react';

export default function ManualClearance({ 
  queue, 
  onResolve, 
  onRegisterQuickLink 
}) {
  const [activeItem, setActiveItem] = useState(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [isIntercomActive, setIsIntercomActive] = useState(false);
  const [intercomMode, setIntercomMode] = useState('LISTEN'); // LISTEN, TALK

  // Set the first item as active if none is selected
  const currentItem = activeItem || queue[0];

  const handleApprove = () => {
    if (!currentItem) return;
    
    // Call parent resolver
    onResolve(currentItem.id, true);
    
    // Clear inputs
    resetForm();
  };

  const handleReject = () => {
    if (!currentItem) return;
    
    // Call parent resolver
    onResolve(currentItem.id, false);
    
    // Clear inputs
    resetForm();
  };

  const resetForm = () => {
    setVisitorName('');
    setVisitPurpose('');
    setDestination('');
    setIdVerified(false);
    setActiveItem(null);
    setIsIntercomActive(false);
  };

  const toggleIntercom = () => {
    if (!isIntercomActive) {
      setIsIntercomActive(true);
      setIntercomMode('LISTEN');
    } else {
      setIsIntercomActive(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
          Manual Clearance Terminal (Human-in-the-Loop)
        </h3>
        <span 
          className="badge" 
          style={{ 
            backgroundColor: queue.length > 0 ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: queue.length > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
            border: queue.length > 0 ? '1px solid rgba(255, 184, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          {queue.length} Pending
        </span>
      </div>

      {queue.length === 0 ? (
        <div style={{ 
          padding: '2rem 1rem', 
          textAlign: 'center', 
          color: 'var(--color-text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>All Gate Clearances Complete</div>
          <div style={{ fontSize: '0.75rem' }}>AI security nodes are auto-checking entrants.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>
          
          {/* Waiting Queue List */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem', 
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            paddingRight: '0.75rem',
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Intrusion Queue
            </div>
            {queue.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  setActiveItem(item);
                  setVisitorName(item.name !== 'Unknown Vehicle' && item.name !== 'Unknown Pedestrian' ? item.name : '');
                }}
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: (currentItem && currentItem.id === item.id) ? 'rgba(56, 189, 248, 0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${(currentItem && currentItem.id === item.id) ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.04)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.value}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{item.time}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                  Gate: {item.gate} • {item.type}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-denied)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {item.reason}
                </div>
              </div>
            ))}
          </div>

          {/* Active Work Console */}
          {currentItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Telemetry Header */}
              <div style={{ 
                background: 'rgba(255, 42, 95, 0.05)', 
                border: '1px solid rgba(255, 42, 95, 0.15)',
                borderRadius: '10px',
                padding: '0.75rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Location</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentItem.gate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Detected Object</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentItem.type.toUpperCase()} ({currentItem.value})</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Reason Flagged</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-denied)' }}>{currentItem.reason}</div>
                </div>
              </div>

              {/* Guard Intercom Simulator */}
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.3)', 
                borderRadius: '10px', 
                padding: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyBetween: 'space-between',
                gap: '1rem'
              }}>
                <button 
                  onClick={toggleIntercom}
                  style={{
                    padding: '0.5rem 0.8rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isIntercomActive ? 'var(--color-denied)' : 'var(--color-primary)',
                    color: '#070a13',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
                  </svg>
                  {isIntercomActive ? 'DISCONNECT' : 'ACTIVATE INTERCOM'}
                </button>

                {isIntercomActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '30px' }}>
                      {[...Array(8)].map((_, i) => (
                        <div 
                          key={i} 
                          style={{
                            width: '3px',
                            backgroundColor: intercomMode === 'TALK' ? 'var(--color-granted)' : 'var(--color-primary)',
                            borderRadius: '2px',
                            animation: `audio-wave 1.2s infinite ease-in-out`,
                            animationDelay: `${i * 0.15}s`
                          }}
                        />
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                        Audio Channel Active
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '0.5rem' }}>
                        <span 
                          onClick={() => setIntercomMode(intercomMode === 'TALK' ? 'LISTEN' : 'TALK')}
                          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--color-primary)' }}
                        >
                          Mode: {intercomMode} (Toggle)
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Intercom Line Closed. Click to call gate kiosk.
                  </div>
                )}
              </div>

              {/* Visitor Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>
                      Visitor/Driver Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>
                      Visit Purpose
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Hardware Delivery"
                      value={visitPurpose}
                      onChange={(e) => setVisitPurpose(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>
                    Campus Destination (Office/Bldg)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Admin Block - IT Server Room"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input 
                    type="checkbox" 
                    id="chk-id-verified"
                    checked={idVerified}
                    onChange={(e) => setIdVerified(e.target.checked)}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-id-verified" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    I have physically/digitally verified government-issued ID document
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleApprove}
                  disabled={!idVerified}
                  style={{ flex: 1, opacity: idVerified ? 1 : 0.6 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  APPROVE (OPEN GATE)
                </button>
                <button 
                  className="btn-danger" 
                  onClick={handleReject}
                  style={{ flex: 0.8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  DENY ENTRY
                </button>
              </div>

              {/* Quick Profile Registration Link */}
              <div style={{ textAlign: 'center' }}>
                <span 
                  onClick={() => onRegisterQuickLink({
                    name: visitorName || 'Temporary Visitor',
                    type: currentItem.type === 'vehicle' ? 'Vehicle' : 'Face',
                    value: currentItem.value,
                    role: 'Visitor/Guest',
                    allowedDays: 'Weekdays',
                    allowedTimings: '08:00 - 18:00',
                    tier: 'Tier 1'
                  })}
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--color-primary)', 
                    textDecoration: 'underline', 
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Create permanent/temporary credential in Access Portal
                </span>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
