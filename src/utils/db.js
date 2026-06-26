// LocalStorage persistent database engine for Smart Campus AI platform

const TABLES = {
  PROFILES: 'smartcampus_db_profiles',
  LOGS: 'smartcampus_db_logs',
  ACTIVE: 'smartcampus_db_active',
  COMPLETED: 'smartcampus_db_completed',
  DEVICES: 'smartcampus_db_devices'
};

const DEFAULT_PROFILES = [
  { id: 1, name: 'Dr. Evelyn Carter', type: 'Vehicle', value: 'SG-889-A', role: 'Faculty', tier: 'Tier 2', allowedDays: 'Weekdays', allowedTimings: '07:30 - 21:00' },
  { id: 2, name: 'Marcus Vance', type: 'Face', value: 'FACE-ID-4429', role: 'Student', tier: 'Tier 2', allowedDays: 'Weekdays', allowedTimings: '07:00 - 22:00' },
  { id: 3, name: 'Campus Security Unit 1', type: 'Vehicle', value: 'SECURE-1', role: 'Admin', tier: 'Tier 3', allowedDays: 'Everyday', allowedTimings: '24 Hours' },
  { id: 4, name: 'Interstate Delivery (DHL)', type: 'Vehicle', value: 'DHL-9921', role: 'Visitor/Guest', tier: 'Tier 1', allowedDays: 'Weekdays', allowedTimings: '09:00 - 17:00' },
  { id: 5, name: 'CleanTech Maintenance', type: 'RFID', value: 'RFID-KEY-55', role: 'Staff', tier: 'Tier 2', allowedDays: 'Everyday', allowedTimings: '06:00 - 23:00' }
];

const DEFAULT_ACTIVE = [
  { id: 101, name: 'Alice Jenkins', type: 'Human', value: 'FACE-ID-992', role: 'Faculty', tier: 'Tier 2', entryTime: '06:15' },
  { id: 102, name: 'Bob Peterson', type: 'Vehicle', value: 'SG-990-A', role: 'Student', tier: 'Tier 2', entryTime: '07:00' },
  { id: 103, name: 'Interstate Delivery (DHL)', type: 'Vehicle', value: 'DHL-9921', role: 'Visitor/Guest', tier: 'Tier 1', entryTime: '08:00' }
];

const DEFAULT_COMPLETED = [
  { id: 201, name: 'Dr. Evelyn Carter', type: 'Vehicle', value: 'SG-889-A', role: 'Faculty', tier: 'Tier 2', entryTime: '07:30', exitTime: '08:15', duration: 45 }
];

const DEFAULT_DEVICES = [
  // ── Vision ────────────────────────────────────────────────────────────────
  { id: 1, name: 'North Entry Cam', type: 'Camera', protocol: 'RTSP Stream', address: 'rtsp://192.168.12.101:554/stream1', status: 'ONLINE', details: '1080p, 15fps, YOLOv8 LPR core' },
  { id: 2, name: 'South Exit Cam', type: 'Camera', protocol: 'RTSP Stream', address: 'rtsp://192.168.12.102:554/stream1', status: 'ONLINE', details: '1080p, 15fps, Face similarity' },
  { id: 3, name: 'East Perimeter PTZ', type: 'PTZ Camera', protocol: 'ONVIF', address: 'http://192.168.12.103/onvif/device_service', status: 'ONLINE', details: 'Hikvision DS-2DE4A425IWG 4MP PTZ' },
  { id: 4, name: 'Campus NVR', type: 'NVR', protocol: 'ONVIF', address: 'http://192.168.12.200:8000', status: 'ONLINE', details: '16-ch NVR, 8TB RAID-1, H.265+' },
  // ── Gate Hardware ─────────────────────────────────────────────────────────
  { id: 5, name: 'North Barrier Gate', type: 'Actuator', protocol: 'Modbus TCP Coil', address: 'Coil Address 0', status: 'CONNECTED', details: 'ADAM-6060 Gate Actuator' },
  { id: 6, name: 'South Barrier Gate', type: 'Actuator', protocol: 'Modbus TCP Coil', address: 'Coil Address 1', status: 'CONNECTED', details: 'ADAM-6060 Gate Actuator' },
  // ── Sensors ───────────────────────────────────────────────────────────────
  { id: 7, name: 'North Loop Sensor', type: 'Sensor', protocol: 'Modbus TCP Input', address: 'Discrete Input 0', status: 'ONLINE', details: 'Vehicle ground inductive coil' },
  { id: 8, name: 'South Loop Sensor', type: 'Sensor', protocol: 'Modbus TCP Input', address: 'Discrete Input 1', status: 'ONLINE', details: 'Vehicle ground inductive coil' },
  // ── Alerts ────────────────────────────────────────────────────────────────
  { id: 9, name: 'Security Alarm Siren', type: 'Alarm', protocol: 'Modbus TCP Coil', address: 'Coil Address 2', status: 'CONNECTED', details: 'Central Security Tower strobe/horn' },
  { id: 10, name: 'System Status Strobe', type: 'Strobe', protocol: 'Modbus TCP Coil', address: 'Coil Address 3', status: 'CONNECTED', details: 'Yellow caution blinker' },
  // ── Access Control ────────────────────────────────────────────────────────
  { id: 11, name: 'North Gate RFID Reader', type: 'RFID Reader', protocol: 'Wiegand 26/34', address: 'Wiegand Port 0', status: 'ONLINE', details: 'HID iCLASS SE 125kHz/13.56MHz' },
  { id: 12, name: 'South Gate RFID Reader', type: 'RFID Reader', protocol: 'Wiegand 26/34', address: 'Wiegand Port 1', status: 'ONLINE', details: 'HID iCLASS SE 125kHz/13.56MHz' },
  { id: 13, name: 'Entry IP Intercom', type: 'Intercom', protocol: 'SIP / VoIP', address: 'sip:192.168.12.110', status: 'ONLINE', details: '2N Helios IP Force video intercom' },
  // ── WiFi & Network ────────────────────────────────────────────────────────
  { id: 14, name: 'Gate Zone WiFi AP-1', type: 'WiFi AP', protocol: 'WiFi 802.11 (SSID)', address: '192.168.12.20', status: 'ONLINE', details: 'Ubiquiti UAP-AC-Pro, SSID: CampusSec_IoT, 802.11ac Wave 2', extra: { ssid: 'CampusSec_IoT', security: 'WPA3-SAE', password: 'CampusSec_2026' } },
  { id: 15, name: 'Parking WiFi AP-2', type: 'WiFi AP', protocol: 'SNMP', address: '192.168.12.21', status: 'ONLINE', details: 'Ubiquiti UAP-AC-Mesh, SSID: CampusSec_IoT, outdoor rated', extra: { ssid: 'CampusSec_IoT', security: 'WPA2-PSK', password: 'CampusSec_2026' } },
  { id: 16, name: 'LTE Failover Router', type: 'LTE Router', protocol: 'HTTP REST', address: 'http://192.168.12.1/api', status: 'STANDBY', details: 'Teltonika RUTX11, dual-SIM 4G failover', extra: { apn: 'internet', sim_slots: '2 SIM (Dual-SIM)', password: 'admin' } },
  { id: 17, name: 'Security Core Switch', type: 'PoE Switch', protocol: 'SNMP', address: '192.168.12.2', status: 'ONLINE', details: 'Cisco SG350-28P 28-port PoE+ GbE switch', extra: { port_count: 28, snmp_community: 'public', password: 'admin' } },
  // ── Power & Infrastructure ────────────────────────────────────────────────
  { id: 18, name: 'Gate UPS Unit', type: 'UPS', protocol: 'SNMP UPS MIB', address: '192.168.12.30', status: 'ONLINE', details: 'APC Smart-UPS 1500VA, 40min runtime backup', extra: { capacity_va: 1500, runtime_min: 40 } },
  { id: 19, name: 'Edge AI Server', type: 'Edge Server', protocol: 'SSH', address: '192.168.12.50', status: 'ONLINE', details: 'NVIDIA Jetson AGX Orin, YOLOv8 + ArcFace inference node', extra: { os: 'Ubuntu 22.04', ssh_port: 22, password: 'admin' } },
];

const DEFAULT_LOGS = [
  { type: 'system', message: 'Smart Campus Security Core database engine initialized.', gate: 'System' },
  { type: 'system', message: 'Camera nodes North_Cam_01 and South_Cam_02 connected.', gate: 'System' },
  { type: 'granted', message: 'Access GRANTED for Campus Security Unit 1 (SECURE-1). Opening North Entry.', gate: 'North Entry Gate' }
];

// Read helper
const readTable = (tableName, fallback) => {
  const data = localStorage.getItem(tableName);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to parse table: ${tableName}`, e);
    }
  }
  return fallback;
};

// Write helper
const writeTable = (tableName, data) => {
  localStorage.setItem(tableName, JSON.stringify(data));
};

export const db = {
  // Read all tables
  getProfiles: () => readTable(TABLES.PROFILES, DEFAULT_PROFILES),
  getLogs: () => readTable(TABLES.LOGS, DEFAULT_LOGS),
  getActive: () => readTable(TABLES.ACTIVE, DEFAULT_ACTIVE),
  getCompleted: () => readTable(TABLES.COMPLETED, DEFAULT_COMPLETED),
  getDevices: () => readTable(TABLES.DEVICES, DEFAULT_DEVICES),

  // Save all tables
  saveProfiles: (data) => writeTable(TABLES.PROFILES, data),
  saveLogs: (data) => writeTable(TABLES.LOGS, data),
  saveActive: (data) => writeTable(TABLES.ACTIVE, data),
  saveCompleted: (data) => writeTable(TABLES.COMPLETED, data),
  saveDevices: (data) => writeTable(TABLES.DEVICES, data),

  // Seed default data
  resetDatabase: () => {
    writeTable(TABLES.PROFILES, DEFAULT_PROFILES);
    writeTable(TABLES.LOGS, DEFAULT_LOGS);
    writeTable(TABLES.ACTIVE, DEFAULT_ACTIVE);
    writeTable(TABLES.COMPLETED, DEFAULT_COMPLETED);
    writeTable(TABLES.DEVICES, DEFAULT_DEVICES);
    return {
      profiles: DEFAULT_PROFILES,
      logs: DEFAULT_LOGS,
      active: DEFAULT_ACTIVE,
      completed: DEFAULT_COMPLETED,
      devices: DEFAULT_DEVICES
    };
  },

  // Completely wipe tables
  wipeDatabase: () => {
    writeTable(TABLES.PROFILES, []);
    writeTable(TABLES.LOGS, [{ type: 'system', message: 'DATABASE PURGED: All logs and registers cleared.', gate: 'Database' }]);
    writeTable(TABLES.ACTIVE, []);
    writeTable(TABLES.COMPLETED, []);
    writeTable(TABLES.DEVICES, []);
    return {
      profiles: [],
      logs: [{ type: 'system', message: 'DATABASE PURGED: All logs and registers cleared.', gate: 'Database' }],
      active: [],
      completed: [],
      devices: []
    };
  },

  // CSV Exporter
  exportToCSV: (headers, data, filename = 'report.csv') => {
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        // Escape quotes and commas
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // JSON Exporter
  exportToJSON: (data, filename = 'report.json') => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
