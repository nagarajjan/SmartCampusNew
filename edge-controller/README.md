# Edge AI Controller & Sensor Relay Integration Guide

This guide details the physical hardware components, structural electrical interfaces, wiring pinouts, and deployment procedures required to build the automated **Smart Campus AI Gate Security & Control Gateway**.

---

## 🏗️ System Architecture & Workflow

```
                   +----------------------------------+
                   |     IP Camera (RTSP via PoE)     |
                   +----------------------------------+
                                    |
                                    v (H.265 RTSP Video Stream)
+------------------+  Inference     +----------------------------------+
|  Central Server  |<=============>| Edge Compute Node (Jetson Orin)  |
|  (Access DB/API) |  HTTP POST/WS | Runs: yolo_inference_relay.py    |
+------------------+  (Verify)      +----------------------------------+
                                    |          |
                      Modbus/TCP    |          | GPIO (Direct 3.3V/5V Copper)
                      (Port 502)    |          |
                                    v          v
                 +--------------------+      +-------------------------+
                 | ADAM-6060 Relay    |      | Local Kiosk Panel       |
                 | (Ethernet PLC Switch) |   | - Red/Green Indicator LEDs
                 +--------------------+      | - Emergency Panic Button
                   |         |         |     +-------------------------+
                   |         |         +--------------+
                   v         v                        v
             +---------+ +-----------+          +-----------+
             | Gate    | | Alarm     |          | Warning   |
             | Actuator| | Siren/Horn|          | Strobe    |
             +---------+ +-----------+          +-----------+
```

---

## 📦 Physical Components Manifest (BOM)

To implement this platform at a physical gate, deploy the following components:

| Component Category | Device / Item Name | Specifications | Qty | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Edge Intelligence** | NVIDIA Jetson Orin Nano (8GB) | 40 TOPS AI, 1024-core Ampere GPU, Fanless Metal Case, 128GB NVMe SSD | 1 | Runs OpenCV frame grabber, YOLOv8 LPR model inference, and relays commands. |
| **Image Capture** | Hikvision DS-2CD2686G2 4K Camera | 8MP Ultra-HD, 2.8-12mm Motorized Varifocal, Low-light DarkFighter, IP67 Waterproof, PoE | 1 | Captures high-definition license plates and faces. |
| **PLC relay Switch** | Advantech ADAM-6060 | Modbus/TCP Ethernet Remote Relay I/O module, 6x Form A Relays (250V/10A) | 1 | Bridges software trigger signals to physical high-current electrical lines. |
| **Gate Barrier** | Magnetic Access Toll Barrier | Industrial gate actuator, 0.9s opening speed, 24V DC drive, 3m-4m barrier arm | 1 | Physically blocks or permits vehicle entrance/exit. |
| **Safety Sensors** | Inductive loop vehicle detector card | Single channel 12-24V DC loop detector card, fitted inside the barrier cabinet | 1 | Prevents gate closure if a vehicle is sitting over the magnetic loop. |
| **Safety Sensors** | Active Infrared Photo-eyes | Transmitter/Receiver pair, 20m range, IP55 weatherproof | 1 | Stops gate arm from lowering if a pedestrian or vehicle breaks the path beam. |
| **Alarms & Indicators** | 12V Strobe & Piezo Horn | Orange LED flashing strobe + 105dB warning sounder | 1 | Flashes/sounds during unauthorized intrusions or safety malfunctions. |
| **Kiosk Display** | 12V Panel Mount LED Indicators | 22mm Red & Green LED indicator light housings, IP65 rated | 2 | Displays visual confirmation ("Go" or "Stop") on the kiosk lane. |

---

## 🔌 Electrical Interfacing & Wiring Guides

### 1. Modbus TCP Relay Wiring (ADAM-6060 to Actuators)

The ADAM-6060 has terminals for Normally Open (NO), Normally Closed (NC), and Common (COM) contacts. Use **18 AWG 2-conductor copper wire** for these connections:

* **Gate Barrier Trigger (Momentary Pulse):**
  * Wire the **NO** contact of Relay 0 (ADAM Terminal `RL0_NO`) to the **Open Terminal** on the gate actuator control board.
  * Wire the **COM** contact of Relay 0 (ADAM Terminal `RL0_COM`) to the **Common Ground Terminal** (`GND` or `COM`) on the gate control board.
  * *Software Action:* Set Coil 0 to `True` for 1 second, then return to `False`. This imitates a physical card swipe.
* **Intrusion Alarm Siren (12V Driven):**
  * Connect the positive line of a 12V DC power supply to Relay 1 **COM** (`RL1_COM`).
  * Connect the positive line of the Siren to Relay 1 **NO** (`RL1_NO`).
  * Connect the negative line of the Siren directly back to the negative terminal of the 12V DC supply.
  * *Software Action:* Set Coil 1 to `True` to sound the alarm continuously, and `False` to turn it off.

### 2. GPIO Pinout Map (Jetson Orin Header to Sensors)

Connect the logic-level sensors directly to the Jetson Orin 40-pin header. Use **optical isolators** for outdoor sensors to prevent voltage surges from damaging the Jetson compute node.

| Jetson Pin (BOARD Number) | Signal Name | Type | Connects To | Pin State Description |
| :---: | :--- | :---: | :--- | :--- |
| **Pin 11** | `PIN_IR_SAFETY_BEAM` | INPUT | Photo-eye Receiver Relay | **HIGH** = Path clear; **LOW** = Beam broken (pedestrian/vehicle blocked). |
| **Pin 12** | `PIN_LOOP_DETECTOR` | INPUT | Inductive Loop Detector Card | **HIGH** = Vehicle sitting over loop; **LOW** = No metal detected. |
| **Pin 15** | `PIN_LOCAL_LED_RED` | OUTPUT | Red Panel indicator | **HIGH (3.3V)** = Light on; **LOW (0V)** = Light off. |
| **Pin 16** | `PIN_LOCAL_LED_GRN` | OUTPUT | Green Panel indicator | **HIGH (3.3V)** = Light on; **LOW (0V)** = Light off. |
| **Pin 18** | `PIN_PANIC_BUTTON` | INPUT | Guard Emergency Panic Button | **HIGH** = Default; **LOW** = Pressed (Normally Closed loop broken). |
| **Pin 2 (or 4)** | `5V POWER` | POWER | Kiosk panel board power | Supplies 5V DC reference power to indicator driver circuits. |
| **Pin 6** | `SYSTEM GND` | GND | Common Ground reference | Ground reference line for all GPIO circuits. |

---

## 🛠️ Step-by-Step Setup & Installation Guide

### Step 1: Trenching & Loop Induction Coil Laying
1. Cut a rectangular loop slot (`1m x 2m`, 45-degree angle cuts at corners to prevent wire stress) into the concrete pavement directly beneath the gate barrier line. Depth should be 30mm - 40mm.
2. Wind 4-5 turns of **16 AWG loop detector wire** continuously inside the slot. Twist the tails together tightly (min 20 turns per meter) as they run back to the cabinet switch.
3. Pour self-leveling loop sealant epoxy (e.g. Polyurethane Loop Sealant) over the slot and let it cure for 2 hours. Connect the tail lines to the loop detector card amplifier inputs.

### Step 2: Actuator Cabinet Integration
1. Mount the Advantech ADAM-6060 and the inductive loop detector card on a DIN-Rail inside the gate actuator terminal enclosure.
2. Hook up the ADAM-6060 to the local gate network switch using a Cat6 Ethernet cable and assign it a static IP (e.g. `192.168.12.50`).
3. Connect the loop detector output relays in series with the gate's mechanical safety loop circuit. This hardware-level backup ensures that even if software bugs fail, the gate **cannot** descend on a car blocking the loop.

### Step 3: Edge Compute Software Provisioning
1. flash the Jetson Orin Developer Kit with **JetPack 6.0 / Linux for Tegra (L4T)**.
2. Install Python system requirements:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-opencv python3-pip
   pip3 install -r requirements.txt
   ```
3. Convert your YOLOv8 classification/detection and ArcFace models to TensorRT `.engine` formats using the `trtexec` CLI on the Jetson:
   ```bash
   /usr/src/tensorrt/bin/trtexec --onnx=yolov8_lpr.onnx --saveEngine=yolov8_lpr.engine --fp16
   ```

### Step 4: Deploying and Running the Daemon
1. Adjust the configuration constants inside `edge_inference_relay.py` to match the local IP camera URL, Modbus TCP relay IP, and GPIO board choices.
2. Test the connection in diagnostic mode:
   ```bash
   python3 edge_inference_relay.py
   ```
3. Once running successfully, register the script as a systemd service to ensure it starts automatically on system reboot:
   * Create service descriptor: `/etc/systemd/system/smartcampus-edge.service`
   * Paste:
     ```ini
     [Unit]
     Description=Smart Campus Edge AI Gate Control Daemon
     After=network.target

     [Service]
     Type=simple
     User=root
     WorkingDirectory=/opt/smartcampus/edge-controller
     ExecStart=/usr/bin/python3 edge_inference_relay.py
     Restart=always
     RestartSec=5

     [Install]
     WantedBy=multi-user.target
     ```
   * Enable service:
     ```bash
     sudo systemctl daemon-reload
     sudo systemctl enable smartcampus-edge.service
     sudo systemctl start smartcampus-edge.service
     ```
