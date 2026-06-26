import React, { useState } from 'react';
import { db } from '../utils/db';

const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const timeDiffInMinutes = (start, end) => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

export default function DashboardStats({ 
  logs, 
  profiles, 
  activeOnCampus = [], 
  completedTrips = [], 
  thresholds = {}, 
  onThresholdsChange,
  simTime = '08:30',
  devices = []
}) {
  // New handler to download all configured devices report
  const handleDownloadAllDevices = () => {
    const headers = ['ID', 'Name', 'Type', 'Protocol', 'Address', 'Configured Status', 'Details', 'Activity'];
    const data = devices.map(device => {
      let activity = '';
      if (device.type && device.type.toLowerCase().includes('webcam') && typeof window !== 'undefined' && window.webcamStats) {
        const ws = window.webcamStats;
        activity = `Persons:${ws.personCount || 0}, Vehicles:${ws.vehicleCount || 0}, Detections:${ws.detections || 0}`;
      }
      return {
        ID: device.id,
        Name: device.name,
        Type: device.type,
        Protocol: device.protocol,
        Address: device.address,
        'Configured Status': device.status,
        Details: device.details || '',
        Activity: activity,
      };
    });
    db.exportToCSV(headers, data, 'configured_devices_report.csv');
  };
  const [reportTab, setReportTab] = useState('active'); // active, breaches, completed, config
  const [editingThresholds, setEditingThresholds] = useState({ ...thresholds });

  const grantedCount = logs.filter(l => l.type === 'granted').length;
  const deniedCount  = logs.filter(l => l.type === 'denied').length;

  // Annotate active entrants with current elapsed time and breach status
  const annotatedActive = activeOnCampus.map(item => {
    const elapsed = timeDiffInMinutes(item.entryTime, simTime);
    const roleThreshold = thresholds[item.role] ?? 480;
    const breached = elapsed > roleThreshold;
    const pct = Math.min((elapsed / roleThreshold) * 100, 100);
    return { ...item, elapsed, roleThreshold, breached, pct };
  });

  // Breaches: active entrants who've exceeded their threshold
  const activeBreach = annotatedActive.filter(i => i.breached);
  // Historical breaches from completed trips
  const completedBreach = completedTrips.filter(t => {
    const roleThreshold = thresholds[t.role] ?? 480;
    return t.duration > roleThreshold;
  });

  const saveThresholds = () => {
    // Convert all values to numbers
    const parsed = {};
    Object.keys(editingThresholds).forEach(k => {
      parsed[k] = Number(editingThresholds[k]);
    });
    onThresholdsChange(parsed);
  };

  const handleExport = (format) => {
    if (reportTab === 'active') {
      const headers = ['name', 'type', 'value', 'role', 'entryTime', 'elapsed', 'roleThreshold', 'breached'];
      const data = annotatedActive;
      const filename = `active_presence_report_${simTime.replace(':', '_')}.${format}`;
      if (format === 'csv') {
        db.exportToCSV(headers, data, filename);
      } else {
        db.exportToJSON(data, filename);
      }
    } else if (reportTab === 'completed') {
      const headers = ['name', 'type', 'value', 'role', 'entryTime', 'exitTime', 'duration'];
      const data = completedTrips;
      const filename = `completed_trips_report_${simTime.replace(':', '_')}.${format}`;
      if (format === 'csv') {
        db.exportToCSV(headers, data, filename);
      } else {
        db.exportToJSON(data, filename);
      }
    } else if (reportTab === 'breaches') {
      const headers = ['name', 'type', 'value', 'role', 'entryTime', 'exitTime', 'duration', 'overstay'];
      const data = [
        ...activeBreach.map(b => ({ ...b, exitTime: 'STILL_ON_CAMPUS', duration: b.elapsed, overstay: b.elapsed - b.roleThreshold })),
        ...completedBreach.map(b => {
          const limit = thresholds[b.role] ?? 480;
          return { ...b, overstay: b.duration - limit };
        })
      ];
      const filename = `overstay_breach_alerts_${simTime.replace(':', '_')}.${format}`;
      if (format === 'csv') {
        db.exportToCSV(headers, data, filename);
      } else {
        db.exportToJSON(data, filename);
      }
    }
  };

  const subTabStyle = (active) => ({
    padding: '0.4rem 0.8rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
    color: active ? '#070a13' : 'var(--color-text-secondary)',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── KPI Metric Row ── */}
      <div className="metric-row">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>On Campus Now</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>{activeOnCampus.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Vehicles + Persons</span>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Threshold Breaches</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: activeBreach.length > 0 ? 'var(--color-denied)' : 'var(--color-granted)' }}>
            {activeBreach.length}
          </span>
          <span style={{ fontSize: '0.7rem', color: activeBreach.length > 0 ? 'var(--color-denied)' : 'var(--color-text-secondary)' }}>
            {activeBreach.length > 0 ? 'Overstay detected!' : 'All within limits'}
          </span>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Exits Today</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-granted)' }}>{completedTrips.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Completed trips</span>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Avg. Stay Duration</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {completedTrips.length > 0
              ? formatDuration(Math.round(completedTrips.reduce((a, t) => a + t.duration, 0) / completedTrips.length))
              : '—'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Per completed trip</span>
        </div>
      </div>

      {/* ── Top Grid: Occupancy Graph + Advisories ── */}
      <div className="dashboard-grid">

        {/* Forecast SVG Graph */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>AI Occupancy & Flow Prediction</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Comparing predicted volume (line) vs. recorded entries/exits (bars).
            </p>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '220px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem' }}>
            <svg viewBox="0 0 500 200" width="100%" height="100%">
              <line x1="40" y1="30"  x2="480" y2="30"  stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="40" y1="70"  x2="480" y2="70"  stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="40" y1="110" x2="480" y2="110" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="40" y1="150" x2="480" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)"  strokeWidth="1"/>
              <text x="30" y="35"  fill="var(--color-text-muted)" fontSize="8" textAnchor="end">150</text>
              <text x="30" y="75"  fill="var(--color-text-muted)" fontSize="8" textAnchor="end">100</text>
              <text x="30" y="115" fill="var(--color-text-muted)" fontSize="8" textAnchor="end">50</text>
              <text x="50"  y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">06:00</text>
              <text x="120" y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">09:00</text>
              <text x="190" y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">12:00</text>
              <text x="260" y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">15:00</text>
              <text x="330" y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">18:00</text>
              <text x="400" y="185" fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">21:00</text>
              <rect x="110" y="55"  width="20" height="115" fill="rgba(56,189,248,0.45)" rx="2"/>
              <rect x="180" y="80"  width="20" height="90"  fill="rgba(56,189,248,0.45)" rx="2"/>
              <rect x="320" y="45"  width="20" height="125" fill="rgba(56,189,248,0.45)" rx="2"/>
              <rect x="390" y="140" width="20" height="30"  fill="rgba(56,189,248,0.2)"  rx="2"/>
              <defs>
                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="var(--color-granted)" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="var(--color-granted)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M 40 170 C 80 150,100 80,120 50 C 140 30,160 120,190 70 C 220 40,240 140,270 110 C 300 90,310 50,330 35 C 360 20,390 120,420 150 C 450 165,470 170,480 170 L 480 170 L 40 170"
                fill="url(#glowGrad)"/>
              <path d="M 40 170 C 80 150,100 80,120 50 C 140 30,160 120,190 70 C 220 40,240 140,270 110 C 300 90,310 50,330 35 C 360 20,390 120,420 150 C 450 165,470 170,480 170"
                fill="none" stroke="var(--color-granted)" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="120" cy="50" r="4" fill="var(--color-granted)"/>
              <circle cx="120" cy="50" r="8" fill="none" stroke="var(--color-granted)" strokeWidth="1" opacity="0.5"/>
              <circle cx="330" cy="35" r="4" fill="var(--color-granted)"/>
              <circle cx="330" cy="35" r="8" fill="none" stroke="var(--color-granted)" strokeWidth="1" opacity="0.5"/>
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ display:'inline-block', width:'12px', height:'6px', background:'rgba(56,189,248,0.65)', borderRadius:'2px'}}/>
              Sensor Recorded Counts
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ display:'inline-block', width:'12px', height:'2px', background:'var(--color-granted)'}}/>
              AI Predicted Volume
            </span>
          </div>
        </div>

        {/* AI Action Advisories */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>AI Security Action Advisory</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeBreach.length > 0 && (
              <div style={{ background:'rgba(255,42,95,0.08)', border:'1px solid rgba(255,42,95,0.25)', borderRadius:'8px', padding:'0.75rem', display:'flex', gap:'0.75rem' }}>
                <span style={{ fontSize:'1.25rem' }}>🚨</span>
                <div>
                  <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--color-denied)' }}>Overstay Alert — {activeBreach.length} entrant{activeBreach.length > 1 ? 's' : ''}</div>
                  <p style={{ fontSize:'0.75rem', color:'var(--color-text-secondary)', marginTop:'0.15rem' }}>
                    {activeBreach.map(b => b.name).join(', ')} exceeded their permitted duration. Immediate review recommended.
                  </p>
                </div>
              </div>
            )}
            <div style={{ background:'rgba(255,184,0,0.05)', border:'1px solid rgba(255,184,0,0.15)', borderRadius:'8px', padding:'0.75rem', display:'flex', gap:'0.75rem' }}>
              <span style={{ fontSize:'1.25rem' }}>⚠️</span>
              <div>
                <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--color-warning)' }}>Morning Peak Hour Congestion Forecast</div>
                <p style={{ fontSize:'0.75rem', color:'var(--color-text-secondary)', marginTop:'0.15rem' }}>
                  North Entry Gate load predicted to hit 142% capacity between 08:00–08:35.
                  <strong style={{ color:'var(--color-text)', display:'block', marginTop:'0.25rem' }}>
                    Action: Pre-allocate Secondary Lane 2 for Auto-LPR mode.
                  </strong>
                </p>
              </div>
            </div>
            <div style={{ background:'rgba(0,255,159,0.05)', border:'1px solid rgba(0,255,159,0.15)', borderRadius:'8px', padding:'0.75rem', display:'flex', gap:'0.75rem' }}>
              <span style={{ fontSize:'1.25rem' }}>⚡</span>
              <div>
                <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--color-granted)' }}>Optimum Security Level</div>
                <p style={{ fontSize:'0.75rem', color:'var(--color-text-secondary)', marginTop:'0.15rem' }}>
                  Auto-clearance stable at 78.4%. Edge inference avg. 12ms latency.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Entry / Exit / Duration Report Panel ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Entry / Exit Time & Duration Report</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Real-time campus presence tracking with configurable overstay thresholds per object type.
            </p>
          </div>
          {activeBreach.length > 0 && (
            <span className="badge badge-denied" style={{ animation: 'pulse-ring 2s infinite' }}>
              {activeBreach.length} OVERSTAY{activeBreach.length > 1 ? 'S' : ''}
            </span>
          )}
        </div>

        {/* Sub-tabs & Exporters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button style={subTabStyle(reportTab === 'active')}    onClick={() => setReportTab('active')}>🟢 Active Now ({activeOnCampus.length})</button>
            <button style={subTabStyle(reportTab === 'breaches')}  onClick={() => setReportTab('breaches')}>🔴 Threshold Breaches ({activeBreach.length + completedBreach.length})</button>
            <button style={subTabStyle(reportTab === 'completed')} onClick={() => setReportTab('completed')}>📋 Trip History ({completedTrips.length})</button>
            <button style={subTabStyle(reportTab === 'config')}    onClick={() => setReportTab('config')}>⚙️ Configure Thresholds</button>
          </div>
          
          {reportTab !== 'config' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>📥 DOWNLOAD:</span>
              <button 
                className="btn-secondary" 
                onClick={() => handleExport('csv')}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 'bold' }}
              >
                CSV
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleExport('json')} 
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 'bold' }}
              >
                JSON
              </button>
              <button 
                className="btn-secondary" 
                onClick={handleDownloadAllDevices} 
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '0.4rem' }}
              >
                All Devices CSV
              </button>
            </div>
          )}
        </div>

        {/* ── Active Now Table ── */}
        {reportTab === 'active' && (
          <div style={{ overflowX: 'auto' }}>
            {activeOnCampus.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No entrants currently on campus.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Identifier</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Entry</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Elapsed</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Limit</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Progress</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {annotatedActive.map(item => (
                    <tr key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: item.breached ? 'rgba(255,42,95,0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span className="badge" style={{
                          background: item.type === 'Vehicle' ? 'rgba(56,189,248,0.1)' : 'rgba(129,140,248,0.1)',
                          color: item.type === 'Vehicle' ? 'var(--color-primary)' : 'var(--color-secondary)',
                          border: 'none', fontSize: '0.65rem'
                        }}>
                          {item.type === 'Vehicle' ? '🚗 Vehicle' : '🚶 Human'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{item.value}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--color-text-secondary)' }}>{item.role}</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.entryTime}</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: item.breached ? 'var(--color-denied)' : 'var(--color-primary)' }}>
                        {formatDuration(item.elapsed)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                        {formatDuration(item.roleThreshold)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', minWidth: '100px' }}>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${item.pct}%`,
                            height: '100%',
                            borderRadius: '3px',
                            background: item.pct >= 100
                              ? 'var(--color-denied)'
                              : item.pct >= 80
                              ? 'var(--color-warning)'
                              : 'var(--color-granted)',
                            transition: 'width 0.5s'
                          }}/>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{Math.round(item.pct)}%</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        {item.breached
                          ? <span className="badge badge-denied">OVERSTAY</span>
                          : item.pct >= 80
                          ? <span className="badge badge-warning">NEAR LIMIT</span>
                          : <span className="badge badge-granted">NORMAL</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Threshold Breaches ── */}
        {reportTab === 'breaches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeBreach.length === 0 && completedBreach.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>✅</span>
                No threshold breaches recorded.
              </div>
            ) : (
              <>
                {activeBreach.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-denied)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      🚨 Active Overstays (Still On Campus)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeBreach.map(item => (
                        <div key={item.id} style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(255,42,95,0.07)',
                          border: '1px solid rgba(255,42,95,0.25)',
                          borderRadius: '10px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                          gap: '0.5rem',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Name</div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Identifier</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{item.value}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Elapsed / Limit</div>
                            <div style={{ fontWeight: 700, color: 'var(--color-denied)' }}>
                              {formatDuration(item.elapsed)} / {formatDuration(item.roleThreshold)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Overstay</div>
                            <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>
                              +{formatDuration(item.elapsed - item.roleThreshold)}
                            </div>
                          </div>
                          <span className="badge badge-denied">ACTIVE</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedBreach.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      ⚠️ Historical Breaches (Exited)
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Role</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Entry</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Exit</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Duration</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Limit</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>Overstay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedBreach.map(t => {
                            const limit = thresholds[t.role] ?? 480;
                            return (
                              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{t.name}</td>
                                <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-text-secondary)' }}>{t.role}</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{t.entryTime}</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{t.exitTime}</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{formatDuration(t.duration)}</td>
                                <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-text-muted)' }}>{formatDuration(limit)}</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: 'var(--color-denied)' }}>+{formatDuration(t.duration - limit)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Completed Trips History ── */}
        {reportTab === 'completed' && (
          <div style={{ overflowX: 'auto' }}>
            {completedTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No trips completed yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Entry</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Exit</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Duration</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTrips.map(t => {
                    const limit = thresholds[t.role] ?? 480;
                    const over = t.duration > limit;
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: over ? 'rgba(255,42,95,0.03)' : 'transparent' }}>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{t.name}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span className="badge" style={{ background: t.type === 'Vehicle' ? 'rgba(56,189,248,0.1)' : 'rgba(129,140,248,0.1)', color: t.type === 'Vehicle' ? 'var(--color-primary)' : 'var(--color-secondary)', border: 'none', fontSize: '0.65rem' }}>
                            {t.type === 'Vehicle' ? '🚗' : '🚶'} {t.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: 'var(--color-text-secondary)' }}>{t.role}</td>
                        <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{t.entryTime}</td>
                        <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{t.exitTime}</td>
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: over ? 'var(--color-denied)' : 'var(--color-granted)' }}>
                          {formatDuration(t.duration)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          {over ? <span className="badge badge-denied">OVERSTAY</span> : <span className="badge badge-granted">NORMAL</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Configure Thresholds ── */}
        {reportTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: '10px', padding: '0.75rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              ℹ️ Set the maximum permitted campus stay duration (in minutes) per role. Any active or completed visit exceeding this limit will be flagged as an <strong style={{ color: 'var(--color-denied)' }}>OVERSTAY</strong> in the breach report.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {Object.keys(editingThresholds).map(role => (
                <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    {role}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="10"
                      max="2880"
                      value={editingThresholds[role]}
                      onChange={e => setEditingThresholds(prev => ({ ...prev, [role]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      = {formatDuration(Number(editingThresholds[role]))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={saveThresholds}>SAVE THRESHOLDS</button>
              <button className="btn-secondary" onClick={() => setEditingThresholds({ ...thresholds })}>RESET</button>
            </div>
          </div>
        )}

      </div>

      {/* ── Anomaly breakdown bars ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Flagged Anomalies Breakdown (Last 30 Days)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.25rem' }}>
          {[
            { label: 'Tailgating Detections (Entry points)', count: 42, pct: 42 },
            { label: 'Loitering / Suspicious Dwelling (Gate perimeters)', count: 18, pct: 18 },
            { label: 'Unauthorized Off-Hours Attempts', count: 79, pct: 79 }
          ].map(item => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.count} Incidents</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${item.pct}%`, height: '100%', background: 'linear-gradient(to right, var(--color-warning), var(--color-denied))' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
