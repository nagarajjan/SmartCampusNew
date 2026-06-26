import React, { useState } from 'react';

export default function SystemLogs({ logs }) {
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                          log.gate.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'GRANTED') return matchesSearch && log.type === 'granted';
    if (filterType === 'DENIED') return matchesSearch && log.type === 'denied';
    if (filterType === 'SYSTEM') return matchesSearch && log.type === 'system';
    
    return matchesSearch;
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Real-Time System Logs</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {filteredLogs.length} events
        </span>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setFilterType('ALL')}
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '0.75rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filterType === 'ALL' ? 'var(--color-text)' : 'rgba(255,255,255,0.05)',
            color: filterType === 'ALL' ? '#070a13' : 'var(--color-text-secondary)',
            fontWeight: 600
          }}
        >
          ALL
        </button>
        <button 
          onClick={() => setFilterType('GRANTED')}
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '0.75rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filterType === 'GRANTED' ? 'rgba(0, 255, 159, 0.15)' : 'rgba(255,255,255,0.05)',
            color: filterType === 'GRANTED' ? 'var(--color-granted)' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: filterType === 'GRANTED' ? '1px solid rgba(0, 255, 159, 0.3)' : 'none'
          }}
        >
          GRANTS
        </button>
        <button 
          onClick={() => setFilterType('DENIED')}
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '0.75rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filterType === 'DENIED' ? 'rgba(255, 42, 95, 0.15)' : 'rgba(255,255,255,0.05)',
            color: filterType === 'DENIED' ? 'var(--color-denied)' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: filterType === 'DENIED' ? '1px solid rgba(255, 42, 95, 0.3)' : 'none'
          }}
        >
          DENIALS
        </button>
        <button 
          onClick={() => setFilterType('SYSTEM')}
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '0.75rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filterType === 'SYSTEM' ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255,255,255,0.05)',
            color: filterType === 'SYSTEM' ? 'var(--color-warning)' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: filterType === 'SYSTEM' ? '1px solid rgba(255, 184, 0, 0.3)' : 'none'
          }}
        >
          SYSTEM
        </button>

        <input 
          type="text" 
          placeholder="Filter logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ 
            flex: 1, 
            padding: '0.3rem 0.6rem', 
            fontSize: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        />
      </div>

      {/* Log Feed viewport */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        maxHeight: '480px',
        paddingRight: '0.25rem'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            No log events matching filter
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={index}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(0, 0, 0, 0.25)',
                borderLeft: `3px solid ${
                  log.type === 'granted' ? 'var(--color-granted)' : 
                  log.type === 'denied' ? 'var(--color-denied)' : 'var(--color-warning)'
                }`,
                borderRadius: '0 8px 8px 0',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                <span>{log.gate}</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div style={{ color: 'var(--color-text)' }}>{log.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
