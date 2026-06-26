import React, { useState } from 'react';

export default function HardwareSpecs() {
  const [selectedComponent, setSelectedComponent] = useState('camera');

  const componentsData = {
    camera: {
      name: 'IP Security Camera (LPR & Face Recognition Optimized)',
      spec: '4K Ultra-HD @ 30fps, Sony STARVIS Low-Light Sensor, H.265 Compression, 2.8-12mm Motorized Varifocal Lens, IP67 Weatherproof, Built-in IR illuminator (up to 50m).',
      purpose: 'Captures high‑contrast RTSP raw video streams of approaching vehicles (license plates) and pedestrians (facial features) under dynamic lighting conditions.',
      interface: 'RTSP (Real‑Time Streaming Protocol) / ONVIF over Cat6 PoE (Power over Ethernet) linked directly to the Edge AI Compute unit.'
    },
    northEntry: {
      name: 'North Entry Gate Camera',
      spec: '1080p IP camera, RTSP stream, weatherproof enclosure.',
      purpose: 'Capture vehicles entering from the north side for license‑plate and object detection.',
      interface: 'RTSP stream to AI compute node.'
    },
    southExit: {
      name: 'South Exit Gate Camera',
      spec: '1080p IP camera, RTSP stream, weatherproof enclosure.',
      purpose: 'Capture vehicles exiting to the south side for exit verification.',
      interface: 'RTSP stream to AI compute node.'
    },
    laptop: {
      name: 'Laptop Built‑in Webcam',
      spec: '720p HD webcam, integrated with laptop display, supports H.264 encoding, auto‑exposure and auto‑focus.',
      purpose: 'Provides local video stream for AI screening directly from the user’s laptop without additional hardware.',
      interface: 'Accessed via WebRTC getUserMedia API in the browser, no external connections.'
    },
    compute: {
      name: 'Edge AI Inference Node (Industrial Compute)',
      spec: 'NVIDIA Jetson Orin Nano (8GB) or Jetson Orin NX. 40 TOPS AI Performance, 6‑core ARM CPU, 1024‑core Ampere GPU. Fan‑less industrial enclosure.',
      purpose: 'Runs high‑speed local computer‑vision inference (YOLOv8 object detection, ByteTrack tracking, DeepSORT licensing‑plate extraction, ArcFace embeddings) with <15ms latency.',
      interface: 'Consumes RTSP stream, outputs JSON event payloads over WebSockets or MQTT to the central control portal and database.'
    },
    actuator: {
      name: 'Automated Barrier Gate & PLC Relay Controller',
      spec: 'Modbus/TCP Ethernet Relay Module (e.g. Advantech ADAM‑6000), 8‑channel Isolated Digital Outputs, 10A SPDT relays. Industrial Automatic Barrier (0.9s opening speed).',
      purpose: 'Translates high‑level software open/close commands into physical electrical signals to activate the pneumatic/hydraulic barrier arm gates.',
      interface: 'Modbus/TCP, MQTT, or direct GPIO copper wiring (normally open/closed relays) connecting the Edge node to the barrier actuator controller cabinet.'
    },
    kiosk: {
      name: 'Human‑Sensor Access Kiosk (Intercom & LED Board)',
      spec: 'SIP‑based VoIP Outdoor Intercom panel with HD camera, 15‑inch Sunlight‑readable Touch Display, Ultra‑Bright matrix LED informational signage.',
      purpose: 'Provides human‑to‑sensor interaction. Displays instructions ("Access Granted", "Scan QR Code", or "Pull Over for Manual Clearance") and routes two‑way VoIP intercom audio to the guard house.',
      interface: 'VoIP (SIP protocol) for intercom audio; TCP/IP socket connection for LED text rendering; RS‑485 serial communication for RFID credential reader.'
    },
    loop: {
      name: 'Inductive Loop Detectors & IR Safety Beams',
      spec: 'Dual‑Channel Inductive Loop Sensor (embedded in concrete pavement), Active Infrared Safety Photo‑eyes.',
      purpose: 'Detects physical presence of a vehicle over the gateway to prevent the barrier arm from dropping prematurely on vehicles or pedestrians (failsafe mechanism).',
      interface: 'Dry‑contact relay inputs wired directly to the PLC controller and barrier logic board for hardware‑level safety override.'
    }
  };

  const activeComp = componentsData[selectedComponent];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Physical Infrastructure & Hardware Specification</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Detailed guide on physical components, connection interfaces, and setup steps for the automated smart campus gateway.
        </p>
      </div>

      {/* Network / Integration Architecture Diagram */}
      <div style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid rgba(255,255,255,0.03)'
      }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Physical‑to‑Digital Signal Schema
        </h4>

        {/* Custom SVG Architecture Diagram */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox="0 0 760 260" width="100%" height="auto" style={{ minWidth: '700px' }}>
            {/* Background grouping boxes */}
            <rect x="10" y="10" width="220" height="240" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" rx="8" />
            <text x="20" y="28" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">FIELD SENSORS & KIOSK</text>

            <rect x="250" y="10" width="220" height="200" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" rx="8" />
            <text x="260" y="28" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">LOCAL EDGE PROCESSING</text>

            <rect x="490" y="10" width="260" height="200" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" rx="8" />
            <text x="500" y="28" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">HUMAN & CLOUD MANAGEMENT</text>

            {/* Nodes */}
            {/* Camera */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('camera')}>
              <rect x="30" y="45" width="180" height="40" fill={selectedComponent === 'camera' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'camera' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="68" fill="var(--color-text)" fontSize="10" fontWeight="600">🎥 IP CCTV Camera</text>
              <text x="140" y="67" fill="var(--color-primary)" fontSize="8" fontWeight="bold">RTSP / PoE</text>
            </g>
            {/* North Entry Gate Camera */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('northEntry')}>
              <rect x="30" y="75" width="180" height="40" fill={selectedComponent === 'northEntry' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'northEntry' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="98" fill="var(--color-text)" fontSize="10" fontWeight="600">🚪 North Entry Camera</text>
              <text x="140" y="97" fill="var(--color-primary)" fontSize="8" fontWeight="bold">RTSP</text>
            </g>
            {/* South Exit Gate Camera */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('southExit')}>
              <rect x="30" y="105" width="180" height="40" fill={selectedComponent === 'southExit' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'southExit' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="128" fill="var(--color-text)" fontSize="10" fontWeight="600">🚪 South Exit Camera</text>
              <text x="140" y="127" fill="var(--color-primary)" fontSize="8" fontWeight="bold">RTSP</text>
            </g>
            {/* LED Sign / Intercom */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('kiosk')}>
              <rect x="30" y="140" width="180" height="40" fill={selectedComponent === 'kiosk' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'kiosk' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="163" fill="var(--color-text)" fontSize="10" fontWeight="600">📟 Kiosk / LED Signage</text>
              <text x="145" y="162" fill="var(--color-primary)" fontSize="8" fontWeight="bold">VoIP / TCP</text>
            </g>
            {/* Ground Loop / Safety Beam */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('loop')}>
              <rect x="30" y="185" width="180" height="40" fill={selectedComponent === 'loop' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'loop' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="208" fill="var(--color-text)" fontSize="10" fontWeight="600">🚗 Ground Safety Loop</text>
              <text x="140" y="207" fill="var(--color-warning)" fontSize="8" fontWeight="bold">Dry Contact</text>
            </g>
            {/* Laptop Webcam */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('laptop')}>
              <rect x="30" y="240" width="180" height="40" fill={selectedComponent === 'laptop' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'laptop' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="40" y="263" fill="var(--color-text)" fontSize="10" fontWeight="600">💻 Laptop Webcam</text>
              <text x="140" y="262" fill="var(--color-primary)" fontSize="8" fontWeight="bold">WebRTC</text>
            </g>
            {/* AI Compute Server */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('compute')}>
              <rect x="270" y="45" width="180" height="40" fill={selectedComponent === 'compute' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'compute' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="280" y="68" fill="var(--color-text)" fontSize="10" fontWeight="600">💻 Edge AI (Jetson Orin)</text>
              <text x="390" y="67" fill="var(--color-granted)" fontSize="8" fontWeight="bold">YOLOv8</text>
            </g>
            {/* PLC Relay Module */}
            <g style={{ cursor: 'pointer' }} onClick={() => setSelectedComponent('actuator')}>
              <rect x="270" y="115" width="180" height="40" fill={selectedComponent === 'actuator' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 24, 48, 0.8)'} stroke={selectedComponent === 'actuator' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'} rx="6" />
              <text x="280" y="138" fill="var(--color-text)" fontSize="10" fontWeight="600">⚙️ Relay Module (PLC)</text>
              <text x="385" y="137" fill="var(--color-warning)" fontSize="8" fontWeight="bold">Modbus/TCP</text>
            </g>
            {/* Database / Central Portal API */}
            <g>
              <rect x="520" y="45" width="200" height="40" fill="rgba(16, 24, 48, 0.8)" stroke="rgba(255,255,255,0.1)" rx="6" />
              <text x="530" y="68" fill="var(--color-text)" fontSize="10" fontWeight="600">🗄️ Central Server API / DB</text>
              <text x="655" y="67" fill="var(--color-primary)" fontSize="8" fontWeight="bold">REST / WS</text>
            </g>
            {/* Guard Terminal Dashboard */}
            <g>
              <rect x="520" y="115" width="200" height="40" fill="rgba(16, 24, 48, 0.8)" stroke="rgba(255,255,255,0.1)" rx="6" />
              <text x="530" y="138" fill="var(--color-text)" fontSize="10" fontWeight="600">🖥️ Guard Desk Terminal</text>
              <text x="655" y="137" fill="var(--color-secondary)" fontSize="8" fontWeight="bold">HTTP Console</text>
            </g>
            {/* Connectors (Flow Paths) */}
            {/* Cam → Edge */}
            <path d="M 210 65 L 270 65" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
            <polygon points="270,65 264,62 264,68" fill="var(--color-primary)" />
            {/* Loop → PLC */}
            <path d="M 210 205 L 240 205 L 240 135 L 270 135" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" />
            <polygon points="270,135 264,132 264,138" fill="var(--color-warning)" />
            {/* Edge → API DB */}
            <path d="M 450 65 L 520 65" fill="none" stroke="var(--color-granted)" strokeWidth="1.5" />
            <polygon points="520,65 514,62 514,68" fill="var(--color-granted)" />
            {/* Edge → PLC Relay */}
            <path d="M 360 85 L 360 115" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
            <polygon points="360,115 357,109 363,109" fill="var(--color-primary)" />
            {/* API DB → Guard Terminal */}
            <path d="M 620 85 L 620 115" fill="none" stroke="var(--color-text-muted)" strokeWidth="1" strokeDasharray="3,3" />
            {/* Guard console → PLC Relay */}
            <path d="M 520 135 L 450 135" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" />
            <polygon points="450,135 456,138 456,132" fill="var(--color-secondary)" />
          </svg>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          * Click on nodes inside the field/edge blocks above to display device specifications below.
        </div>
      </div>

      {/* Component Details Card */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.03)',
        border: '1px solid rgba(56, 189, 248, 0.12)',
        borderRadius: '10px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>{activeComp.name}</h4>
        <div style={{ fontSize: '0.8rem' }}><strong style={{ color: 'var(--color-text-secondary)' }}>Specifications:</strong> {activeComp.spec}</div>
        <div style={{ fontSize: '0.8rem' }}><strong style={{ color: 'var(--color-text-secondary)' }}>Operational Role:</strong> {activeComp.purpose}</div>
        <div style={{ fontSize: '0.8rem' }}><strong style={{ color: 'var(--color-text-secondary)' }}>Signal & Communication Protocols:</strong> {activeComp.interface}</div>
      </div>

      {/* Installation Blueprint & Steps */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.25rem' }}>
          Gateway Deployment Steps
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              minWidth: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#070a13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>1</div>
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Field Wiring & Camera Calibration</h5>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Mount cameras at a height of 1.5m‑2.0m with a pitch angle of 15°‑25° relative to incoming traffic to ensure clear, reflection‑free license plate and facial capture. Trench Cat6 PoE cables back to the main switcher rack, and wire the infrared safety emitters/receivers across the driveway.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              minWidth: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#070a13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>2</div>
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Model Optimization & Edge Provisioning</h5>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Load YOLOv8‑LPR (License Plate Recognition) and ArcFace weights onto the NVIDIA Jetson Orin. Convert models to TensorRT format to run accelerated FP16 inference. Configure the edge node daemon to connect to the RTSP camera streams and initialize a WebSocket connection back to the campus control panel.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              minWidth: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#070a13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>3</div>
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Actuator Relay Integration</h5>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Connect the ADAM‑6000 relay dry‑contact outputs to the terminal block of the barrier gate actuator board (Normally Open triggers). Ensure the inductive loop sensor under the tarmac is wired to the direct manual loop input on the gate control circuit to prevent high‑priority safety overriding by software.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              minWidth: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#070a13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>4</div>
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Access Policy Validation</h5>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Input baseline user registration records through the Access Portal. Establish rules: Tier levels, permitted time blocks, and day windows. Run test passes using standard vehicles and guests to verify the automatic clearance triggers and validate the intercom override routing for manual exception cases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
