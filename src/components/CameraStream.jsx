import React, { useEffect, useRef, useState } from 'react';

export default function CameraStream({ 
  gateId, 
  gateName, 
  gateStatus, 
  onGateTrigger, 
  profiles, 
  onManualClearance,
  currentSimTime,
  currentSimDay,
  onLogEvent,
  activeOnCampus = [],
  onExitSuccess,
  onEntrySuccess
}) {
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const [activeObject, setActiveObject] = useState(null);
  const [scanStatus, setScanStatus] = useState('IDLE'); // IDLE, SCANNING, GRANTED, DENIED

  // Pre-load background footage image asset
  useEffect(() => {
    const img = new Image();
    img.src = gateId === 'entry' ? '/assets/entry_feed.png' : '/assets/exit_feed.png';
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [gateId]);

  // Keep ref to latest variables for the canvas loop
  const stateRef = useRef({ profiles, scanStatus, gateStatus, activeObject, activeOnCampus });
  
  useEffect(() => {
    stateRef.current = { profiles, scanStatus, gateStatus, activeObject, activeOnCampus };
  }, [profiles, scanStatus, gateStatus, activeObject, activeOnCampus]);

  // Object Spawning and CV Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    
    // Virtual dimensions
    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    // Simulation variables
    let object = null;
    let spawnTimer = 0;
    const gridSpacing = 40;

    const runSimulation = () => {
      // 1. Draw CCTV Background Footage
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height);
        ctx.fillStyle = 'rgba(7, 10, 19, 0.45)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Scanning Zone
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(200, 100, 240, 160);
      ctx.setLineDash([]);
      
      // Draw simulated camera overlays
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`CAM-ID: ${gateId.toUpperCase()}_C01`, 20, 30);
      ctx.fillText(`RESOLUTION: 1080P @ 30FPS`, 20, 45);
      ctx.fillText(`COMPRESSION: H.265 ADV`, 20, 60);
      
      const timeStr = new Date().toLocaleTimeString();
      ctx.fillText(`SYS_TIME: ${timeStr}`, width - 150, 30);
      
      // REC indicators
      ctx.fillStyle = '#ff2a5f';
      ctx.beginPath();
      ctx.arc(width - 25, 45, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 42, 95, 0.4)';
      ctx.beginPath();
      ctx.arc(width - 25, 45, 8 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`REC`, width - 55, 49);

      // Barrier represent
      ctx.lineWidth = 8;
      ctx.strokeStyle = gateStatus === 'OPEN' ? '#00ff9f' : 
                        gateStatus === 'OPENING' || gateStatus === 'CLOSING' ? '#ffb800' : '#ff2a5f';
      
      ctx.beginPath();
      ctx.arc(450, 180, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(450, 180);
      if (gateStatus === 'OPEN') {
        ctx.lineTo(450, 100);
      } else if (gateStatus === 'OPENING') {
        const angle = (Date.now() % 1000) / 1000 * Math.PI / 2;
        ctx.lineTo(450 - Math.sin(angle) * 80, 180 - Math.cos(angle) * 80);
      } else if (gateStatus === 'CLOSING') {
        const angle = (1 - (Date.now() % 1000) / 1000) * Math.PI / 2;
        ctx.lineTo(450 - Math.sin(angle) * 80, 180 - Math.cos(angle) * 80);
      } else {
        ctx.lineTo(450, 260);
      }
      ctx.stroke();

      // Spawn Object
      if (!object) {
        spawnTimer++;
        if (spawnTimer > 120) {
          spawnTimer = 0;
          
          let identity = null;
          let spawnedType = 'vehicle';
          let campusId = null;

          if (gateId === 'exit' && stateRef.current.activeOnCampus.length > 0) {
            // EXIT GATE: Pull a vehicle or pedestrian currently on campus
            const onCampusList = stateRef.current.activeOnCampus;
            const target = onCampusList[Math.floor(Math.random() * onCampusList.length)];
            
            spawnedType = target.type === 'Vehicle' ? 'vehicle' : 'person';
            campusId = target.id;
            identity = {
              registered: true,
              name: target.name,
              value: target.value,
              role: target.role,
              allowedDays: 'Everyday', // already cleared on entry, allow exit
              allowedTimings: '24 Hours',
              tier: target.tier
            };
          } else {
            // ENTRY GATE or Empty campus: Standard random spawns
            spawnedType = Math.random() > 0.4 ? 'vehicle' : 'person';
            
            if (Math.random() > 0.3) {
              const registered = stateRef.current.profiles;
              if (registered && registered.length > 0) {
                const eligible = registered.filter(p => 
                  (spawnedType === 'vehicle' && p.type === 'Vehicle') || 
                  (spawnedType === 'person' && p.type === 'Face')
                );
                if (eligible.length > 0) {
                  const p = eligible[Math.floor(Math.random() * eligible.length)];
                  identity = {
                    registered: true,
                    name: p.name,
                    value: p.value,
                    role: p.role,
                    allowedDays: p.allowedDays,
                    allowedTimings: p.allowedTimings,
                    tier: p.tier
                  };
                }
              }
            }
          }
          
          if (!identity) {
            const isCar = spawnedType === 'vehicle';
            identity = {
              registered: false,
              name: isCar ? 'Unknown Vehicle' : 'Unknown Pedestrian',
              value: isCar ? `PLATE-${Math.floor(1000 + Math.random()*9000)}` : 'No Match Found',
              role: 'Unauthorized',
              allowedDays: 'None',
              allowedTimings: 'None',
              tier: 'None'
            };
          }

          object = {
            id: Date.now(),
            onCampusId: campusId, // tracks physical campus item
            type: spawnedType,
            x: 20,
            y: 180 + (Math.random() - 0.5) * 20,
            width: spawnedType === 'vehicle' ? 80 : 30,
            height: spawnedType === 'vehicle' ? 45 : 55,
            speed: spawnedType === 'vehicle' ? 3.5 : 1.8,
            state: 'approaching',
            identity,
            opacity: 0,
            scanProgress: 0,
            color: '#ffb800'
          };
          setActiveObject(object);
          setScanStatus('IDLE');
        }
      }

      // Draw and update active object
      if (object) {
        if (object.opacity < 1) object.opacity += 0.05;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(object.x - object.width/2, object.y + object.height/2 - 5, object.width, 10);

        if (object.state === 'approaching') {
          object.x += object.speed;
          
          if (object.x >= 220) {
            object.state = 'scanning';
            object.speed = 0;
            setScanStatus('SCANNING');
            onLogEvent({
              type: 'system',
              message: `AI Core detected approaching ${object.type} at ${gateName}. Scanning biometric/plate credentials...`,
              gate: gateName
            });
          }
        } 
        else if (object.state === 'scanning') {
          object.scanProgress += 1.5;
          
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 2;
          const scanY = object.y - object.height/2 + (object.scanProgress / 100 * object.height);
          ctx.beginPath();
          ctx.moveTo(object.x - object.width/2, scanY);
          ctx.lineTo(object.x + object.width/2, scanY);
          ctx.stroke();

          if (object.scanProgress >= 100) {
            const isAuthorized = validateAccess(object.identity, currentSimTime, currentSimDay);
            
            if (isAuthorized === true) {
              object.state = 'clearing';
              object.color = '#00ff9f';
              setScanStatus('GRANTED');
              
              onLogEvent({
                type: 'granted',
                message: `Access GRANTED for ${object.identity.name} (${object.identity.value}). Role: ${object.identity.role}. Opening ${gateName}.`,
                gate: gateName
              });

              onGateTrigger('OPEN');

              // Trigger dynamic campus log entry/exit database states
              if (gateId === 'entry') {
                onEntrySuccess({
                  name: object.identity.name,
                  type: object.type === 'vehicle' ? 'Vehicle' : 'Human',
                  value: object.identity.value,
                  role: object.identity.role,
                  tier: object.identity.tier
                });
              } else if (gateId === 'exit' && object.onCampusId) {
                onExitSuccess(object.onCampusId);
              }

              setTimeout(() => {
                onGateTrigger('CLOSE');
              }, 4000);
            } 
            else {
              object.state = 'routing_manual';
              object.color = '#ff2a5f';
              setScanStatus('DENIED');
              
              const denyReason = typeof isAuthorized === 'string' ? isAuthorized : 'Unregistered credential';
              
              onLogEvent({
                type: 'denied',
                message: `Access DENIED for ${object.identity.name} (${object.identity.value}) at ${gateName}. Reason: ${denyReason}. Routing to manual clearance.`,
                gate: gateName
              });

              onManualClearance({
                id: object.id,
                name: object.identity.name,
                type: object.type,
                value: object.identity.value,
                gate: gateName,
                time: currentSimTime,
                reason: denyReason,
                onResolve: (approved) => {
                  if (approved) {
                    onLogEvent({
                      type: 'granted',
                      message: `Manual Override: Guard APPROVED access for ${object.identity.name} (${object.identity.value}) at ${gateName}.`,
                      gate: gateName
                    });
                    
                    object.state = 'clearing';
                    object.color = '#00ff9f';
                    setScanStatus('GRANTED');
                    onGateTrigger('OPEN');

                    // Register on campus or exit
                    if (gateId === 'entry') {
                      onEntrySuccess({
                        name: object.identity.name,
                        type: object.type === 'vehicle' ? 'Vehicle' : 'Human',
                        value: object.identity.value,
                        role: object.identity.role,
                        tier: object.identity.tier
                      });
                    } else if (gateId === 'exit' && object.onCampusId) {
                      onExitSuccess(object.onCampusId);
                    }

                    setTimeout(() => {
                      onGateTrigger('CLOSE');
                    }, 4000);
                  } else {
                    onLogEvent({
                      type: 'denied',
                      message: `Manual Override: Guard REJECTED access for ${object.identity.name} (${object.identity.value}). Reversing object.`,
                      gate: gateName
                    });
                    object.state = 'exiting_denied';
                  }
                }
              });
            }
          }
        } 
        else if (object.state === 'clearing') {
          if (stateRef.current.gateStatus === 'OPEN') {
            object.speed = object.type === 'vehicle' ? 4 : 2;
            object.x += object.speed;
            
            if (object.x > 480) {
              object.state = 'cleared';
            }
          }
        } 
        else if (object.state === 'cleared') {
          object.x += object.speed;
          if (object.x > width + 50) {
            object = null;
            setActiveObject(null);
            setScanStatus('IDLE');
          }
        }
        else if (object.state === 'routing_manual') {
          const targetY = 240;
          if (Math.abs(object.y - targetY) > 2) {
            object.y += (targetY - object.y) * 0.1;
          }
          if (object.x < 320) {
            object.x += 1;
          } else {
            object.state = 'waiting_manual';
          }
        }
        else if (object.state === 'waiting_manual') {
          ctx.strokeStyle = '#ffb800';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(object.x, object.y, object.width * 0.8 + Math.sin(Date.now() / 150) * 4, 0, Math.PI*2);
          ctx.stroke();
        }
        else if (object.state === 'exiting_denied') {
          object.x -= 2;
          if (object.x < -object.width) {
            object = null;
            setActiveObject(null);
            setScanStatus('IDLE');
          }
        }

        // Draw Bounding box overlays
        if (object) {
          ctx.save();
          ctx.globalAlpha = object.opacity;
          
          ctx.strokeStyle = object.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(object.x - object.width/2, object.y - object.height/2, object.width, object.height);

          const len = 10;
          const ox = object.x - object.width/2;
          const oy = object.y - object.height/2;
          const ow = object.width;
          const oh = object.height;

          // Corners
          ctx.fillRect(ox, oy, len, 2); ctx.fillRect(ox, oy, 2, len);
          ctx.fillRect(ox + ow - len, oy, len, 2); ctx.fillRect(ox + ow, oy, 2, len);
          ctx.fillRect(ox, oy + oh, len, 2); ctx.fillRect(ox, oy + oh - len, 2, len);
          ctx.fillRect(ox + ow - len, oy + oh, len, 2); ctx.fillRect(ox + ow, oy + oh - len, 2, len);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(ox, oy, ow, oh);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(ox - 1, oy - 22, ow + 2, 20);
          ctx.strokeStyle = object.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(ox - 1, oy - 22, ow + 2, 20);

          ctx.fillStyle = object.color;
          ctx.font = '9px var(--font-mono)';
          
          let text = `${object.type.toUpperCase()}: ${object.identity.value}`;
          if (object.identity.registered) {
            text = `[OK] ${object.identity.name} (${object.identity.tier})`;
          } else if (object.state === 'waiting_manual' || object.state === 'routing_manual') {
            text = `[ALERT] MAN CLEARANCE`;
          }
          
          ctx.fillText(text, ox + 6, oy - 9);
          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(runSimulation);
    };

    animationId = requestAnimationFrame(runSimulation);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gateId, currentSimTime, currentSimDay]);

  const validateAccess = (identity, simTime, simDay) => {
    if (!identity.registered) {
      return 'Credential not registered in database';
    }

    const allowedDays = identity.allowedDays.toLowerCase();
    const currentDay = simDay.toLowerCase();

    let dayMatch = false;
    if (allowedDays === 'everyday' || allowedDays === '24/7' || allowedDays === 'any') {
      dayMatch = true;
    } else if (allowedDays === 'weekdays' && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(currentDay)) {
      dayMatch = true;
    } else if (allowedDays === 'weekends' && ['saturday', 'sunday'].includes(currentDay)) {
      dayMatch = true;
    } else if (allowedDays.includes(currentDay)) {
      dayMatch = true;
    }

    if (!dayMatch) {
      return `Access restricted on ${simDay}`;
    }

    const allowedTimings = identity.allowedTimings;
    if (allowedTimings === '24 Hours' || allowedTimings === '24/7' || allowedTimings === 'Any') {
      return true;
    }

    try {
      const parts = allowedTimings.split('-');
      if (parts.length === 2) {
        const startStr = parts[0].trim();
        const endStr = parts[1].trim();

        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const [currH, currM] = simTime.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const currMinutes = currH * 60 + currM;

        if (currMinutes >= startMinutes && currMinutes <= endMinutes) {
          return true;
        } else {
          return `Access restricted during hours (Allowed: ${allowedTimings})`;
        }
      }
    } catch (e) {
      console.error("Error parsing timing window: ", e);
    }

    return true;
  };

  return (
    <div className="glass-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 600 }}>
          <span 
            className={`status-dot ${scanStatus === 'SCANNING' ? 'active' : ''}`}
            style={{ 
              color: scanStatus === 'GRANTED' ? 'var(--color-granted)' : 
                     scanStatus === 'DENIED' ? 'var(--color-denied)' : 
                     scanStatus === 'SCANNING' ? 'var(--color-warning)' : 'var(--color-text-muted)' 
            }}
          />
          {gateName} Live CV Stream
        </h3>
        <span 
          className="badge" 
          style={{ 
            backgroundColor: gateStatus === 'OPEN' ? 'rgba(0, 255, 159, 0.1)' : 'rgba(255, 42, 95, 0.1)',
            color: gateStatus === 'OPEN' ? 'var(--color-granted)' : 'var(--color-denied)',
            border: gateStatus === 'OPEN' ? '1px solid rgba(0, 255, 159, 0.2)' : '1px solid rgba(255, 42, 95, 0.2)'
          }}
        >
          Gate: {gateStatus}
        </span>
      </div>

      <div style={{ 
        position: 'relative', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#090d16',
        aspectRatio: '16/9'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block' 
          }} 
        />
        {scanStatus === 'SCANNING' && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(to right, transparent, var(--color-warning), transparent)',
            boxShadow: '0 0 10px var(--color-warning)',
            animation: 'scan-line 2s infinite linear'
          }} />
        )}
      </div>

      {activeObject && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0.5rem 0.75rem', 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Target Detected</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
              {activeObject.identity.name} ({activeObject.identity.value})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>AI Core Status</div>
            <div style={{ 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              textAlign: 'right',
              color: scanStatus === 'GRANTED' ? 'var(--color-granted)' : 
                     scanStatus === 'DENIED' ? 'var(--color-denied)' : 
                     scanStatus === 'SCANNING' ? 'var(--color-warning)' : 'var(--color-text-secondary)'
            }}>
              {scanStatus}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
