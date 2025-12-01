from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import tinytuya
import time
import json

app = Flask(__name__)
CORS(app)  # Allow frontend to connect

# Your bulb configuration - UPDATE THESE!
BULB_CONFIG = {
    "device_id": "bf91c81918a901700a0abp",
    "ip_address": "172.20.10.3",  # ← YOUR BULB'S IP HERE
    "local_key": "|jAvk.&+UKf_LW0?",
    "version": "3.3"
}

# Initialize bulb connection
try:
    bulb = tinytuya.BulbDevice(
        dev_id=BULB_CONFIG["device_id"],
        address=BULB_CONFIG["ip_address"],
        local_key=BULB_CONFIG["local_key"],
        version=BULB_CONFIG["version"]
    )
    bulb.set_socketTimeout(5)
    print(f"✅ Connected to bulb at {BULB_CONFIG['ip_address']}")
except Exception as e:
    print(f"❌ Failed to connect to bulb: {e}")
    bulb = None

@app.route('/')
def serve_frontend():
    return send_from_directory('..', 'bulb-control.html')

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('../js', filename)

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current bulb status"""
    if not bulb:
        return jsonify({"error": "Bulb not connected"}), 500
    
    try:
        data = bulb.status()
        if 'dps' in data:
            dps = data['dps']
            
            # Extract values (Tuya format)
            power = dps.get('20', False)
            brightness = dps.get('22', 0) // 10  # Convert 10-1000 to 1-100
            colortemp = dps.get('23', 0)  # 0-1000 scale
            
            # Convert Tuya colortemp (0-1000) to Kelvin (2700-6500)
            kelvin = int(2700 + (colortemp * 3.8))
            
            return jsonify({
                "success": True,
                "power": power,
                "brightness": brightness,
                "kelvin": kelvin,
                "colortemp": colortemp
            })
        return jsonify({"success": False, "error": "No status data"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/power', methods=['POST'])
def set_power():
    """Turn bulb on/off"""
    if not bulb:
        return jsonify({"error": "Bulb not connected"}), 500
    
    data = request.json
    power = data.get('power', True)
    
    try:
        if power:
            bulb.turn_on()
            return jsonify({"success": True, "message": "Bulb turned ON"})
        else:
            bulb.turn_off()
            return jsonify({"success": True, "message": "Bulb turned OFF"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/temperature', methods=['POST'])
def set_temperature():
    """Set color temperature in Kelvin (2700-6500)"""
    if not bulb:
        return jsonify({"error": "Bulb not connected"}), 500
    
    data = request.json
    kelvin = data.get('kelvin', 4500)
    
    # Convert Kelvin (2700-6500) to Tuya scale (0-1000)
    if kelvin < 2700: kelvin = 2700
    if kelvin > 6500: kelvin = 6500
    
    tuya_temp = int((kelvin - 2700) / 3.8)
    
    try:
        # Ensure bulb is on
        bulb.turn_on()
        bulb.set_colourtemp(tuya_temp)
        
        return jsonify({
            "success": True,
            "message": f"Temperature set to {kelvin}K",
            "kelvin": kelvin,
            "tuya_temp": tuya_temp
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/brightness', methods=['POST'])
def set_brightness():
    """Set brightness (1-100%)"""
    if not bulb:
        return jsonify({"error": "Bulb not connected"}), 500
    
    data = request.json
    brightness = data.get('brightness', 50)
    
    if brightness < 1: brightness = 1
    if brightness > 100: brightness = 100
    
    tuya_brightness = brightness * 10  # Convert to 10-1000 scale
    
    try:
        # Ensure bulb is on
        bulb.turn_on()
        bulb.set_brightness(tuya_brightness)
        
        return jsonify({
            "success": True,
            "message": f"Brightness set to {brightness}%",
            "brightness": brightness
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/set_all', methods=['POST'])
def set_all():
    """Set power, temperature, and brightness at once"""
    if not bulb:
        return jsonify({"error": "Bulb not connected"}), 500
    
    data = request.json
    power = data.get('power', True)
    kelvin = data.get('kelvin', 4500)
    brightness = data.get('brightness', 50)
    
    try:
        # Set power
        if power:
            bulb.turn_on()
            
            # Convert values
            tuya_temp = int((kelvin - 2700) / 3.8)
            tuya_brightness = brightness * 10
            
            # Set temperature and brightness
            bulb.set_white(tuya_brightness, tuya_temp)
        else:
            bulb.turn_off()
        
        return jsonify({
            "success": True,
            "message": f"Bulb set: {'ON' if power else 'OFF'}, {kelvin}K, {brightness}%"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/test', methods=['GET'])
def test_connection():
    """Test if bulb is reachable"""
    if not bulb:
        return jsonify({"error": "Bulb not initialized"}), 500
    
    try:
        data = bulb.status()
        return jsonify({
            "success": True,
            "connected": True,
            "device_id": BULB_CONFIG["device_id"],
            "ip": BULB_CONFIG["ip_address"]
        })
    except Exception as e:
        return jsonify({"success": False, "connected": False, "error": str(e)})

if __name__ == '__main__':
    print("=" * 60)
    print("LEDVANCE SMART+ CONTROL SERVER")
    print("=" * 60)
    print(f"Device ID: {BULB_CONFIG['device_id']}")
    print(f"IP Address: {BULB_CONFIG['ip_address']}")
    print("Server running at: http://localhost:5000")
    print("Frontend: http://localhost:5000")
    print("API Docs:")
    print("  GET  /api/status          - Get bulb status")
    print("  POST /api/power           - Turn on/off")
    print("  POST /api/temperature     - Set temperature")
    print("  POST /api/brightness      - Set brightness")
    print("  POST /api/set_all         - Set all at once")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)