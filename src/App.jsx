import React, { useState, useEffect } from 'react';
import CameraStream from './components/CameraStream';
import GateControl from './components/GateControl';
import ManualClearance from './components/ManualClearance';
import AccessPortal from './components/AccessPortal';
import DashboardStats from './components/DashboardStats';
import HardwareSpecs from './components/HardwareSpecs';
import SystemLogs from './components/SystemLogs';
import SystemConfig from './components/SystemConfig';
import WebcamViewer from './components/WebcamViewer';
import { db } from './utils/db';


export default function App() {
  const [viewportMode, setViewportMode] = useState('desktop'); // desktop, mobile
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring, portal, analytics, blueprint, config
  const [mobileTab, setMobileTab] = useState('alerts'); // alerts, gates, clearance, settings

  // Interactive Simulation Time and Day
  const [simTime, setSimTime] = useState('08:30');
  const [simDay, setSimDay] = useState('Monday');
  const [isClockRunning, setIsClockRunning] = useState(true);

  // Dynamic Persistable System Configuration Settings
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('smartcampus_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      thresholds: {
        'Visitor/Guest': 120, // 2 Hours
        'Student': 480,       // 8 Hours
        'Faculty': 600,       // 10 Hours
        'Staff': 720,         // 12 Hours
        'Admin': 1440         // 24 Hours
      },
      gate: {
        holdOpenSeconds: 5,
        relayPulseMs: 1000,
        retryAttempts: 3,
        tailgatingWindowSec: 5,
        autoClose: true,
        safetyBeamOverride: true,
        lockdownMode: false
      },
      ai: {
        lprConfidenceThreshold: 85,
        faceMatchThreshold: 80,
        loiteringTriggerSec: 30,
        trackingModel: 'bytetrack',
        inferenceFps: 15,
        precision: 'fp16',
        anomalyDetection: true,
        useTensorRT: true,
        crossCameraMatch: false
      },
      alerts: {
        onDenied: true,
        onOverstay: true,
        onTailgating: true,
        onLoitering: true,
        onSensorFault: true,
        sirenOnDenial: false,
        strobeOnAnomaly: true,
        notifyEmail: 'security@campus.edu',
        escalationDelayMin: 15
      },
      sensors: {
        entryRtspUrl: 'rtsp://192.168.12.101:554/stream1',
        exitRtspUrl: 'rtsp://192.168.12.102:554/stream1',
        modbusTcpIp: '192.168.12.50',
        modbusTcpPort: 502,
        gateRelayCoil: 0,
        alarmSirenCoil: 1,
        strobeCoil: 2,
        apiEndpoint: 'https://api.campus.security/v1',
        localCacheFallback: true,
        encryptRtsp: false
      },
      database: {
        engine: 'postgresql',
        host: '192.168.12.60',
        port: 5432,
        name: 'campus_security',
        username: 'db_admin',
        password: '••••••••',
        poolSize: 15,
        syncInterval: 30,
        sslEnabled: true,
        autoSync: true
      },
      sim: {
        clockSpeedSec: 4,
        spawnIntervalFrames: 180,
        unauthorisedSpawnPct: 25,
        campusName: 'SMARTCAMPUS AI',
        showTelemetry: true,
        enableAnomalies: true
      }
    };
  });

  const handleSaveConfig = (updatedConfig) => {
    setConfig(updatedConfig);
    localStorage.setItem('smartcampus_config', JSON.stringify(updatedConfig));
  };


  // Active Entrants on Campus tracker state — Loaded from local persistent database
  const [activeOnCampus, setActiveOnCampus] = useState(() => db.getActive());

  // Completed visit trips history state — Loaded from local persistent database
  const [completedTrips, setCompletedTrips] = useState(() => db.getCompleted());

  // Default Profiles Registry — Loaded from local persistent database
  const [profiles, setProfiles] = useState(() => db.getProfiles());

  // Telemetry Gates Status
  const [entryGateStatus, setEntryGateStatus] = useState('CLOSED');
  const [exitGateStatus, setExitGateStatus] = useState('CLOSED');

  // Manual Clearance Queue
  const [manualQueue, setManualQueue] = useState([]);
  
  // Quick profile registration channel
  const [quickRegData, setQuickRegData] = useState(null);

  // Security Event Logs — Loaded from local persistent database
  const [logs, setLogs] = useState(() => db.getLogs());

  // Hardware Devices Registry — Loaded from local persistent database
  const [devices, setDevices] = useState(() => db.getDevices());

  // Auto-sync states to database tables
  useEffect(() => {
    db.saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    db.saveActive(activeOnCampus);
  }, [activeOnCampus]);

  useEffect(() => {
    db.saveCompleted(completedTrips);
  }, [completedTrips]);

  useEffect(() => {
    db.saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    db.saveDevices(devices);
  }, [devices]);

  const [mobIntercomActive, setMobIntercomActive] = useState(false);

  // Helper to calculate time differences in minutes
  const timeDiffInMinutes = (start, end) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // Midnight warp
    return diff;
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Automated clock progression
  useEffect(() => {
    if (!isClockRunning) return;
    const interval = setInterval(() => {
      setSimTime(prev => {
        const [hours, minutes] = prev.split(':').map(Number);
        let newMin = minutes + 5;
        let newHour = hours;
        if (newMin >= 60) {
          newMin = 0;
          newHour = (hours + 1) % 24;
        }
        return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
      });
    }, config.sim.clockSpeedSec * 1000);

    return () => clearInterval(interval);
  }, [isClockRunning, config.sim.clockSpeedSec]);

  const addLogEvent = (event) => {
    setLogs(prev => [event, ...prev.slice(0, 99)]);
  };

  // Entry Success - Add to Active On Campus
  const handleEntrySuccess = (object) => {
    const newEntrant = {
      id: Date.now(),
      name: object.name,
      type: object.type,
      value: object.value,
      role: object.role,
      tier: object.tier || 'Tier 2',
      entryTime: simTime
    };
    setActiveOnCampus(prev => [...prev, newEntrant]);
    addLogEvent({
      type: 'system',
      message: `Database: ${object.name} (${object.value}) registered in active on-campus index at ${simTime}.`,
      gate: 'Database'
    });
  };

  // Exit Success - Move from active to completed
  const handleExitSuccess = (onCampusId) => {
    setActiveOnCampus(prev => {
      const target = prev.find(item => item.id === onCampusId);
      if (target) {
        const durationMin = timeDiffInMinutes(target.entryTime, simTime);
        const completedTrip = {
          ...target,
          exitTime: simTime,
          duration: durationMin
        };
        
        setCompletedTrips(completed => [completedTrip, ...completed.slice(0, 49)]); // cap history at 50
        
        // Log duration spent
        addLogEvent({
          type: 'granted',
          message: `Trip Completed: ${target.name} (${target.value}) exited at ${simTime}. Duration: ${formatDuration(durationMin)}.`,
          gate: 'Database'
        });
      }
      return prev.filter(item => item.id !== onCampusId);
    });
  };

  // Profile CRUD handlers
  const handleAddProfile = (newProfile) => {
    setProfiles(prev => [...prev, newProfile]);
    addLogEvent({
      type: 'system',
      message: `Database: Added new credential access for ${newProfile.name} (${newProfile.value}).`,
      gate: 'Database'
    });
  };

  const handleUpdateProfile = (updatedProfile) => {
    setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
    addLogEvent({
      type: 'system',
      message: `Database: Updated access credentials for ${updatedProfile.name} (${updatedProfile.value}).`,
      gate: 'Database'
    });
  };

  const handleDeleteProfile = (id) => {
    const deleted = profiles.find(p => p.id === id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (deleted) {
      addLogEvent({
        type: 'system',
        message: `Database: Revoked access credentials for ${deleted.name} (${deleted.value}).`,
        gate: 'Database'
      });
    }
  };

  // Hardware Device CRUD handlers
  const handleAddDevice = (newDevice) => {
    const device = { ...newDevice, id: Date.now() };
    setDevices(prev => [...prev, device]);
    addLogEvent({
      type: 'system',
      message: `Hardware Registry: Added new device "${device.name}" (${device.type}) at ${device.address}.`,
      gate: 'System'
    });
  };

  const handleUpdateDevice = (updatedDevice) => {
    setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
    addLogEvent({
      type: 'system',
      message: `Hardware Registry: Updated device "${updatedDevice.name}" configuration.`,
      gate: 'System'
    });
  };

  const handleDeleteDevice = (id) => {
    const deleted = devices.find(d => d.id === id);
    setDevices(prev => prev.filter(d => d.id !== id));
    if (deleted) {
      addLogEvent({
        type: 'system',
        message: `Hardware Registry: Removed device "${deleted.name}" (${deleted.type}) from registry.`,
        gate: 'System'
      });
    }
  };

  // Gate transition handlers
  const triggerGateAction = (gateId, action) => {
    const setStatus = gateId === 'entry' ? setEntryGateStatus : setExitGateStatus;
    
    if (action === 'OPEN') {
      setStatus('OPENING');
      setTimeout(() => setStatus('OPEN'), 1000);
    } else if (action === 'CLOSE') {
      setStatus('CLOSING');
      setTimeout(() => setStatus('CLOSED'), 1000);
    }
  };

  // Gate Manual Overrides
  const handleGateOverride = (gateId, action) => {
    const gateName = gateId === 'entry' ? 'North Entry Gate' : 'South Exit Gate';
    
    if (action === 'OPEN') {
      triggerGateAction(gateId, 'OPEN');
      addLogEvent({
        type: 'system',
        message: `Manual Override: Guard forced OPEN the ${gateName}.`,
        gate: gateName
      });
    } else if (action === 'CLOSE') {
      const setStatus = gateId === 'entry' ? setEntryGateStatus : setExitGateStatus;
      setStatus('CLOSED');
      addLogEvent({
        type: 'system',
        message: `Manual Override: Guard forced LOCK/CLOSE on ${gateName}.`,
        gate: gateName
      });
    } else if (action === 'RESET') {
      const setStatus = gateId === 'entry' ? setEntryGateStatus : setExitGateStatus;
      setStatus('CLOSED');
      addLogEvent({
        type: 'system',
        message: `Manual Override: Gate controllers on ${gateName} reset to standard rule mode.`,
        gate: gateName
      });
    }
  };

  // Manual Clearance handlers
  const handleQueueManualClearance = (clearanceRequest) => {
    setManualQueue(prev => [...prev, clearanceRequest]);
  };

  const handleResolveManualClearance = (requestId, approved) => {
    const item = manualQueue.find(q => q.id === requestId);
    if (item) {
      item.onResolve(approved);
      setManualQueue(prev => prev.filter(q => q.id !== requestId));
    }
  };

  const handleTimeSliderChange = (e) => {
    const val = Number(e.target.value);
    const h = Math.floor(val / 60);
    const m = val % 60;
    setSimTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const getSliderValue = () => {
    const [h, m] = simTime.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="app-container">
      
      {/* Viewport Toggle Header Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'rgba(56, 189, 248, 0.05)', 
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '12px',
        padding: '0.6rem 1.2rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>🖥️ PLATFORM VIEWPORT:</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Toggle layout format:</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setViewportMode('desktop')}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer',
              border: viewportMode === 'desktop' ? '1px solid var(--color-primary)' : '1px solid transparent',
              background: viewportMode === 'desktop' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.3)',
              color: viewportMode === 'desktop' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
            }}
          >
            💻 DESKTOP CONTROL CENTER
          </button>
          <button 
            onClick={() => setViewportMode('mobile')}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: 'pointer',
              border: viewportMode === 'mobile' ? '1px solid var(--color-primary)' : '1px solid transparent',
              background: viewportMode === 'mobile' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.3)',
              color: viewportMode === 'mobile' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
            }}
          >
            📱 MOBILE PATROL APP
          </button>
        </div>
      </div>

      {viewportMode === 'desktop' ? (
        /* ==================================================
           DESKTOP INTERFACE
           ================================================== */
        <>
          <header>
            <div className="brand-section">
              <div className="brand-logo">{config.sim.campusName.substring(0, 1)}</div>
              <div className="brand-title">
                <h1>{config.sim.campusName}</h1>
                <p>Integrated Gate Security & Biometrics Portal</p>
              </div>
            </div>

            {/* Dynamic Simulation Time Controls */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '0.4rem 0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Day:</span>
                <select 
                  value={simDay} 
                  onChange={(e) => setSimDay(e.target.value)}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', width: '100px', background: 'rgba(0,0,0,0.3)', border: 'none' }}
                >
                  <option value="Monday">Monday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: '150px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>CLOCK: <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>{simTime}</strong></span>
                  <span 
                    onClick={() => setIsClockRunning(!isClockRunning)} 
                    style={{ color: isClockRunning ? 'var(--color-granted)' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {isClockRunning ? '● RUNNING' : '■ PAUSED'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1439" 
                  value={getSliderValue()} 
                  onChange={handleTimeSliderChange}
                  style={{ height: '3px', cursor: 'pointer', padding: 0 }}
                />
              </div>
            </div>

            <nav className="nav-tabs">
              <button 
                className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
                onClick={() => setActiveTab('monitoring')}
              >
                📊 Gate Monitoring
              </button>
              <button 
                className={`tab-btn ${activeTab === 'portal' ? 'active' : ''}`}
                onClick={() => setActiveTab('portal')}
              >
                🔑 Access Portal
              </button>
              <button 
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📈 Predictions & Duration Charts
              </button>
              <button 
                className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
                onClick={() => setActiveTab('config')}
              >
                ⚙️ System Settings
              </button>
              <button 
                className={`tab-btn ${activeTab === 'blueprint' ? 'active' : ''}`}
                onClick={() => setActiveTab('blueprint')}
              >
                📡 Hardware Blueprint
              </button>
            </nav>
          </header>

          {activeTab === 'monitoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
                <CameraStream 
                  gateId="entry"
                  gateName="North Entry Gate"
                  gateStatus={entryGateStatus}
                  onGateTrigger={(action) => triggerGateAction('entry', action)}
                  profiles={profiles}
                  onManualClearance={handleQueueManualClearance}
                  currentSimTime={simTime}
                  currentSimDay={simDay}
                  onLogEvent={addLogEvent}
                  activeOnCampus={activeOnCampus}
                  onExitSuccess={handleExitSuccess}
                  onEntrySuccess={handleEntrySuccess}
                />
                
                <CameraStream 
                  gateId="exit"
                  gateName="South Exit Gate"
                  gateStatus={exitGateStatus}
                  onGateTrigger={(action) => triggerGateAction('exit', action)}
                  profiles={profiles}
                  onManualClearance={handleQueueManualClearance}
                  currentSimTime={simTime}
                  currentSimDay={simDay}
                  onLogEvent={addLogEvent}
                  activeOnCampus={activeOnCampus}
                  onExitSuccess={handleExitSuccess}
                  onEntrySuccess={handleEntrySuccess}
                />
              </div>

              {/* ── Webcam AI Screening Panel ── */}
              <WebcamViewer />

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <GateControl 
                    gateId="entry"
                    gateName="North Entry Gate"
                    gateStatus={entryGateStatus}
                    onOverride={handleGateOverride}
                    logs={logs}
                  />
                  <GateControl 
                    gateId="exit"
                    gateName="South Exit Gate"
                    gateStatus={exitGateStatus}
                    onOverride={handleGateOverride}
                    logs={logs}
                  />
                </div>

                <ManualClearance 
                  queue={manualQueue}
                  onResolve={handleResolveManualClearance}
                  onRegisterQuickLink={(profileData) => {
                    setQuickRegData(profileData);
                    setActiveTab('portal');
                  }}
                />

                <SystemLogs logs={logs} />
              </div>
            </div>
          )}

          {activeTab === 'portal' && (
            <AccessPortal 
              profiles={profiles}
              onAddProfile={handleAddProfile}
              onUpdateProfile={handleUpdateProfile}
              onDeleteProfile={handleDeleteProfile}
              quickRegData={quickRegData}
              onClearQuickReg={() => setQuickRegData(null)}
            />
          )}

          {activeTab === 'analytics' && (
            <DashboardStats 
              logs={logs} 
              profiles={profiles} 
              activeOnCampus={activeOnCampus}
              completedTrips={completedTrips}
              thresholds={config.thresholds}
              onThresholdsChange={(newT) => handleSaveConfig({ ...config, thresholds: newT })}
              simTime={simTime}
            />
          )}

          {activeTab === 'config' && (
            <SystemConfig 
              config={config}
              onChange={(updated) => setConfig(updated)}
              onSave={handleSaveConfig}
              devices={devices}
              onAddDevice={handleAddDevice}
              onUpdateDevice={handleUpdateDevice}
              onDeleteDevice={handleDeleteDevice}
              onDbReset={() => {
                const data = db.resetDatabase();
                setProfiles(data.profiles);
                setLogs(data.logs);
                setActiveOnCampus(data.active);
                setCompletedTrips(data.completed);
                setDevices(data.devices);
              }}
              onDbWipe={() => {
                const data = db.wipeDatabase();
                setProfiles(data.profiles);
                setLogs(data.logs);
                setActiveOnCampus(data.active);
                setCompletedTrips(data.completed);
                setDevices(data.devices);
              }}
            />
          )}

          {activeTab === 'blueprint' && (
            <HardwareSpecs />
          )}

          <footer style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
            paddingTop: '1rem',
            marginTop: 'auto',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)'
          }}>
            <span>AI Inference Core: YOLOv8 {config.ai.precision.toUpperCase()} • ONNX Runtime GPU</span>
            <span>Modbus TCP Gateway: Connected ({config.sensors.modbusTcpIp})</span>
            <span>System Status: 🟢 Fully Operational</span>
          </footer>
        </>
      ) : (
        /* ==================================================
           MOBILE INTERFACE SIMULATOR
           ================================================== */
        <div className="mobile-frame-container">
          <div className="mobile-phone">
            
            <div className="mobile-notch" />

            <div className="mobile-status-bar">
              <div>{simTime}</div>
              <div className="icons">
                <span>📶</span>
                <span>📶</span>
                <span>🔋 98%</span>
              </div>
            </div>

            <div className="mobile-screen-content">
              
              {/* Mobile Tab 1: Home / Alerts */}
              {mobileTab === 'alerts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(16,24,48,0.8))' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Officer Duty Status</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-granted)' }}>🟢 ACTIVE PATROL</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Campus Zone</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Secured</div>
                    </div>
                  </div>

                  {manualQueue.length > 0 && (
                    <div style={{
                      background: 'rgba(255, 42, 95, 0.1)',
                      border: '1px solid rgba(255, 42, 95, 0.3)',
                      borderRadius: '12px',
                      padding: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <span style={{ fontSize: '1.4rem' }}>🚨</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-denied)' }}>CLEARANCE ACTION REQUIRED</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text)' }}>
                          {manualQueue.length} targets sitting in gate bypass lane.
                        </div>
                      </div>
                      <button 
                        onClick={() => setMobileTab('clearance')}
                        style={{
                          background: 'var(--color-denied)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        VIEW
                      </button>
                    </div>
                  )}

                  {/* Active Gate Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>North Entry Gate</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem', color: entryGateStatus === 'OPEN' ? 'var(--color-granted)' : 'var(--color-denied)' }}>
                        {entryGateStatus}
                      </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>South Exit Gate</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem', color: exitGateStatus === 'OPEN' ? 'var(--color-granted)' : 'var(--color-denied)' }}>
                        {exitGateStatus}
                      </div>
                    </div>
                  </div>

                  {/* Patrol Activity Feed */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Patrol Activity Feed
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                      {logs.slice(0, 10).map((log, i) => (
                        <div 
                          key={i}
                          style={{
                            padding: '0.5rem 0.65rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${
                              log.type === 'granted' ? 'var(--color-granted)' : 
                              log.type === 'denied' ? 'var(--color-denied)' : 'var(--color-warning)'
                            }`,
                            fontSize: '0.7rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.6rem', marginBottom: '0.15rem' }}>
                            <span>{log.gate}</span>
                            <span>{simTime}</span>
                          </div>
                          <div style={{ color: 'var(--color-text)', fontWeight: 500 }}>{log.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Mobile Tab 2: Remotes / Gates Override */}
              {mobileTab === 'gates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    Remotes & Barrier Actuators
                  </h3>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>North Gate (Entry)</h4>
                      <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: entryGateStatus === 'OPEN' ? 'rgba(0,255,159,0.1)' : 'rgba(255,42,95,0.1)', color: entryGateStatus === 'OPEN' ? 'var(--color-granted)' : 'var(--color-denied)', border: 'none' }}>
                        {entryGateStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn-primary" 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', justifyContent: 'center' }}
                        onClick={() => handleGateOverride('entry', 'OPEN')}
                        disabled={entryGateStatus === 'OPEN'}
                      >
                        OPEN GATE
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', justifyContent: 'center' }}
                        onClick={() => handleGateOverride('entry', 'CLOSE')}
                        disabled={entryGateStatus === 'CLOSED'}
                      >
                        FORCE LOCK
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>South Gate (Exit)</h4>
                      <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: exitGateStatus === 'OPEN' ? 'rgba(0,255,159,0.1)' : 'rgba(255,42,95,0.1)', color: exitGateStatus === 'OPEN' ? 'var(--color-granted)' : 'var(--color-denied)', border: 'none' }}>
                        {exitGateStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn-primary" 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', justifyContent: 'center' }}
                        onClick={() => handleGateOverride('exit', 'OPEN')}
                        disabled={exitGateStatus === 'OPEN'}
                      >
                        OPEN GATE
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', justifyContent: 'center' }}
                        onClick={() => handleGateOverride('exit', 'CLOSE')}
                        disabled={exitGateStatus === 'CLOSED'}
                      >
                        FORCE LOCK
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'rgba(0, 255, 159, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 255, 159, 0.15)', fontSize: '0.7rem', color: 'var(--color-granted)', display: 'flex', gap: '0.5rem' }}>
                    <span>🛡️</span>
                    <div>
                      <strong>Modbus TCP Loop is nominal.</strong> Hardware loops override logic is active. Safety eyes are clear.
                    </div>
                  </div>

                </div>
              )}

              {/* Mobile Tab 3: Clearance Terminal / Mobile Intercom */}
              {mobileTab === 'clearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    Mobile Clearance Terminal
                  </h3>

                  {manualQueue.length === 0 ? (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>✅</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Clearance List Empty</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>No gates are awaiting manual clearance.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        Awaiting Decision ({manualQueue.length} Pending)
                      </div>

                      {manualQueue.slice(0, 1).map(item => (
                        <div key={item.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid rgba(255, 42, 95, 0.3)', background: 'rgba(255, 42, 95, 0.02)' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span className="badge" style={{ fontSize: '0.55rem', backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--color-text)' }}>
                                {item.type.toUpperCase()}
                              </span>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.25rem' }}>{item.value}</h4>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{item.time}</span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            Location: <strong>{item.gate}</strong>
                            <div style={{ color: 'var(--color-denied)', fontWeight: 600, marginTop: '0.15rem' }}>
                              Reason: {item.reason}
                            </div>
                          </div>

                          <div style={{ 
                            background: 'rgba(0, 0, 0, 0.3)', 
                            borderRadius: '8px', 
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                          }}>
                            <button
                              onClick={() => setMobIntercomActive(!mobIntercomActive)}
                              style={{
                                padding: '0.35rem 0.6rem',
                                border: 'none',
                                borderRadius: '6px',
                                background: mobIntercomActive ? 'var(--color-denied)' : 'var(--color-primary)',
                                color: '#070a13',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              🎤 {mobIntercomActive ? 'CLOSE' : 'CALL'}
                            </button>
                            
                            {mobIntercomActive ? (
                              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '18px' }}>
                                {[...Array(6)].map((_, idx) => (
                                  <div 
                                    key={idx} 
                                    style={{
                                      width: '2px',
                                      height: '10px',
                                      backgroundColor: 'var(--color-primary)',
                                      animation: 'audio-wave 1.2s infinite ease-in-out',
                                      animationDelay: `${idx * 0.15}s`
                                    }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Intercom offline</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button 
                              className="btn-primary" 
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                              onClick={() => handleResolveManualClearance(item.id, true)}
                            >
                              GRANT
                            </button>
                            <button 
                              className="btn-danger" 
                              style={{ flex: 0.8, padding: '0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}
                              onClick={() => handleResolveManualClearance(item.id, false)}
                            >
                              DENY
                            </button>
                          </div>

                        </div>
                      ))}

                    </div>
                  )}

                </div>
              )}

              {/* Mobile Tab 4: Diagnostics / Settings */}
              {mobileTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                    Patrol Device Settings
                  </h3>

                  {/* Device Telemetry Panel */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem 0.9rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      ⚡ Telemetry Status
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>AI inference status:</span>
                      <span style={{ color: 'var(--color-granted)', fontWeight: 'bold' }}>ONLINE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>API Comms Node:</span>
                      <span style={{ color: 'var(--color-granted)', fontWeight: 'bold' }}>CONNECTED</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Edge GPU Temp:</span>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>48°C</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>GPU Tensor Core:</span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{config.ai.precision.toUpperCase()} Mode</span>
                    </div>
                  </div>

                  {/* Live Mobile Config Panels */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0.9rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      ⏱️ Overstay Thresholds (Min)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      {Object.keys(config.thresholds).map(role => (
                        <div key={role} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.18)', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{role}:</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{config.thresholds[role]}m</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sim Clock Management */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '0.75rem 0.9rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      🕐 Sim Clock Control
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Time / Day:</span>
                      <strong style={{ color: 'var(--color-primary)' }}>{simTime} • {simDay}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Interval Clock Speed:</span>
                      <strong style={{ color: 'var(--color-text)' }}>{config.sim.clockSpeedSec}s / 5m</strong>
                    </div>
                    <button 
                      className="btn-secondary" 
                      style={{ fontSize: '0.7rem', padding: '0.45rem', width: '100%', justifyContent: 'center', fontWeight: 'bold' }}
                      onClick={() => setIsClockRunning(!isClockRunning)}
                    >
                      {isClockRunning ? '⏸️ PAUSE CLOCK SIMULATOR' : '▶️ RESUME CLOCK SIMULATOR'}
                    </button>
                  </div>

                  {/* Active spawn parameters config channel */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.75rem 0.9rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      👤 Edge Spawn Parameters
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Spawn Interval:</span>
                        <input 
                          type="number" 
                          min="30" max="600"
                          value={config.sim.spawnIntervalFrames} 
                          onChange={(e) => handleSaveConfig({ ...config, sim: { ...config.sim, spawnIntervalFrames: Number(e.target.value) } })}
                          style={{ width: '65px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Unauthorised spawn:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input 
                            type="number" 
                            min="0" max="100"
                            value={config.sim.unauthorisedSpawnPct} 
                            onChange={(e) => handleSaveConfig({ ...config, sim: { ...config.sim, unauthorisedSpawnPct: Number(e.target.value) } })}
                            style={{ width: '50px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center' }}
                          />
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Bottom Nav Bar */}
            <div className="mobile-nav-bar">
              <button 
                className={`mobile-nav-btn ${mobileTab === 'alerts' ? 'active' : ''}`}
                onClick={() => setMobileTab('alerts')}
              >
                <span>🚨</span>
                <span>Feed</span>
              </button>
              
              <button 
                className={`mobile-nav-btn ${mobileTab === 'gates' ? 'active' : ''}`}
                onClick={() => setMobileTab('gates')}
              >
                <span>⚙️</span>
                <span>Gates</span>
              </button>
              
              <button 
                className={`mobile-nav-btn ${mobileTab === 'clearance' ? 'active' : ''}`}
                onClick={() => setMobileTab('clearance')}
              >
                <span style={{ position: 'relative' }}>
                  📟
                  {manualQueue.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-8px',
                      background: 'var(--color-denied)',
                      color: 'white',
                      fontSize: '0.55rem',
                      fontWeight: 900,
                      borderRadius: '50%',
                      width: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {manualQueue.length}
                    </span>
                  )}
                </span>
                <span>Manual</span>
              </button>
              
              <button 
                className={`mobile-nav-btn ${mobileTab === 'settings' ? 'active' : ''}`}
                onClick={() => setMobileTab('settings')}
              >
                <span>🛠️</span>
                <span>Info</span>
              </button>
            </div>

            <div className="mobile-home-indicator" />

          </div>
        </div>
      )}

    </div>
  );
}
