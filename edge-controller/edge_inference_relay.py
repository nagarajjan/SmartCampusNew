#!/usr/bin/env python3
"""
Smart Campus Edge AI Controller & Sensor Relay Daemon
Author: Antigravity AI Team
Description: 
    This script runs on the Edge compute node (e.g. NVIDIA Jetson Orin). 
    It captures RTSP streams, performs object screening (Person, Vehicle, License Plate), 
    evaluates credentials, and interfaces with hardware actuators:
      - Modbus/TCP Industrial Relays (Gate Actuators, Warning Strobes)
      - GPIO Pinouts (Local Warning Sirens, Indicator LEDs)
      - Inductive Loop Detectors / IR Photo-eyes (GPIO Inputs)
"""

import os
import sys
import time
import json
import Threading
import Queue
import cv2
import requests

# Try to import Modbus client for industrial PLC relay communication
try:
    from pymodbus.client import ModbusTcpClient
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False
    print("[WARN] 'pymodbus' not installed. Running in Modbus Emulation Mode.")

# Try to import GPIO for physical board pin controllers
try:
    import Jetson.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    try:
        import RPi.GPIO as GPIO
        GPIO_AVAILABLE = True
    except ImportError:
        GPIO_AVAILABLE = False
        print("[WARN] GPIO libraries not available. Running in GPIO Emulation Mode.")


# ==========================================
# CONFIGURATION & PARAMETERS
# ==========================================
RTSP_URL = "rtsp://admin:security123@192.168.12.108:554/stream1"  # Target IP Camera
PORTAL_API_URL = "http://localhost:5173/api/verify"               # Central Database Endpoint
GATE_ID = "entry_north"

# Modbus TCP Relay Settings (e.g., Advantech ADAM-6060 module)
MODBUS_IP = "192.168.12.50"
MODBUS_PORT = 502
COIL_GATE_RELAY = 0    # Address for Gate Actuator coil (Normally Open relay)
COIL_ALARM_SIREN = 1   # Address for Security Alarm Horn/Siren coil
COIL_STROBE_LIGHT = 2  # Address for Orange Warning Strobe coil

# GPIO Pin Configuration (Board Physical Pins)
PIN_IR_SAFETY_BEAM = 11  # INPUT: Infrared beam sensor (high when clear, low when blocked)
PIN_LOOP_DETECTOR = 12   # INPUT: Ground inductive loop coil (high when vehicle present)
PIN_LOCAL_LED_RED = 15   # OUTPUT: Kiosk red access indicator
PIN_LOCAL_LED_GRN = 16   # OUTPUT: Kiosk green access indicator
PIN_PANIC_BUTTON = 18    # INPUT: Manual guard panic trigger button


# ==========================================
# HARDWARE INTERACTION CONTROLLER
# ==========================================
class HardwareController:
    def __init__(self):
        self.modbus_client = None
        self.init_modbus()
        self.init_gpio()

    def init_modbus(self):
        if MODBUS_AVAILABLE:
            try:
                print(f"[INFO] Connecting to Modbus TCP Relay Board at {MODBUS_IP}:{MODBUS_PORT}...")
                self.modbus_client = ModbusTcpClient(MODBUS_IP, port=MODBUS_PORT)
                self.modbus_client.connect()
                print("[INFO] Modbus TCP Connection Established.")
            except Exception as e:
                print(f"[ERROR] Failed to connect to Modbus TCP Relays: {e}. Using Emulation.")
                self.modbus_client = None

    def init_gpio(self):
        if GPIO_AVAILABLE:
            GPIO.setmode(GPIO.BOARD)
            # Setup inputs with pull-up/pull-down resistors
            GPIO.setup(PIN_IR_SAFETY_BEAM, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.setup(PIN_LOOP_DETECTOR, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
            GPIO.setup(PIN_PANIC_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            
            # Setup outputs
            GPIO.setup(PIN_LOCAL_LED_RED, GPIO.OUT, initial=GPIO.LOW)
            GPIO.setup(PIN_LOCAL_LED_GRN, GPIO.OUT, initial=GPIO.LOW)
            print("[INFO] GPIO Pins Configured Successfully.")
        else:
            print("[INFO] GPIO Emulation Initialized.")

    def trigger_gate_relay(self):
        print("[ACTUATOR] Sending GATE_OPEN trigger command.")
        if self.modbus_client:
            try:
                # Momentary relay closure (pulse for 1.2 seconds)
                self.modbus_client.write_coil(COIL_GATE_RELAY, True)
                time.sleep(1.2)
                self.modbus_client.write_coil(COIL_GATE_RELAY, False)
                print("[ACTUATOR] Gate opening trigger complete.")
            except Exception as e:
                print(f"[ERROR] Modbus failed to trigger gate relay: {e}")
        else:
            print("[EMULATOR] [RELAY] Coil 0 (Gate) written to HIGH for 1.2s, then returned to LOW.")

        # Light up Local Green LED Kiosk display
        self.set_local_indicator("GREEN", duration=3.0)

    def trigger_siren_alarm(self, status=True):
        print(f"[ACTUATOR] SIREN_ALARM status set to {status}.")
        if self.modbus_client:
            try:
                self.modbus_client.write_coil(COIL_ALARM_SIREN, status)
            except Exception as e:
                print(f"[ERROR] Modbus failed to set siren relay: {e}")
        else:
            print(f"[EMULATOR] [RELAY] Coil 1 (Alarm Horn) set to {status}")

    def trigger_strobe_warning(self, status=True):
        print(f"[ACTUATOR] WARNING_STROBE status set to {status}.")
        if self.modbus_client:
            try:
                self.modbus_client.write_coil(COIL_STROBE_LIGHT, status)
            except Exception as e:
                print(f"[ERROR] Modbus failed to set strobe relay: {e}")
        else:
            print(f"[EMULATOR] [RELAY] Coil 2 (Strobe Warning) set to {status}")

    def set_local_indicator(self, color, duration=1.0):
        def blink_thread():
            if GPIO_AVAILABLE:
                if color == "GREEN":
                    GPIO.output(PIN_LOCAL_LED_GRN, GPIO.HIGH)
                    time.sleep(duration)
                    GPIO.output(PIN_LOCAL_LED_GRN, GPIO.LOW)
                elif color == "RED":
                    GPIO.output(PIN_LOCAL_LED_RED, GPIO.HIGH)
                    time.sleep(duration)
                    GPIO.output(PIN_LOCAL_LED_RED, GPIO.LOW)
            else:
                print(f"[EMULATOR] [GPIO] Pin LED_{color} written to HIGH for {duration} seconds.")
        
        threading.Thread(target=blink_thread, daemon=True).start()

    def check_safety_loop(self):
        """Returns True if vehicle or object is present, blocking the path"""
        if GPIO_AVAILABLE:
            # IR Beam is low when blocked (normally open circuit broken)
            ir_blocked = (GPIO.input(PIN_IR_SAFETY_BEAM) == GPIO.LOW)
            # Inductive Loop is high when vehicle sits over it
            loop_active = (GPIO.input(PIN_LOOP_DETECTOR) == GPIO.HIGH)
            return ir_blocked or loop_active
        else:
            # Emulated check (always clear for demo unless overridden)
            return False

    def close(self):
        if self.modbus_client:
            self.modbus_client.close()
        if GPIO_AVAILABLE:
            GPIO.cleanup()


# ==========================================
# RTSP STREAM & AI COMPUTER VISION INFERENCE
# ==========================================
class EdgeAIScreeningNode:
    def __init__(self, rtsp_src, hw_controller):
        self.rtsp_src = rtsp_src
        self.hw = hw_controller
        self.frame_queue = queue.Queue(maxsize=5)
        self.is_running = True
        
        # Thread for capturing frame buffers asynchronously
        self.capture_thread = threading.Thread(target=self._capture_frames, daemon=True)
        # Thread for processing frame buffers
        self.process_thread = threading.Thread(target=self._process_pipeline, daemon=True)

    def start(self):
        self.capture_thread.start()
        self.process_thread.start()
        print("[INFO] Edge Video Capture & Processing threads launched.")

    def _capture_frames(self):
        print(f"[INFO] Connecting to RTSP Camera Stream: {self.rtsp_src}...")
        cap = cv2.VideoCapture(self.rtsp_src)
        
        # Fallback to webcam if RTSP is offline for testing purposes
        if not cap.isOpened():
            print("[WARN] RTSP camera offline. Falling back to local camera feed / static frame simulator.")
            cap = cv2.VideoCapture(0)

        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Camera stream read failure. Reconnecting...")
                time.sleep(2)
                cap = cv2.VideoCapture(self.rtsp_src)
                continue

            # Maintain frame buffer fresh (drop old frames)
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            self.frame_queue.put(frame)
            time.sleep(0.03) # Rate limit capture to ~30 FPS

        cap.release()

    def _process_pipeline(self):
        print("[INFO] AI Computer Vision Inference Loop active.")
        
        while self.is_running:
            try:
                frame = self.frame_queue.get(timeout=2)
            except queue.Empty:
                continue

            # --- STEP 1: OBJECT DETECTOR (YOLOv8 Simulation Hook) ---
            # Under actual deployment, you would execute:
            # results = yolo_model.predict(frame, conf=0.5)
            # boxes = results[0].boxes
            
            detected_type, credential_value = self._simulate_cv_detection(frame)

            if detected_type is None:
                continue

            print(f"\n[AI DETECT] Identified {detected_type} with identifier: {credential_value}")

            # Check safety loop before acting
            if self.hw.check_safety_loop():
                print("[WARN] Safety loop triggered! Actuator blocked. Deferring gate actions.")
                self.hw.set_local_indicator("RED", duration=1.0)
                self.hw.trigger_strobe_warning(True)
                continue
            else:
                self.hw.trigger_strobe_warning(False)

            # --- STEP 2: ACCESS CRITERIA EVALUATION ---
            access_granted, reason = self._check_access_permissions(detected_type, credential_value)

            if access_granted:
                print(f"[ACCESS] GRANTED: {reason}. Activating Gate Relays.")
                # Turn off warning siren if active
                self.hw.trigger_siren_alarm(False)
                # Open gate
                self.hw.trigger_gate_relay()
            else:
                print(f"[ACCESS] DENIED: {reason}. Alerting Operator.")
                self.hw.set_local_indicator("RED", duration=4.0)
                # Sound brief siren (0.5s) to alert driver to pull over to manual lane
                self.hw.trigger_siren_alarm(True)
                time.sleep(0.5)
                self.hw.trigger_siren_alarm(False)

            # Prevent immediate re-triggering for the same object
            time.sleep(3.0)

    def _simulate_cv_detection(self, frame):
        """
        Simulates standard Yolov8 + Plate Recognizer detections.
        In production, this runs actual AI model inference.
        """
        # For simulation purposes, periodically output a mock vehicle plate or face
        epoch = time.time()
        if int(epoch) % 15 == 0:
            # Trigger registered vehicle
            return "Vehicle", "SG-889-A"
        elif int(epoch) % 15 == 5:
            # Trigger unregistered guest vehicle
            return "Vehicle", f"TEMP-{int(epoch)%1000:03d}"
        elif int(epoch) % 15 == 10:
            # Trigger registered student face
            return "Face", "FACE-ID-4429"
        
        return None, None

    def _check_access_permissions(self, ident_type, ident_val):
        """
        Queries the central SmartCampus API portal database.
        If offline, falls back to local cache definitions.
        """
        payload = {"gate_id": GATE_ID, "type": ident_type, "value": ident_val}
        
        try:
            r = requests.post(PORTAL_API_URL, json=payload, timeout=2.0)
            if r.status_code == 200:
                res = r.json()
                return res.get("granted", False), res.get("reason", "API Verified")
        except Exception as e:
            print(f"[WARN] Central API offline: {e}. Falling back to local edge rules cache.")

        # Local hardcoded cache check (fallback)
        local_cache = {
            "SG-889-A": {"granted": True, "name": "Dr. Evelyn Carter"},
            "FACE-ID-4429": {"granted": True, "name": "Marcus Vance"},
            "SECURE-1": {"granted": True, "name": "Security-01"}
        }

        if ident_val in local_cache:
            return True, f"Local Cache Match: {local_cache[ident_val]['name']}"
        
        return False, "Unrecognized credential (Edge Cache)"

    def stop(self):
        self.is_running = False
        print("[INFO] Stopping Edge screening node...")


# ==========================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================
if __name__ == "__main__":
    print("==================================================")
    print("  Smart Campus Edge AI & Relay Controller Active  ")
    print("==================================================")

    # Initialize physical / emulated hardware controller
    hw = HardwareController()

    # Initialize video capture stream and processing loops
    node = EdgeAIScreeningNode(RTSP_URL, hw)
    node.start()

    try:
        # Keep main thread alive listening to keyboard exit or physical panic button
        while True:
            # Check physical guard panic button if GPIO is wired
            if GPIO_AVAILABLE:
                if GPIO.input(PIN_PANIC_BUTTON) == GPIO.LOW: # Ground low indicates pressed
                    print("[PANIC] Security Guard pressed Emergency Panic button! Initiating Lock Down.")
                    hw.trigger_siren_alarm(True)
                    hw.trigger_strobe_warning(True)
                    hw.set_local_indicator("RED", duration=5.0)
                    time.sleep(5)
            
            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n[INFO] Termination request received. Shutting down...")
    
    finally:
        node.stop()
        hw.close()
        print("[INFO] Edge hardware interfaces closed. System halt.")
        sys.exit(0)
