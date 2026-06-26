import React, { useState, useEffect, useRef } from 'react';
import { db } from '../utils/db';

const Section = ({ icon, title, description, children }) => (
  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{icon}</span> {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
    {hint && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{hint}</span>}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.5rem 0.75rem',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
      cursor: 'pointer',
      userSelect: 'none',
    }}
  >
    <span style={{ fontSize: '0.82rem', color: 'var(--color-text)' }}>{label}</span>
    <div style={{
      width: '36px', height: '20px',
      background: value ? 'var(--color-granted)' : 'rgba(255,255,255,0.1)',
      borderRadius: '10px',
      position: 'relative',
      transition: 'background 0.25s',
    }}>
      <div style={{
        position: 'absolute',
        top: '3px',
        left: value ? '18px' : '3px',
        width: '14px', height: '14px',
        background: '#fff',
        borderRadius: '50%',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
      }} />
    </div>
  </div>
);

const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

// ── Per-device-type schema: auto-protocol, address label & contextual extra fields ──
const DEVICE_SCHEMAS = {
  'Camera': {
    protocol: 'RTSP Stream', addressLabel: 'RTSP URL', addressPlaceholder: 'rtsp://192.168.x.x:554/stream1',
    extra: [
      { key: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p', '4MP', '8MP', '4K'] },
      { key: 'fps', label: 'Frame Rate (FPS)', type: 'number', placeholder: '15', min: 1, max: 60 },
      { key: 'ai_model', label: 'AI Detection Model', type: 'select', options: ['YOLOv8 LPR', 'YOLOv8 Face', 'YOLOv8 General', 'None'] },
      { key: 'night_vision', label: 'Night Vision / IR', type: 'select', options: ['Yes', 'No'] },
    ]
  },
  'PTZ Camera': {
    protocol: 'ONVIF', addressLabel: 'ONVIF Service URL', addressPlaceholder: 'http://192.168.x.x/onvif/device_service',
    extra: [
      { key: 'resolution', label: 'Resolution', type: 'select', options: ['1080p', '4MP', '8MP', '4K'] },
      { key: 'fps', label: 'Frame Rate (FPS)', type: 'number', placeholder: '25', min: 1, max: 60 },
      { key: 'ptz_preset_count', label: 'PTZ Presets', type: 'number', placeholder: '8', min: 0, max: 256 },
      { key: 'optical_zoom', label: 'Optical Zoom (x)', type: 'number', placeholder: '25', min: 1, max: 200 },
    ]
  },
  'Thermal Camera': {
    protocol: 'RTSP Stream', addressLabel: 'RTSP URL', addressPlaceholder: 'rtsp://192.168.x.x:554/thermal',
    extra: [
      { key: 'temp_range', label: 'Temp Range (°C)', type: 'text', placeholder: '-20 to 550' },
      { key: 'alarm_threshold', label: 'High-Temp Alarm (°C)', type: 'number', placeholder: '42', min: -20, max: 1000 },
      { key: 'resolution', label: 'Thermal Resolution', type: 'select', options: ['160x120', '320x240', '640x512'] },
    ]
  },
  'NVR': {
    protocol: 'ONVIF', addressLabel: 'NVR Web / API Endpoint', addressPlaceholder: 'http://192.168.x.x:8000',
    extra: [
      { key: 'channels', label: 'Channel Count', type: 'number', placeholder: '16', min: 1, max: 128 },
      { key: 'storage', label: 'Storage Capacity', type: 'text', placeholder: '8TB RAID-1' },
      { key: 'recording_mode', label: 'Recording Mode', type: 'select', options: ['Continuous', 'Motion-triggered', 'Schedule', 'Hybrid'] },
      { key: 'codec', label: 'Video Codec', type: 'select', options: ['H.265+', 'H.265', 'H.264+', 'H.264'] },
    ]
  },
  'Actuator': {
    protocol: 'Modbus TCP Coil', addressLabel: 'Modbus Coil Address', addressPlaceholder: 'e.g. Coil Address 0',
    extra: [
      { key: 'relay_board_ip', label: 'Relay Board IP', type: 'text', placeholder: '192.168.12.50' },
      { key: 'pulse_ms', label: 'Relay Pulse Duration (ms)', type: 'number', placeholder: '1000', min: 100, max: 5000 },
      { key: 'hold_sec', label: 'Gate Hold Open (sec)', type: 'number', placeholder: '5', min: 1, max: 60 },
      { key: 'fail_safe', label: 'Fail-Safe Mode', type: 'select', options: ['Fail-Open (NC)', 'Fail-Closed (NO)'] },
    ]
  },
  'RFID Reader': {
    protocol: 'Wiegand 26/34', addressLabel: 'Wiegand Port', addressPlaceholder: 'e.g. Wiegand Port 0',
    extra: [
      { key: 'card_format', label: 'Card Format', type: 'select', options: ['Wiegand 26', 'Wiegand 34', 'HID iCLASS', 'EM4100 125kHz', 'MIFARE 13.56MHz'] },
      { key: 'facility_code', label: 'Facility Code', type: 'number', placeholder: '101', min: 0, max: 255 },
      { key: 'read_range_cm', label: 'Read Range (cm)', type: 'number', placeholder: '10', min: 1, max: 100 },
    ]
  },
  'Biometric': {
    protocol: 'OSDP', addressLabel: 'Device IP / Endpoint', addressPlaceholder: '192.168.x.x or /dev/ttyS0',
    extra: [
      { key: 'modality', label: 'Biometric Modality', type: 'select', options: ['Face Recognition', 'Fingerprint', 'Iris Scan', 'Palm Vein', 'Multi-modal'] },
      { key: 'far_rate', label: 'FAR Setting', type: 'select', options: ['1 in 1,000', '1 in 100,000', '1 in 1,000,000'] },
      { key: 'liveness_check', label: 'Liveness Detection', type: 'select', options: ['Enabled', 'Disabled'] },
    ]
  },
  'Intercom': {
    protocol: 'HTTP REST', addressLabel: 'SIP URI / IP', addressPlaceholder: 'sip:192.168.x.x or http://192.168.x.x',
    extra: [
      { key: 'sip_server', label: 'SIP Registrar', type: 'text', placeholder: '192.168.x.x:5060' },
      { key: 'extension', label: 'Extension / ID', type: 'text', placeholder: 'e.g. 1001' },
      { key: 'video_res', label: 'Video Resolution', type: 'select', options: ['720p', '1080p', 'VGA'] },
      { key: 'door_release', label: 'Door Release via', type: 'select', options: ['DTMF Code', 'App Button', 'Guard Console'] },
    ]
  },
  'Keypad': {
    protocol: 'Wiegand 26/34', addressLabel: 'Wiegand Port', addressPlaceholder: 'e.g. Wiegand Port 2',
    extra: [
      { key: 'pin_length', label: 'PIN Length', type: 'select', options: ['4', '6', '8'] },
      { key: 'backlit', label: 'Backlight', type: 'select', options: ['Yes', 'No'] },
      { key: 'anti_tamper', label: 'Anti-Tamper', type: 'select', options: ['Enabled', 'Disabled'] },
    ]
  },
  'Sensor': {
    protocol: 'Modbus TCP Input', addressLabel: 'Discrete Input Address', addressPlaceholder: 'e.g. Discrete Input 0',
    extra: [
      { key: 'relay_board_ip', label: 'Modbus Board IP', type: 'text', placeholder: '192.168.12.50' },
      { key: 'sensitivity', label: 'Sensitivity', type: 'select', options: ['Low', 'Medium', 'High'] },
      { key: 'debounce_ms', label: 'Debounce (ms)', type: 'number', placeholder: '200', min: 10, max: 5000 },
    ]
  },
  'Motion Sensor': {
    protocol: 'MQTT', addressLabel: 'MQTT Topic / IP', addressPlaceholder: 'mqtt://broker:1883/sensor/motion/1',
    extra: [
      { key: 'detection_zone', label: 'Detection Zone', type: 'text', placeholder: 'e.g. Zone A — North Perimeter' },
      { key: 'pir_range_m', label: 'PIR Range (m)', type: 'number', placeholder: '12', min: 1, max: 50 },
      { key: 'hold_time_sec', label: 'Hold Time (sec)', type: 'number', placeholder: '30', min: 1, max: 600 },
    ]
  },
  'Door Sensor': {
    protocol: 'MQTT', addressLabel: 'MQTT Topic / IP', addressPlaceholder: 'mqtt://broker:1883/sensor/door/1',
    extra: [
      { key: 'door_label', label: 'Door / Entry Label', type: 'text', placeholder: 'e.g. Server Room Door' },
      { key: 'trigger_on', label: 'Trigger On', type: 'select', options: ['Open', 'Close', 'Both'] },
      { key: 'nc_no', label: 'Contact Type', type: 'select', options: ['NC (Normally Closed)', 'NO (Normally Open)'] },
    ]
  },
  'Smoke Detector': {
    protocol: 'MQTT', addressLabel: 'MQTT Topic / IP', addressPlaceholder: 'mqtt://broker:1883/sensor/smoke/1',
    extra: [
      { key: 'zone', label: 'Fire Zone', type: 'text', placeholder: 'e.g. Zone B — Server Room' },
      { key: 'detector_type', label: 'Detector Type', type: 'select', options: ['Photoelectric (Smoke)', 'Ionization (Smoke)', 'Heat Detector', 'Multi-sensor'] },
      { key: 'alarm_panel_zone', label: 'Fire Panel Zone #', type: 'number', placeholder: '3', min: 1, max: 128 },
    ]
  },
  'Environmental': {
    protocol: 'MQTT', addressLabel: 'MQTT Topic / IP', addressPlaceholder: 'mqtt://broker:1883/env/1',
    extra: [
      { key: 'temp_min', label: 'Min Temp Alert (°C)', type: 'number', placeholder: '10', min: -40, max: 100 },
      { key: 'temp_max', label: 'Max Temp Alert (°C)', type: 'number', placeholder: '40', min: -40, max: 100 },
      { key: 'humidity_min', label: 'Min Humidity (%)', type: 'number', placeholder: '20', min: 0, max: 100 },
      { key: 'humidity_max', label: 'Max Humidity (%)', type: 'number', placeholder: '80', min: 0, max: 100 },
    ]
  },
  'Alarm': {
    protocol: 'Modbus TCP Coil', addressLabel: 'Modbus Coil Address', addressPlaceholder: 'e.g. Coil Address 2',
    extra: [
      { key: 'relay_board_ip', label: 'Relay Board IP', type: 'text', placeholder: '192.168.12.50' },
      { key: 'duration_sec', label: 'Alarm Duration (sec)', type: 'number', placeholder: '30', min: 1, max: 3600 },
      { key: 'volume', label: 'Volume Level', type: 'select', options: ['Low', 'Medium', 'High', 'Max (120dB)'] },
      { key: 'auto_reset', label: 'Auto-Reset After', type: 'select', options: ['Never', '1 min', '5 min', '10 min', '30 min'] },
    ]
  },
  'Strobe': {
    protocol: 'Modbus TCP Coil', addressLabel: 'Modbus Coil Address', addressPlaceholder: 'e.g. Coil Address 3',
    extra: [
      { key: 'relay_board_ip', label: 'Relay Board IP', type: 'text', placeholder: '192.168.12.50' },
      { key: 'flash_pattern', label: 'Flash Pattern', type: 'select', options: ['Steady', 'Slow Flash (1Hz)', 'Fast Flash (4Hz)', 'Pulse Burst'] },
      { key: 'color', label: 'Light Color', type: 'select', options: ['Amber / Yellow', 'Red', 'Blue', 'Green', 'White'] },
    ]
  },
  'Speaker': {
    protocol: 'HTTP REST', addressLabel: 'PA System IP / API', addressPlaceholder: 'http://192.168.x.x/api/speaker',
    extra: [
      { key: 'zone', label: 'Audio Zone', type: 'text', placeholder: 'e.g. Gate Area' },
      { key: 'max_db', label: 'Max Volume (dB)', type: 'number', placeholder: '90', min: 20, max: 130 },
      { key: 'tts_enabled', label: 'Text-to-Speech', type: 'select', options: ['Enabled', 'Disabled'] },
    ]
  },
  'WiFi AP': {
    protocol: 'WiFi 802.11 (SSID)', addressLabel: 'Management IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'ssid', label: 'SSID (Network Name)', type: 'text', placeholder: 'CampusSec_IoT' },
      { key: 'band', label: 'Radio Band', type: 'select', options: ['2.4 GHz (802.11n)', '5 GHz (802.11ac)', 'Dual-Band (2.4+5 GHz)', '6 GHz (WiFi 6E)'] },
      { key: 'security', label: 'Security Mode', type: 'select', options: ['WPA2-PSK', 'WPA3-SAE', '802.1X Enterprise', 'Open (Captive Portal)'] },
      { key: 'password', label: 'SSID Passphrase / WPA Key', type: 'password', placeholder: 'e.g. WPA3 security key' },
      { key: 'channel', label: 'Channel', type: 'select', options: ['Auto', '1', '6', '11', '36', '40', '44', '48', '149', '153', '157', '161'] },
      { key: 'tx_power', label: 'Transmit Power', type: 'select', options: ['Low (10dBm)', 'Medium (17dBm)', 'High (23dBm)', 'Max (30dBm)'] },
      { key: 'controller_ip', label: 'WiFi Controller IP', type: 'text', placeholder: '192.168.x.x (leave blank if standalone)' },
    ]
  },
  'Network Switch': {
    protocol: 'SNMP', addressLabel: 'Management IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'port_count', label: 'Port Count', type: 'number', placeholder: '24', min: 4, max: 512 },
      { key: 'vlan_count', label: 'VLAN Count', type: 'number', placeholder: '8', min: 1, max: 4096 },
      { key: 'managed', label: 'Switch Type', type: 'select', options: ['Managed (L2)', 'Managed (L3)', 'Unmanaged'] },
      { key: 'snmp_community', label: 'SNMP Read Community', type: 'text', placeholder: 'public' },
      { key: 'password', label: 'SNMP Write Community / Password', type: 'password', placeholder: 'SNMP write community' },
    ]
  },
  'PoE Switch': {
    protocol: 'SNMP', addressLabel: 'Management IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'port_count', label: 'Port Count', type: 'number', placeholder: '28', min: 4, max: 512 },
      { key: 'poe_budget_w', label: 'PoE Power Budget (W)', type: 'number', placeholder: '370', min: 30, max: 4000 },
      { key: 'poe_standard', label: 'PoE Standard', type: 'select', options: ['802.3af (15.4W)', '802.3at (30W)', '802.3bt (60W)', '802.3bt+ (90W)'] },
      { key: 'snmp_community', label: 'SNMP Read Community', type: 'text', placeholder: 'public' },
      { key: 'password', label: 'SNMP Write Community / Password', type: 'password', placeholder: 'SNMP write community' },
    ]
  },
  'LTE Router': {
    protocol: 'HTTP REST', addressLabel: 'Router Management IP / API', addressPlaceholder: 'http://192.168.x.x/api',
    extra: [
      { key: 'apn', label: 'APN (Access Point Name)', type: 'text', placeholder: 'internet' },
      { key: 'sim_slots', label: 'SIM Slots', type: 'select', options: ['1 SIM', '2 SIM (Dual-SIM)'] },
      { key: 'failover_mode', label: 'Failover Mode', type: 'select', options: ['Auto (WWAN → LTE)', 'Manual', 'Priority-based'] },
      { key: 'password', label: 'Web Admin Password', type: 'password', placeholder: 'Router password' },
      { key: 'signal_min_dbm', label: 'Min Signal Threshold (dBm)', type: 'number', placeholder: '-90', min: -130, max: 0 },
    ]
  },
  'Firewall': {
    protocol: 'SSH', addressLabel: 'Firewall Management IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'wan_ip', label: 'WAN / Public IP', type: 'text', placeholder: 'x.x.x.x' },
      { key: 'ha_mode', label: 'HA Mode', type: 'select', options: ['Active-Passive', 'Active-Active', 'Standalone'] },
      { key: 'vpn_enabled', label: 'VPN Gateway', type: 'select', options: ['IPSec Enabled', 'SSL-VPN Enabled', 'Disabled'] },
      { key: 'password', label: 'Firewall Access Password / Key', type: 'password', placeholder: 'Firewall admin password' },
      { key: 'fw_version', label: 'Firmware Version', type: 'text', placeholder: 'e.g. v7.2.1' },
    ]
  },
  'UPS': {
    protocol: 'SNMP UPS MIB', addressLabel: 'Management IP / USB', addressPlaceholder: '192.168.x.x or /dev/usb0',
    extra: [
      { key: 'capacity_va', label: 'Capacity (VA)', type: 'number', placeholder: '1500', min: 300, max: 200000 },
      { key: 'runtime_min', label: 'Runtime at Full Load (min)', type: 'number', placeholder: '20', min: 1, max: 600 },
      { key: 'low_batt_pct', label: 'Low Battery Alert (%)', type: 'number', placeholder: '20', min: 5, max: 50 },
      { key: 'input_voltage', label: 'Input Voltage', type: 'select', options: ['110V / 60Hz', '220V / 50Hz', '230V / 50Hz', 'Auto-Sensing'] },
    ]
  },
  'PDU': {
    protocol: 'SNMP', addressLabel: 'PDU Management IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'outlet_count', label: 'Outlet Count', type: 'number', placeholder: '8', min: 1, max: 64 },
      { key: 'metered', label: 'Metered / Monitored', type: 'select', options: ['Metered per Outlet', 'Metered Total Only', 'Not Metered'] },
      { key: 'input_voltage', label: 'Input Voltage', type: 'select', options: ['110V', '220V', '208V 3-phase'] },
    ]
  },
  'Edge Server': {
    protocol: 'SSH', addressLabel: 'Server IP', addressPlaceholder: '192.168.x.x',
    extra: [
      { key: 'gpu_model', label: 'GPU / SoC Model', type: 'text', placeholder: 'e.g. NVIDIA Jetson AGX Orin' },
      { key: 'ssh_port', label: 'SSH Port', type: 'number', placeholder: '22', min: 1, max: 65535 },
      { key: 'password', label: 'SSH Password / Key', type: 'password', placeholder: 'SSH access password' },
      { key: 'ai_framework', label: 'AI Framework', type: 'select', options: ['TensorRT', 'ONNX Runtime', 'PyTorch', 'OpenVINO', 'TFLite'] },
      { key: 'os', label: 'Operating System', type: 'text', placeholder: 'e.g. JetPack 6.0 / Ubuntu 22.04' },
    ]
  },
  'Custom': {
    protocol: 'MQTT', addressLabel: 'Address / Endpoint / Topic', addressPlaceholder: 'e.g. mqtt://broker/topic or http://host/api',
    extra: [
      { key: 'vendor', label: 'Vendor / Manufacturer', type: 'text', placeholder: 'e.g. Bosch, Honeywell' },
      { key: 'model', label: 'Model Number', type: 'text', placeholder: 'e.g. DS-K1T671MF' },
      { key: 'firmware', label: 'Firmware Version', type: 'text', placeholder: 'e.g. v3.1.2' },
    ]
  },
};

// ── Scanned WiFi Networks (from local wireless adapter) ──
const WIFI_NETWORKS = [
  {
    ssid: 'PrathiRithi',
    bssid: 'A4:11:63:8C:2B:F0',
    signal: -52,
    band: '2.4 GHz / 5 GHz',
    security: 'WPA3-Personal',
    channel: 'Auto',
    type: 'WiFi AP',
    protocol: 'WiFi 802.11 (SSID)',
    address: '192.168.1.1',
    isConnected: true,
    details: 'Active home/campus WiFi — WPA3-Personal secured. BSSID: A4:11:63:8C:2B:F0',
  },
];

const DISCOVERED_NODES = [
  { name: 'Laptop Built-in Webcam', type: 'Camera', address: 'mediadevices://webcam/0', protocol: 'Local MediaStream', details: 'Host laptop integrated webcam — accessible via browser MediaDevices API. Supports real-time AI object/human detection.', extra: { resolution: '1080p', fps: '30', ai_model: 'YOLOv8 General' } },
  { name: 'Vision Dome Cam 104', type: 'Camera', address: 'rtsp://192.168.12.104:554/stream1', protocol: 'RTSP Stream', details: 'Unregistered Local Dome IP Camera' },
  { name: 'Discovered loop sensor C', type: 'Sensor', address: 'Discrete Input 2', protocol: 'Modbus TCP Input', details: 'Inductive coil at east gate' },
  { name: 'Visitor Lobby VoIP Intercom', type: 'Intercom', address: 'sip:192.168.12.112', protocol: 'SIP / VoIP', details: 'VoIP audio call box' },
  { name: 'Admin Block WiFi Extender', type: 'WiFi AP', address: '192.168.12.22', protocol: 'WiFi 802.11 (SSID)', details: 'SSID: CampusSec_IoT, WPA3 security', extra: { ssid: 'CampusSec_IoT', security: 'WPA3-SAE', password: 'CampusSec_2026' } },
  { name: 'Secondary Storage Switch', type: 'Network Switch', address: '192.168.12.5', protocol: 'SNMP', details: 'Ubiquiti USW-Lite-8-PoE switch', extra: { port_count: 8, managed: 'Managed (L2)', password: 'admin' } }
];

const BLANK_FORM = { name: '', type: 'Camera', protocol: 'RTSP Stream', address: '', details: '', status: 'ONLINE', extra: {} };

export default function SystemConfig({ config, onChange, onSave, onDbReset, onDbWipe, devices = [], onAddDevice, onUpdateDevice, onDeleteDevice }) {
  const [saved, setSaved] = useState(false);
  const [deviceForm, setDeviceForm] = useState(BLANK_FORM);
  const [editingDevice, setEditingDevice] = useState(null);

  // ── Network Scan & Security Credentials Challenge State ──
  const [scanState, setScanState] = useState('IDLE'); // IDLE, SCANNING, PAUSED, COMPLETED
  const [scanResults, setScanResults] = useState({}); // { [id]: 'pending' | 'scanning' | 'online' | 'secured' | 'failed' | 'denied' }
  const [currentScanIdx, setCurrentScanIdx] = useState(0);
  const [securityPromptDevice, setSecurityPromptDevice] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [scanLogs, setScanLogs] = useState([]);
  const logEndRef = useRef(null);

  // ── Subnet Discovery State variables ──
  const [auditorMode, setAuditorMode] = useState('audit'); // audit, discover
  const [discoveryState, setDiscoveryState] = useState('IDLE'); // IDLE, SCANNING, COMPLETED
  const [discoveredList, setDiscoveredList] = useState([]);
  const [wifiScanState, setWifiScanState] = useState('IDLE'); // IDLE, SCANNING, COMPLETED
  const [scannedWifiList, setScannedWifiList] = useState([]);
  const [wifiPasswordModal, setWifiPasswordModal] = useState(null); // null | wifi object
  const [wifiPasswordInput, setWifiPasswordInput] = useState('');
  const [wifiPasswordError, setWifiPasswordError] = useState('');

  const handleStartDiscovery = () => {
    setDiscoveryState('SCANNING');
    setWifiScanState('SCANNING');
    setTimeout(() => {
      setDiscoveredList(DISCOVERED_NODES);
      setDiscoveryState('COMPLETED');
    }, 1500); // 1.5 seconds mock subnet sweep
    setTimeout(() => {
      setScannedWifiList(WIFI_NETWORKS);
      setWifiScanState('COMPLETED');
    }, 900); // WiFi scan finishes a bit quicker
  };

  const handleSelectWifi = (wifi) => {
    if (wifi.security && wifi.security !== 'Open') {
      // Prompt for WiFi password
      setWifiPasswordModal(wifi);
      setWifiPasswordInput('');
      setWifiPasswordError('');
    } else {
      applyWifiToForm(wifi, '');
    }
  };

  const applyWifiToForm = (wifi, password) => {
    setDeviceForm({
      name: `WiFi AP — ${wifi.ssid}`,
      type: 'WiFi AP',
      protocol: 'WiFi 802.11 (SSID)',
      address: wifi.address || '192.168.1.1',
      details: wifi.details || `SSID: ${wifi.ssid}, ${wifi.security}`,
      status: 'ONLINE',
      extra: {
        ssid: wifi.ssid,
        band: wifi.band,
        security: wifi.security === 'WPA3-Personal' ? 'WPA3-SAE' : 'WPA2-PSK',
        channel: wifi.channel || 'Auto',
        password: password,
      }
    });
    setWifiPasswordModal(null);
    // Scroll to form
    const formElement = document.getElementById('device-form-container');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWifiPasswordSubmit = () => {
    if (!wifiPasswordInput.trim()) {
      setWifiPasswordError('Please enter the WiFi password.');
      return;
    }
    applyWifiToForm(wifiPasswordModal, wifiPasswordInput);
  };


  const handleSelectDiscovered = (node) => {
    setDeviceForm({
      name: node.name,
      type: node.type,
      protocol: node.protocol,
      address: node.address,
      details: node.details,
      status: 'ONLINE',
      extra: node.extra || {}
    });
    
    // Auto-scroll down to the registration form container
    const formElement = document.getElementById('device-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isSecuredDevice = (device) => {
    if (!device) return false;
    const securedTypes = ['WiFi AP', 'Network Switch', 'PoE Switch', 'LTE Router', 'Firewall', 'Edge Server', 'NVR', 'Biometric', 'Intercom'];
    const securedProtocols = ['SSH', 'SNMP', 'SNMP UPS MIB', 'RADIUS', 'OSDP', 'WiFi 802.11 (SSID)', 'SIP / VoIP'];
    return securedTypes.includes(device.type) || securedProtocols.includes(device.protocol);
  };

  const handleStartScan = () => {
    if (devices.length === 0) {
      alert('No devices registered in the registry. Please register devices first.');
      return;
    }
    setScanState('SCANNING');
    setCurrentScanIdx(0);
    setScanResults({});
    setScanLogs([`🚀 [SYSTEM DIALOG] Initiating system-wide hardware audit scan...`]);
  };

  const handleStopScan = () => {
    setScanState('IDLE');
    setSecurityPromptDevice(null);
    setPasswordInput('');
    setPasswordError('');
    setScanLogs(prev => [...prev, `🛑 Scan aborted by administrator.`]);
  };

  const handleClearScan = () => {
    setScanState('IDLE');
    setScanResults({});
    setCurrentScanIdx(0);
    setSecurityPromptDevice(null);
    setScanLogs([]);
  };

  // Automated Scanning Loop
  useEffect(() => {
    if (scanState !== 'SCANNING') return;
    if (devices.length === 0) {
      setScanState('COMPLETED');
      return;
    }
    if (currentScanIdx >= devices.length) {
      setScanState('COMPLETED');
      setScanLogs(prev => [...prev, `🏁 [SUCCESS] Network sweep completed. All hardware states resolved.`]);
      return;
    }

    const device = devices[currentScanIdx];
    setScanResults(prev => ({ ...prev, [device.id]: 'scanning' }));
    setScanLogs(prev => [...prev, `🔍 Probing node [${device.name}] (${device.address}) via protocol [${device.protocol}]...`]);

    const timer = setTimeout(() => {
      if (isSecuredDevice(device)) {
        setScanResults(prev => ({ ...prev, [device.id]: 'secured' }));
        setScanLogs(prev => [...prev, `🔒 [SECURE AUDIT CHALLENGE] Access restricted on [${device.name}]. Password authorization required.`]);
        setScanState('PAUSED');
        setSecurityPromptDevice(device);
        // Pre-fill saved password if it exists
        const savedPw = device.extra?.password || '';
        setPasswordInput(savedPw);
        setPasswordError('');
      } else {
        const finalStatus = (device.status || 'ONLINE').toLowerCase();
        setScanResults(prev => ({ ...prev, [device.id]: finalStatus }));
        setScanLogs(prev => [...prev, `🟢 [ONLINE] Response received from [${device.name}]. Status: ${device.status}`]);
        setCurrentScanIdx(prev => prev + 1);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [scanState, currentScanIdx, devices]);

  // Log auto-scroll
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs]);

  const handleAuthSubmit = () => {
    if (!securityPromptDevice) return;
    const input = passwordInput.trim();
    
    // Valid password rules
    const isWiFi = securityPromptDevice.type === 'WiFi AP';
    const expectedPw = isWiFi ? 'CampusSec_2026' : 'admin';
    const savedPw = (securityPromptDevice.extra?.password || '').trim();

    if (input === expectedPw || input === 'admin' || input === 'password' || (savedPw && input === savedPw)) {
      setScanResults(prev => ({ ...prev, [securityPromptDevice.id]: 'online' }));
      setScanLogs(prev => [...prev, `🔓 [GRANTED] Authenticated successfully for [${securityPromptDevice.name}]. Key matched.`]);
      setSecurityPromptDevice(null);
      setScanState('SCANNING');
      setCurrentScanIdx(prev => prev + 1);
    } else {
      setPasswordError(`Authentication failed. Invalid password credentials for ${securityPromptDevice.name}.`);
      setScanLogs(prev => [...prev, `❌ [DENIED] Authorization failed for [${securityPromptDevice.name}]. Access token mismatch.`]);
    }
  };

  const handleAuthSkip = () => {
    if (!securityPromptDevice) return;
    setScanResults(prev => ({ ...prev, [securityPromptDevice.id]: 'denied' }));
    setScanLogs(prev => [...prev, `⚠️ [BYPASS] Security verification skipped. Connection refused for [${securityPromptDevice.name}].`]);
    setSecurityPromptDevice(null);
    setScanState('SCANNING');
    setCurrentScanIdx(prev => prev + 1);
  };

  const handleDownloadScanReport = () => {
    const headers = ['ID', 'Name', 'Type', 'Protocol', 'Address', 'Configured Status', 'Audit Status', 'Details', 'Activity'];
    const data = devices.map(device => {
      const auditResult = scanResults[device.id] || 'unscanned';
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
        'Audit Status': auditResult.toUpperCase(),
        Details: device.details || '',
        Activity: activity
      };
    });
    db.exportToCSV(headers, data, 'campus_device_diagnostic_report.csv');
  };

    // Download report for all configured devices
  const handleDownloadDeviceReport = () => {
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
        Activity: activity
      };
    });
    db.exportToCSV(headers, data, 'configured_devices_report.csv');
  };
  // When device type changes: auto-suggest protocol + reset extra fields
  const handleTypeChange = (newType) => {
    const schema = DEVICE_SCHEMAS[newType] || DEVICE_SCHEMAS['Custom'];
    setDeviceForm(f => ({ ...f, type: newType, protocol: schema.protocol, extra: {} }));
  };

  const setExtra = (key, val) => setDeviceForm(f => ({ ...f, extra: { ...f.extra, [key]: val } }));

  const set = (path, value) => {
    // path is dot-separated: e.g. "thresholds.Faculty"
    const parts = path.split('.');
    const updated = JSON.parse(JSON.stringify(config)); // deep clone
    let ref = updated;
    for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
    ref[parts[parts.length - 1]] = value;
    onChange(updated);
  };

  const handleSave = () => {
    onSave(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(129,140,248,0.06))',
        border: '1px solid rgba(56,189,248,0.15)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>System Configuration</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            All configurable parameters for gate rules, AI inference, thresholds, alerts, and sensor interfaces.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', gap: '0.5rem' }}
        >
          {saved ? '✅ SAVED!' : '💾 SAVE ALL CHANGES'}
        </button>
      </div>

      {/* ── Two-column grid for sections ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>

        {/* ─── 1. OVERSTAY / DURATION THRESHOLDS ─── */}
        <Section
          icon="⏱️"
          title="Overstay Duration Thresholds"
          description="Maximum permitted campus stay per role. Exceeding this value triggers an Overstay alert in breach reports and dispatches notifications."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.keys(config.thresholds).map(role => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ minWidth: '140px', fontSize: '0.82rem', fontWeight: 600 }}>{role}</div>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="10"
                    max="2880"
                    value={config.thresholds[role]}
                    onChange={e => set(`thresholds.${role}`, Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '75px' }}>
                    = {formatDuration(Number(config.thresholds[role]))}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            💡 Values are in <strong>minutes</strong>. Example: 120 = 2 hours, 480 = 8 hours.
          </div>
        </Section>

        {/* ─── 2. GATE BEHAVIOUR ─── */}
        <Section
          icon="🚧"
          title="Gate Behaviour & Timing"
          description="Control how long gates stay open after an authorised credential is detected and the relay pulse duration for the actuator board."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Gate Open Hold Time (sec)" hint="How long the barrier stays raised after a valid credential (0.5 – 30s).">
              <input
                type="number" min="1" max="30"
                value={config.gate.holdOpenSeconds}
                onChange={e => set('gate.holdOpenSeconds', Number(e.target.value))}
              />
            </Field>
            <Field label="Relay Pulse Duration (ms)" hint="Modbus coil ON duration for momentary trigger (500 – 3000ms).">
              <input
                type="number" min="200" max="3000"
                value={config.gate.relayPulseMs}
                onChange={e => set('gate.relayPulseMs', Number(e.target.value))}
              />
            </Field>
            <Field label="Barrier Retry Attempts" hint="If gate doesn't confirm open, how many retries before alert.">
              <input
                type="number" min="0" max="5"
                value={config.gate.retryAttempts}
                onChange={e => set('gate.retryAttempts', Number(e.target.value))}
              />
            </Field>
            <Field label="Tailgating Window (sec)" hint="Time window after gate opens where a second entry triggers tailgating alert.">
              <input
                type="number" min="1" max="20"
                value={config.gate.tailgatingWindowSec}
                onChange={e => set('gate.tailgatingWindowSec', Number(e.target.value))}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Auto-close gate after hold time expires" value={config.gate.autoClose} onChange={v => set('gate.autoClose', v)} />
            <Toggle label="Safety beam overrides all software triggers" value={config.gate.safetyBeamOverride} onChange={v => set('gate.safetyBeamOverride', v)} />
            <Toggle label="Lockdown mode disables auto-open" value={config.gate.lockdownMode} onChange={v => set('gate.lockdownMode', v)} />
          </div>
        </Section>

        {/* ─── 3. AI INFERENCE PARAMETERS ─── */}
        <Section
          icon="🧠"
          title="AI Inference & Detection Parameters"
          description="Tune the computer vision models' sensitivity and scanning thresholds for license plate readers and facial recognition."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="LPR Confidence Threshold (%)" hint="Minimum confidence score to accept a plate match (50–99%).">
              <input
                type="number" min="50" max="99"
                value={config.ai.lprConfidenceThreshold}
                onChange={e => set('ai.lprConfidenceThreshold', Number(e.target.value))}
              />
            </Field>
            <Field label="Face Match Score Threshold (%)" hint="Minimum ArcFace cosine similarity to grant access (50–99%).">
              <input
                type="number" min="50" max="99"
                value={config.ai.faceMatchThreshold}
                onChange={e => set('ai.faceMatchThreshold', Number(e.target.value))}
              />
            </Field>
            <Field label="Loitering Trigger (sec)" hint="Seconds a person must dwell near the gate before a loitering alert is raised.">
              <input
                type="number" min="10" max="600"
                value={config.ai.loiteringTriggerSec}
                onChange={e => set('ai.loiteringTriggerSec', Number(e.target.value))}
              />
            </Field>
            <Field label="Object Tracking Model" hint="Deep learning backbone used for multi-object tracking.">
              <select value={config.ai.trackingModel} onChange={e => set('ai.trackingModel', e.target.value)}>
                <option value="bytetrack">ByteTrack (Default – Fast)</option>
                <option value="deepsort">DeepSORT (Accurate – Slower)</option>
                <option value="botsort">BoT-SORT (High Accuracy)</option>
              </select>
            </Field>
            <Field label="Detection Frame Rate (FPS)" hint="Frames per second submitted to the inference engine (1–30).">
              <input
                type="number" min="1" max="30"
                value={config.ai.inferenceFps}
                onChange={e => set('ai.inferenceFps', Number(e.target.value))}
              />
            </Field>
            <Field label="Inference Precision" hint="GPU tensor precision. FP16 is faster; FP32 is more accurate.">
              <select value={config.ai.precision} onChange={e => set('ai.precision', e.target.value)}>
                <option value="fp16">FP16 (Recommended for Jetson)</option>
                <option value="fp32">FP32 (Maximum Accuracy)</option>
                <option value="int8">INT8 (Fastest – Lowest Accuracy)</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Enable anomaly behaviour detection (loitering, tailgating)" value={config.ai.anomalyDetection} onChange={v => set('ai.anomalyDetection', v)} />
            <Toggle label="Use GPU-accelerated TensorRT inference engine" value={config.ai.useTensorRT} onChange={v => set('ai.useTensorRT', v)} />
            <Toggle label="Multi-camera cross-reference matching" value={config.ai.crossCameraMatch} onChange={v => set('ai.crossCameraMatch', v)} />
          </div>
        </Section>

        {/* ─── 4. ALERT & NOTIFICATION RULES ─── */}
        <Section
          icon="🔔"
          title="Alert & Notification Rules"
          description="Configure which events trigger alerts, notification channels, and the overstay escalation pipeline."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Alert on access denied (unregistered credential)" value={config.alerts.onDenied} onChange={v => set('alerts.onDenied', v)} />
            <Toggle label="Alert on threshold overstay breach" value={config.alerts.onOverstay} onChange={v => set('alerts.onOverstay', v)} />
            <Toggle label="Alert on tailgating detection" value={config.alerts.onTailgating} onChange={v => set('alerts.onTailgating', v)} />
            <Toggle label="Alert on loitering detection" value={config.alerts.onLoitering} onChange={v => set('alerts.onLoitering', v)} />
            <Toggle label="Alert on offline camera / sensor fault" value={config.alerts.onSensorFault} onChange={v => set('alerts.onSensorFault', v)} />
            <Toggle label="Activate physical siren on intrusion denial" value={config.alerts.sirenOnDenial} onChange={v => set('alerts.sirenOnDenial', v)} />
            <Toggle label="Flash strobe on anomaly events" value={config.alerts.strobeOnAnomaly} onChange={v => set('alerts.strobeOnAnomaly', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <Field label="Notification Email" hint="Alert emails are dispatched to this address.">
              <input type="email" value={config.alerts.notifyEmail} onChange={e => set('alerts.notifyEmail', e.target.value)} placeholder="security@campus.edu" />
            </Field>
            <Field label="Escalation Delay (min)" hint="Minutes after overstay before escalating to supervisor.">
              <input type="number" min="1" max="120" value={config.alerts.escalationDelayMin} onChange={e => set('alerts.escalationDelayMin', Number(e.target.value))} />
            </Field>
          </div>
        </Section>

        {/* ─── 5. CAMERA & SENSOR NETWORK ─── */}
        <Section
          icon="📡"
          title="Camera & Sensor Network Addresses"
          description="RTSP stream URLs and Modbus TCP addresses for the physical field hardware connected to this platform."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Field label="North Entry Gate — Camera RTSP URL">
              <input type="text" value={config.sensors.entryRtspUrl} onChange={e => set('sensors.entryRtspUrl', e.target.value)} />
            </Field>
            <Field label="South Exit Gate — Camera RTSP URL">
              <input type="text" value={config.sensors.exitRtspUrl} onChange={e => set('sensors.exitRtspUrl', e.target.value)} />
            </Field>
            <Field label="Modbus TCP Relay Board IP" hint="IP address of the ADAM-6060 or equivalent PLC relay module.">
              <input type="text" value={config.sensors.modbusTcpIp} onChange={e => set('sensors.modbusTcpIp', e.target.value)} />
            </Field>
            <Field label="Modbus TCP Port" hint="Default Modbus port is 502.">
              <input type="number" min="1" max="65535" value={config.sensors.modbusTcpPort} onChange={e => set('sensors.modbusTcpPort', Number(e.target.value))} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Gate Relay Coil Address" hint="Modbus coil address for barrier actuator (0-based).">
              <input type="number" min="0" max="255" value={config.sensors.gateRelayCoil} onChange={e => set('sensors.gateRelayCoil', Number(e.target.value))} />
            </Field>
            <Field label="Alarm Siren Coil Address">
              <input type="number" min="0" max="255" value={config.sensors.alarmSirenCoil} onChange={e => set('sensors.alarmSirenCoil', Number(e.target.value))} />
            </Field>
            <Field label="Strobe Warning Coil Address">
              <input type="number" min="0" max="255" value={config.sensors.strobeCoil} onChange={e => set('sensors.strobeCoil', Number(e.target.value))} />
            </Field>
            <Field label="Central API Endpoint URL" hint="Platform API for credential verification lookups.">
              <input type="text" value={config.sensors.apiEndpoint} onChange={e => set('sensors.apiEndpoint', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Fallback to local edge cache if API is offline" value={config.sensors.localCacheFallback} onChange={v => set('sensors.localCacheFallback', v)} />
            <Toggle label="Encrypt RTSP streams (SRTP)" value={config.sensors.encryptRtsp} onChange={v => set('sensors.encryptRtsp', v)} />
          </div>
        </Section>

        {/* ─── 6. CENTRAL DATABASE SERVER SETTINGS ─── */}
        <Section
          icon="🛢️"
          title="Central Database Server Connection"
          description="Configure the primary centralized relational database node for system transactions, audits, credentials, and logs synchronization."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Database Engine" hint="Underlying relational SQL server engine.">
              <select value={config.database.engine} onChange={e => set('database.engine', e.target.value)}>
                <option value="postgresql">PostgreSQL (Recommended)</option>
                <option value="mysql">MySQL Server</option>
                <option value="sqlserver">Microsoft SQL Server</option>
                <option value="sqlite">SQLite (Local Serverless)</option>
              </select>
            </Field>
            <Field label="Database Hostname / IP" hint="Domain name or IPv4 address of the host database server.">
              <input type="text" value={config.database.host} onChange={e => set('database.host', e.target.value)} />
            </Field>
            <Field label="Port Number" hint="Postgres standard is 5432, MySQL is 3306.">
              <input type="number" value={config.database.port} onChange={e => set('database.port', Number(e.target.value))} />
            </Field>
            <Field label="Database Name" hint="Target catalog name to read/write tables.">
              <input type="text" value={config.database.name} onChange={e => set('database.name', e.target.value)} />
            </Field>
            <Field label="Database Username">
              <input type="text" value={config.database.username} onChange={e => set('database.username', e.target.value)} />
            </Field>
            <Field label="Database Password">
              <input type="password" value={config.database.password} onChange={e => set('database.password', e.target.value)} />
            </Field>
            <Field label="Max Connection Pool" hint="Maximum active sockets allowed simultaneously (5-100).">
              <input type="number" min="5" max="100" value={config.database.poolSize} onChange={e => set('database.poolSize', Number(e.target.value))} />
            </Field>
            <Field label="Cloud Sync Interval (sec)" hint="Rate at which local edge logs are pushed to server.">
              <input type="number" min="5" max="300" value={config.database.syncInterval} onChange={e => set('database.syncInterval', Number(e.target.value))} />
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Enforce SSL/TLS encryption for database socket connection" value={config.database.sslEnabled} onChange={v => set('database.sslEnabled', v)} />
            <Toggle label="Auto-sync local offline caches upon network reconnection" value={config.database.autoSync} onChange={v => set('database.autoSync', v)} />
          </div>
        </Section>

        {/* ─── 6. SIMULATION CLOCK ─── */}
        <Section
          icon="🕐"
          title="Platform & Simulation Settings"
          description="General platform preferences and simulator speed controls for demo and testing."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Sim Clock Speed (seconds per 5 min)" hint="How many real seconds elapse per 5 simulated minutes (lower = faster clock).">
              <input
                type="number" min="1" max="60"
                value={config.sim.clockSpeedSec}
                onChange={e => set('sim.clockSpeedSec', Number(e.target.value))}
              />
            </Field>
            <Field label="Object Spawn Interval (frames)" hint="Frames between new vehicle/person spawns in the CV feed (lower = busier gate).">
              <input
                type="number" min="30" max="600"
                value={config.sim.spawnIntervalFrames}
                onChange={e => set('sim.spawnIntervalFrames', Number(e.target.value))}
              />
            </Field>
            <Field label="Unauthorised Spawn Rate (%)" hint="Chance each spawn is an unregistered / guest entrant (0-100).">
              <input
                type="number" min="0" max="100"
                value={config.sim.unauthorisedSpawnPct}
                onChange={e => set('sim.unauthorisedSpawnPct', Number(e.target.value))}
              />
            </Field>
            <Field label="Campus Theme" hint="Display name shown in the platform header.">
              <input
                type="text"
                value={config.sim.campusName}
                onChange={e => set('sim.campusName', e.target.value)}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Toggle label="Show hardware telemetry in gate panels" value={config.sim.showTelemetry} onChange={v => set('sim.showTelemetry', v)} />
            <Toggle label="Enable simulated anomaly events" value={config.sim.enableAnomalies} onChange={v => set('sim.enableAnomalies', v)} />
          </div>
        </Section>

        {/* ─── 7. PERSISTENT DATABASE ENGINE MANAGER ─── */}
        <Section
          icon="💾"
          title="Persistent Local Database Manager"
          description="Direct low-level controls for the local database tables including credentials profiles, security logs, completed trips, and active entrants indices."
        >
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            📊 <strong>Active Database Table Schemas:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li><code>Profiles (Access Credentials Registry)</code></li>
              <li><code>Active Entrants (Real-time Occupancy Register)</code></li>
              <li><code>Completed Trips (Historical Session Records)</code></li>
              <li><code>Security Logs (System telemetry & access alerts log)</code></li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={() => {
                if (window.confirm('Are you sure you want to seed the database? This will reset all profiles, logs, and trips back to default mock entries.')) {
                  onDbReset();
                  alert('Database seeded with standard mock entries successfully!');
                }
              }}
              style={{ flex: 1, padding: '0.65rem 1rem', background: 'rgba(56,189,248,0.12)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', justifyContent: 'center' }}
            >
              🌱 SEED MOCK DATABASE
            </button>
            <button 
              className="btn-danger" 
              onClick={() => {
                if (window.confirm('⚠️ WARNING: This will completely delete all profiles, clear real-time occupancy registers, and erase exit logs forever. Do you wish to continue?')) {
                  onDbWipe();
                  alert('Database tables completely cleared. Access rules are now empty.');
                }
              }}
              style={{ flex: 1, padding: '0.65rem 1rem', justifyContent: 'center' }}
            >
              🚨 PURGE ALL TABLES
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            🔒 Engine uses high-performance synchronous LocalStorage blocks bound to Vite hot HMR reloads.
          </div>
        </Section>
      </div>

      {/* ─── 8. HARDWARE DEVICE REGISTRY ─── */}
        <Section
          icon="📡"
          title="Hardware Device Registry"
          description="Register, configure, and manage all physical hardware: cameras, inductive loop sensors, barrier actuators, sirens, and custom IoT nodes. Changes persist to the local database."
        >
          {/* Protocol Quick Reference */}
          <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '10px', padding: '0.65rem 0.9rem', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            📌 <strong>Protocol Guide:</strong>&nbsp;
            Camera → RTSP / ONVIF &nbsp;|&nbsp;
            Sensor → Modbus TCP &nbsp;|&nbsp;
            Actuator → Modbus Coil &nbsp;|&nbsp;
            WiFi AP → SNMP / SSH &nbsp;|&nbsp;
            NVR/Switch → ONVIF / SNMP &nbsp;|&nbsp;
            IoT → MQTT / HTTP
          </div>

          {/* 🔍 Network Diagnostic Auditor & Security Scanner */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.3)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '12px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {/* Mode Toggle Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.55rem', marginBottom: '0.25rem' }}>
              <button
                onClick={() => setAuditorMode('audit')}
                style={{
                  background: auditorMode === 'audit' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: auditorMode === 'audit' ? '1px solid #38bdf8' : '1px solid transparent',
                  color: auditorMode === 'audit' ? '#38bdf8' : 'var(--color-text-secondary)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
              >
                📊 AUDIT REGISTERED DEVICES
              </button>
              <button
                onClick={() => setAuditorMode('discover')}
                style={{
                  background: auditorMode === 'discover' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: auditorMode === 'discover' ? '1px solid #38bdf8' : '1px solid transparent',
                  color: auditorMode === 'discover' ? '#38bdf8' : 'var(--color-text-secondary)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
              >
                📡 DISCOVER SUBNET HARDWARE
              </button>
            </div>

            {auditorMode === 'audit' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      🔍 Network Diagnostic & Security Auditor
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      Sweep active nodes, verify connection links, and audit access security challenges.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {scanState === 'IDLE' ? (
                      <button
                        onClick={handleStartScan}
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          padding: '0.45rem 1rem',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        🔍 START AUDIT SCAN
                      </button>
                    ) : scanState === 'SCANNING' || scanState === 'PAUSED' ? (
                      <button
                        onClick={handleStopScan}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '0.45rem 1rem',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        ⏹️ STOP AUDIT
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={handleDownloadScanReport}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10b981',
                            color: '#10b981',
                            padding: '0.45rem 1rem',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          📥 DOWNLOAD REPORT
                        </button>
                        <button
                          onClick={handleClearScan}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--color-text-secondary)',
                            padding: '0.45rem 0.8rem',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ CLEAR
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scan Progress Bar */}
                {scanState !== 'IDLE' && (
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', height: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${(currentScanIdx / devices.length) * 100}%`,
                      background: scanState === 'PAUSED' ? '#a855f7' : scanState === 'COMPLETED' ? '#10b981' : '#38bdf8',
                      height: '100%',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                )}

                {/* Scanning details / Logs container */}
                {scanState !== 'IDLE' && (
                  <div style={{ display: 'grid', gridTemplateColumns: securityPromptDevice ? '1.2fr 1fr' : '1fr', gap: '1rem', transition: 'all 0.3s' }}>
                    
                    {/* Console Logs */}
                    <div style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      height: '120px',
                      overflowY: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}>
                      {scanLogs.map((log, index) => (
                        <div key={index} style={{
                          color: log.startsWith('🟢') ? 'var(--color-granted)'
                            : log.startsWith('❌') ? 'var(--color-denied)'
                            : log.startsWith('🔒') ? '#a855f7'
                            : log.startsWith('🔓') ? 'var(--color-granted)'
                            : 'var(--color-text-secondary)',
                          lineHeight: '1.2'
                        }}>
                          {log}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>

                    {/* Password Security Challenge Form */}
                    {scanState === 'PAUSED' && securityPromptDevice && (
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.06)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          🔒 SECURE ACCESS CHALLENGE
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--color-text-secondary)', lineHeight: '1.3' }}>
                          Node <strong>{securityPromptDevice.name}</strong> ({securityPromptDevice.address}) is secured via <strong>{securityPromptDevice.protocol}</strong>. Enter access password to authorize:
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <input
                            type="password"
                            placeholder="Enter password..."
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                            style={{
                              flex: 1,
                              fontSize: '0.7rem',
                              padding: '0.35rem 0.5rem',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              borderRadius: '4px',
                              color: '#fff'
                            }}
                          />
                          <button
                            onClick={handleAuthSubmit}
                            style={{
                              background: '#a855f7',
                              color: '#fff',
                              border: 'none',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            UNLOCK
                          </button>
                          <button
                            onClick={handleAuthSkip}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--color-text-secondary)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title="Skip & Mark Access Denied"
                          >
                            SKIP
                          </button>
                        </div>
                        
                        {passwordError && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--color-denied)', fontWeight: 600 }}>
                            ⚠️ {passwordError}
                          </div>
                        )}
                        
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          💡 Hint: SSID password is <code>CampusSec_2026</code>; SSH/SNMP password is <code>admin</code>.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                      📡 Subnet Device Discovery
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      Scan local network (<code>192.168.12.0/24</code>) to discover unregistered hardware components.
                    </div>
                  </div>
                  <div>
                    {discoveryState === 'IDLE' ? (
                      <button
                        onClick={handleStartDiscovery}
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          padding: '0.45rem 1rem',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        📡 DISCOVER SUBNET
                      </button>
                    ) : discoveryState === 'SCANNING' ? (
                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold' }}>
                        ⚡ DISCOVERING...
                      </span>
                    ) : (
                      <button
                        onClick={() => { setDiscoveryState('IDLE'); setDiscoveredList([]); }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--color-text-secondary)',
                          padding: '0.45rem 1rem',
                          fontSize: '0.72rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ CLEAR DISCOVERY
                      </button>
                    )}
                  </div>
                </div>

                {discoveryState === 'SCANNING' && (
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', height: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: '60%',
                      background: '#38bdf8',
                      height: '100%',
                      borderRadius: '20px',
                      animation: 'pulse 1s infinite'
                    }} />
                  </div>
                )}

                {discoveryState === 'COMPLETED' && (
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Device Name</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Type</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>IP / Interface Address</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Protocol</th>
                          <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discoveredList.map((node, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: deviceForm.name === node.name ? 'rgba(56,189,248,0.06)' : 'transparent' }}>
                            <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>{node.name}</td>
                            <td style={{ padding: '0.5rem 0.6rem' }}>
                              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem' }}>
                                {node.type}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'var(--font-mono)' }}>{node.address}</td>
                            <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'var(--font-mono)' }}>{node.protocol}</td>
                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleSelectDiscovered(node)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: '#38bdf8',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  borderRadius: '5px',
                                  cursor: 'pointer'
                                }}
                              >
                                ➕ SELECT TO REGISTER
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── WiFi Networks Panel ── */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📶 WiFi Networks Detected
                    {wifiScanState === 'SCANNING' && (
                      <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 600 }}>⚡ scanning...</span>
                    )}
                    {wifiScanState === 'COMPLETED' && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{scannedWifiList.length} network{scannedWifiList.length !== 1 ? 's' : ''} found</span>
                    )}
                  </div>

                  {wifiScanState === 'IDLE' && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: '0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.07)', textAlign: 'center' }}>
                      Click <strong>DISCOVER SUBNET</strong> above to scan for WiFi networks.
                    </div>
                  )}

                  {wifiScanState === 'SCANNING' && (
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', height: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '50%', background: '#a78bfa', height: '100%', borderRadius: '20px', animation: 'pulse 1s infinite' }} />
                    </div>
                  )}

                  {wifiScanState === 'COMPLETED' && scannedWifiList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {scannedWifiList.map((wifi, i) => {
                        const signalPct = Math.min(100, Math.max(0, ((wifi.signal + 100) / 70) * 100));
                        const signalColor = signalPct > 70 ? '#34d399' : signalPct > 40 ? '#fbbf24' : '#f87171';
                        const bars = signalPct > 70 ? 4 : signalPct > 50 ? 3 : signalPct > 30 ? 2 : 1;
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                            padding: '0.6rem 0.8rem',
                            background: wifi.isConnected ? 'rgba(167,139,250,0.08)' : 'rgba(0,0,0,0.2)',
                            border: wifi.isConnected ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            flexWrap: 'wrap'
                          }}>
                            {/* Signal bars */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px', flexShrink: 0 }}>
                              {[1,2,3,4].map(b => (
                                <div key={b} style={{
                                  width: '4px',
                                  height: `${4 + b * 3}px`,
                                  background: b <= bars ? signalColor : 'rgba(255,255,255,0.12)',
                                  borderRadius: '1px'
                                }} />
                              ))}
                            </div>

                            {/* SSID + details */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>{wifi.ssid}</span>
                                {wifi.isConnected && (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', padding: '0.1rem 0.4rem', borderRadius: '20px' }}>
                                    ● CONNECTED
                                  </span>
                                )}
                                <span style={{ fontSize: '0.6rem', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', padding: '0.1rem 0.4rem', borderRadius: '20px' }}>
                                  🔒 {wifi.security}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                {wifi.band} · Signal: {wifi.signal} dBm · BSSID: {wifi.bssid}
                              </div>
                            </div>

                            {/* Register button */}
                            <button
                              onClick={() => handleSelectWifi(wifi)}
                              style={{
                                background: 'rgba(167,139,250,0.15)',
                                border: '1px solid rgba(167,139,250,0.35)',
                                color: '#a78bfa',
                                padding: '0.3rem 0.7rem',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ➕ REGISTER AP
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── WiFi Password Modal ── */}
                {wifiPasswordModal && (
                  <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      background: 'rgba(16,24,48,0.98)', border: '1px solid rgba(167,139,250,0.4)',
                      borderRadius: '14px', padding: '1.5rem', width: '340px', display: 'flex', flexDirection: 'column', gap: '1rem',
                      boxShadow: '0 0 40px rgba(167,139,250,0.2)'
                    }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a78bfa' }}>
                        🔒 WiFi Authentication Required
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Enter the password for <strong style={{ color: 'var(--color-text)' }}>{wifiPasswordModal.ssid}</strong> ({wifiPasswordModal.security}) to register this access point.
                      </div>
                      <input
                        type="password"
                        value={wifiPasswordInput}
                        onChange={e => { setWifiPasswordInput(e.target.value); setWifiPasswordError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleWifiPasswordSubmit()}
                        placeholder="WiFi Password / WPA Key"
                        autoFocus
                        style={{
                          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.3)',
                          borderRadius: '8px', padding: '0.6rem 0.9rem',
                          color: 'var(--color-text)', fontSize: '0.82rem', outline: 'none'
                        }}
                      />
                      {wifiPasswordError && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-denied)', fontWeight: 600 }}>
                          ⚠️ {wifiPasswordError}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setWifiPasswordModal(null); setWifiPasswordInput(''); setWifiPasswordError(''); }}
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', padding: '0.4rem 0.9rem', borderRadius: '7px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleWifiPasswordSubmit}
                          style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', padding: '0.4rem 0.9rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          🔓 AUTHENTICATE & REGISTER
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Add / Edit Device Form */}
          <div id="device-form-container" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {editingDevice !== null ? '✏️ Edit Device Configuration' : '➕ Register New Hardware Device'}
              </div>
              {deviceForm.type && DEVICE_SCHEMAS[deviceForm.type] && (
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', background: 'rgba(56,189,248,0.06)', padding: '0.2rem 0.55rem', borderRadius: '20px', border: '1px solid rgba(56,189,248,0.15)' }}>
                  📡 Auto-protocol: <strong style={{ color: 'var(--color-primary)' }}>{DEVICE_SCHEMAS[deviceForm.type].protocol}</strong>
                </div>
              )}
            </div>

            {deviceForm.name && !editingDevice && DISCOVERED_NODES.some(n => n.name === deviceForm.name) && (
              <div style={{
                fontSize: '0.72rem',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.25)',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                color: '#38bdf8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>💡 Populated fields from discovered device: <strong>{deviceForm.name}</strong></span>
                <button
                  onClick={() => setDeviceForm(BLANK_FORM)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  Clear Form
                </button>
              </div>
            )}

            {/* Row 1: Name + Type (always visible) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
              <Field label="Device Name">
                <input type="text" placeholder={DEVICE_SCHEMAS[deviceForm.type]?.addressPlaceholder ? 'e.g. East Perimeter Cam' : 'Device name'}
                  value={deviceForm.name} onChange={e => setDeviceForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Device Type">
                <select value={deviceForm.type} onChange={e => handleTypeChange(e.target.value)}>
                  <optgroup label="── Vision ──">
                    <option value="Camera">📷 IP Camera</option>
                    <option value="PTZ Camera">🎥 PTZ Camera</option>
                    <option value="Thermal Camera">🔴 Thermal Camera</option>
                    <option value="NVR">🖥️ NVR / DVR</option>
                  </optgroup>
                  <optgroup label="── Access Control ──">
                    <option value="Actuator">⚙️ Barrier / Gate Actuator</option>
                    <option value="RFID Reader">🪪 RFID / Card Reader</option>
                    <option value="Biometric">👁️ Biometric Reader</option>
                    <option value="Intercom">📞 IP Intercom / VoIP</option>
                    <option value="Keypad">🔢 Keypad / PIN Panel</option>
                  </optgroup>
                  <optgroup label="── Sensors ──">
                    <option value="Sensor">🌡️ Inductive Loop Sensor</option>
                    <option value="Motion Sensor">👤 PIR / Motion Sensor</option>
                    <option value="Door Sensor">🚪 Door / Window Contact</option>
                    <option value="Smoke Detector">🔥 Smoke / Heat Detector</option>
                    <option value="Environmental">🌬️ Env. Sensor (Temp/Humidity)</option>
                  </optgroup>
                  <optgroup label="── Alerts ──">
                    <option value="Alarm">🚨 Alarm / Siren</option>
                    <option value="Strobe">💡 Strobe / Beacon</option>
                    <option value="Speaker">📢 PA Speaker / Announcer</option>
                  </optgroup>
                  <optgroup label="── Network & WiFi ──">
                    <option value="WiFi AP">📶 WiFi Access Point</option>
                    <option value="Network Switch">🔀 Network Switch</option>
                    <option value="LTE Router">📡 LTE / 5G Router</option>
                    <option value="Firewall">🛡️ Firewall / UTM</option>
                    <option value="PoE Switch">⚡ PoE Switch</option>
                  </optgroup>
                  <optgroup label="── Power & Infrastructure ──">
                    <option value="UPS">🔋 UPS / Battery Backup</option>
                    <option value="PDU">🔌 Smart PDU</option>
                    <option value="Edge Server">🖧 Edge AI Server</option>
                  </optgroup>
                  <optgroup label="── Other ──">
                    <option value="Custom">🔧 Custom IoT Node</option>
                  </optgroup>
                </select>
              </Field>
            </div>

            {/* Row 2: Address (label changes per type) + Protocol + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
              <Field label={DEVICE_SCHEMAS[deviceForm.type]?.addressLabel || 'Address / URI / Endpoint'}>
                <input type="text"
                  placeholder={DEVICE_SCHEMAS[deviceForm.type]?.addressPlaceholder || 'Enter address...'}
                  value={deviceForm.address}
                  onChange={e => setDeviceForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
              <Field label="Communication Protocol" hint="Auto-filled when type is selected. Override if needed.">
                <select value={deviceForm.protocol} onChange={e => setDeviceForm(f => ({ ...f, protocol: e.target.value }))}>
                  <optgroup label="── Video Streaming ──">
                    <option value="RTSP Stream">RTSP Stream</option>
                    <option value="ONVIF">ONVIF (IP Camera Standard)</option>
                    <option value="WebRTC">WebRTC</option>
                    <option value="HLS / MPEG-DASH">HLS / MPEG-DASH</option>
                  </optgroup>
                  <optgroup label="── Industrial / PLC ──">
                    <option value="Modbus TCP Coil">Modbus TCP Coil</option>
                    <option value="Modbus TCP Input">Modbus TCP Input</option>
                    <option value="BACnet">BACnet IP</option>
                    <option value="RS-485 Serial">RS-485 / Modbus RTU</option>
                    <option value="Wiegand 26/34">Wiegand 26/34</option>
                    <option value="OSDP">OSDP (Open Supervised Device Protocol)</option>
                  </optgroup>
                  <optgroup label="── IoT / Messaging ──">
                    <option value="MQTT">MQTT / MQTT-S</option>
                    <option value="HTTP REST">HTTP REST / Webhook</option>
                    <option value="WebSocket">WebSocket</option>
                    <option value="CoAP">CoAP (Constrained Application Protocol)</option>
                    <option value="Zigbee">Zigbee</option>
                    <option value="Z-Wave">Z-Wave</option>
                    <option value="LoRaWAN">LoRaWAN</option>
                  </optgroup>
                  <optgroup label="── WiFi & Network Management ──">
                    <option value="WiFi 802.11 (SSID)">WiFi 802.11 (SSID Config)</option>
                    <option value="SNMP">SNMP v2c / v3</option>
                    <option value="SSH">SSH / Telnet CLI</option>
                    <option value="RADIUS">RADIUS / 802.1X Auth</option>
                    <option value="CAPWAP">CAPWAP (Wireless Controller)</option>
                    <option value="TR-069">TR-069 (CPE WAN Management)</option>
                  </optgroup>
                  <optgroup label="── Power / UPS ──">
                    <option value="SNMP UPS MIB">SNMP UPS MIB</option>
                    <option value="USB HID UPS">USB HID (UPS Local)</option>
                    <option value="Modbus RTU (UPS)">Modbus RTU (UPS)</option>
                  </optgroup>
                </select>
              </Field>
              <Field label="Status">
                <select value={deviceForm.status} onChange={e => setDeviceForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ONLINE">🟢 ONLINE</option>
                  <option value="CONNECTED">🔵 CONNECTED</option>
                  <option value="STANDBY">🟡 STANDBY</option>
                  <option value="OFFLINE">🔴 OFFLINE</option>
                  <option value="FAULT">⚠️ FAULT</option>
                </select>
              </Field>
            </div>

            {/* Row 3: Contextual extra fields for this device type */}
            {DEVICE_SCHEMAS[deviceForm.type]?.extra?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '16px', height: '1px', background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
                  {deviceForm.type} Parameters
                  <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                  {DEVICE_SCHEMAS[deviceForm.type].extra.map(field => (
                    <Field key={field.key} label={field.label}>
                      {field.type === 'select' ? (
                        <select
                          value={deviceForm.extra?.[field.key] ?? ''}
                          onChange={e => setExtra(field.key, e.target.value)}
                        >
                          <option value="">— Select —</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder || ''}
                          min={field.min}
                          max={field.max}
                          value={deviceForm.extra?.[field.key] ?? ''}
                          onChange={e => setExtra(field.key, e.target.value)}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: Description + Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>
              <Field label="Description / Model Info">
                <input type="text" placeholder="e.g. Hikvision DS-2CD2143G2-I 4MP WDR" value={deviceForm.details}
                  onChange={e => setDeviceForm(f => ({ ...f, details: e.target.value }))} />
              </Field>
              <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.05rem' }}>
                {editingDevice !== null && (
                  <button
                    onClick={() => { setEditingDevice(null); setDeviceForm(BLANK_FORM); }}
                    style={{ padding: '0.55rem 0.9rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >✕ Cancel</button>
                )}
                <button
                  className="btn-primary"
                  disabled={!deviceForm.name.trim() || !deviceForm.address.trim()}
                  style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if (editingDevice !== null) {
                      onUpdateDevice && onUpdateDevice({ ...deviceForm, id: editingDevice });
                      setEditingDevice(null);
                    } else {
                      onAddDevice && onAddDevice(deviceForm);
                    }
                    setDeviceForm(BLANK_FORM);
                  }}
                >
                  {editingDevice !== null ? '✅ SAVE CHANGES' : '➕ REGISTER DEVICE'}
                </button>
              </div>
            </div>
          </div>

          {/* Registered Devices Table */}
          {devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)' }}>
              📭 No hardware devices registered. Use the form above to add your first device.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['#', 'Name', 'Type', 'Protocol', 'Address / URI', 'Status', 'Description', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, idx) => {
                    const statusColor = device.status === 'ONLINE' ? 'var(--color-granted)'
                      : device.status === 'CONNECTED' ? '#38bdf8'
                      : device.status === 'STANDBY' ? 'var(--color-warning)'
                      : 'var(--color-denied)';
                    return (
                      <tr
                        key={device.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: editingDevice === device.id ? 'rgba(56,189,248,0.06)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'),
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.6rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '0.55rem 0.6rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{device.name}</td>
                        <td style={{ padding: '0.55rem 0.6rem' }}>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {device.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.55rem 0.6rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{device.protocol}</td>
                        <td style={{ padding: '0.55rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.address}</td>
                        <td style={{ padding: '0.55rem 0.6rem', whiteSpace: 'nowrap' }}>
                          {scanResults[device.id] ? (
                            <span style={{
                              color: scanResults[device.id] === 'scanning' ? '#38bdf8'
                                : scanResults[device.id] === 'online' ? 'var(--color-granted)'
                                : scanResults[device.id] === 'secured' ? '#a855f7'
                                : scanResults[device.id] === 'denied' ? 'var(--color-denied)'
                                : 'var(--color-text-muted)',
                              fontWeight: 700,
                              fontSize: '0.68rem'
                            }}>
                              {scanResults[device.id] === 'scanning' ? '📡 SCANNING...'
                                : scanResults[device.id] === 'online' ? '🟢 RESPONSIVE'
                                : scanResults[device.id] === 'secured' ? '🔒 SECURED'
                                : scanResults[device.id] === 'denied' ? '🔴 AUTH REFUSED'
                                : '⚪ UNRESPONSIVE'}
                            </span>
                          ) : (
                            <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.68rem' }}>{device.status}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.6rem', color: 'var(--color-text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{device.details}</td>
                        <td style={{ padding: '0.55rem 0.6rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                // Single device manual probe
                                if (isSecuredDevice(device)) {
                                  setScanResults(prev => ({ ...prev, [device.id]: 'secured' }));
                                  setScanLogs([`🔒 [SECURE AUDIT CHALLENGE] Manual probe restricted on [${device.name}]. Password required.`]);
                                  setScanState('PAUSED');
                                  setSecurityPromptDevice(device);
                                  const savedPw = device.extra?.password || '';
                                  setPasswordInput(savedPw);
                                  setPasswordError('');
                                } else {
                                  setScanResults(prev => ({ ...prev, [device.id]: 'scanning' }));
                                  setScanLogs([`🔍 Probing node [${device.name}] (${device.address}) via protocol [${device.protocol}]...`]);
                                  setTimeout(() => {
                                    const finalStatus = (device.status || 'ONLINE').toLowerCase();
                                    setScanResults(prev => ({ ...prev, [device.id]: finalStatus }));
                                    setScanLogs([`🟢 [ONLINE] Response received from [${device.name}]. Status: ${device.status}`]);
                                  }, 600);
                                }
                              }}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '5px',
                                color: '#10b981',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🔍 PROBE
                            </button>
                            <button
                              onClick={() => {
                                setEditingDevice(device.id);
                                setDeviceForm({ name: device.name, type: device.type, protocol: device.protocol, address: device.address, details: device.details || '', status: device.status, extra: device.extra || {} });
                              }}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: 'rgba(56,189,248,0.1)',
                                border: '1px solid rgba(56,189,248,0.25)',
                                borderRadius: '5px',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ✏️ EDIT
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Remove "${device.name}" from the hardware registry?`)) {
                                  onDeleteDevice && onDeleteDevice(device.id);
                                  if (editingDevice === device.id) {
                                    setEditingDevice(null);
                                    setDeviceForm({ name: '', type: 'Camera', protocol: 'RTSP Stream', address: '', details: '', status: 'ONLINE' });
                                  }
                                }
                              }}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: 'rgba(255,42,95,0.1)',
                                border: '1px solid rgba(255,42,95,0.2)',
                                borderRadius: '5px',
                                color: 'var(--color-denied)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🗑️ DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} registered in hardware registry
          </div>
        </Section>

      {/* ── Footer Save Bar ── */}
      <div style={{
        background: 'rgba(16,24,48,0.8)',
        border: '1px solid rgba(56,189,248,0.15)',
        borderRadius: '12px',
        padding: '0.9rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          🔒 Configuration changes are applied immediately and persist across sessions. Edge controller must be restarted to pick up sensor/relay address changes.
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ padding: '0.65rem 1.6rem', fontSize: '0.9rem' }}
        >
          {saved ? '✅ SAVED!' : '💾 SAVE ALL CHANGES'}
        </button>
      </div>

    </div>
  );
}
