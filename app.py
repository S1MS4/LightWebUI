from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
import tinytuya
import time
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Bulb configuration
BULB_CONFIG = {
    "device_id": "bf91c81918a901700a0abp",
    "ip_address": "172.20.10.3",
    "local_key": "|jAvk.&+UKf_LW0?",
    "version": "3.3"
}

# Initialize ONCE at startup
bulb = None
connection_established = False

try:
    print(f"Connecting to bulb at {BULB_CONFIG['ip_address']}...")
    
    bulb = tinytuya.BulbDevice(
        dev_id=BULB_CONFIG["device_id"],
        address=BULB_CONFIG["ip_address"],
        local_key=BULB_CONFIG["local_key"],
        version=float(BULB_CONFIG["version"])
    )
    
    # Configure connection settings
    bulb.set_socketTimeout(5)  # 5 second timeout
    bulb.set_socketRetryLimit(1)  # Only retry once
    bulb.set_socketPersistent(True)  # Keep connection alive
    
    # Test connection
    print("Testing connection...")
    test_result = bulb.status()
    
    if test_result and 'dps' in test_result:
        connection_established = True
        print("Bulb connected and responding!")
        print(f"Available DPS keys: {list(test_result['dps'].keys())}")
        
        # Show initial status
        dps = test_result['dps']
        for key in ['20', '21', '22', '23']:
            if key in dps:
                print(f"   DPS {key}: {dps[key]}")
    else:
        print("   The bulb may be offline or incompatible")
        
except Exception as e:
    print(f"FAILED: Could not connect to bulb")
    print(f"Error: {e}")
    bulb = None

# Temperature conversion
MIN_KELVIN = 2700
MAX_KELVIN = 6500

def kelvin_to_tuya(kelvin):
    """Convert Kelvin to Tuya scale (0-1000)"""
    kelvin = max(MIN_KELVIN, min(MAX_KELVIN, kelvin))
    return int((kelvin - MIN_KELVIN) * 1000 / (MAX_KELVIN - MIN_KELVIN))

def tuya_to_kelvin(tuya_value):
    """Convert Tuya scale to Kelvin"""
    tuya_value = max(0, min(1000, tuya_value))
    return int(MIN_KELVIN + (tuya_value * (MAX_KELVIN - MIN_KELVIN) / 1000))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-state')
def get_bulb_state():
    """Get current bulb state"""
    if not connection_established or bulb is None:
        return jsonify({
            "success": False,
            "error": "Bulb not connected"
        }), 503
    
    try:
        print("Attempting to get bulb state...")
        
        # Get status with timeout
        status = bulb.status()
        
        if not status or 'dps' not in status:
            print("No DPS data in response")
            return jsonify({
                "success": False,
                "error": "No status data"
            }), 503
        
        dps = status['dps']
        print(f"Received DPS: {dps}")
        
        # Extract values with defaults
        power = dps.get('20', True)
        brightness = dps.get('22', 500)
        temperature_raw = dps.get('23', 4700)
        
        # Convert to proper types
        power = bool(power)
        brightness = int(brightness) if brightness else 500
        
        # Convert temperature
        try:
            if isinstance(temperature_raw, (int, float)):
                if temperature_raw <= 1000:
                    temperature = tuya_to_kelvin(temperature_raw)
                else:
                    temperature = int(temperature_raw)
            else:
                temperature = 4700
        except:
            temperature = 4700
        
        print(f"Parsed state - Power: {power}, Brightness: {brightness}, Temp: {temperature}K")
        
        return jsonify({
            "success": True,
            "state": {
                "power": power,
                "brightness": brightness,
                "temperature": temperature
            }
        })
        
    except Exception as e:
        print(f"Error in get_bulb_state: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@app.route('/status')
def get_status():
    """Simple status endpoint for JavaScript compatibility"""
    if not connection_established or bulb is None:
        return jsonify({
            "connected": False,
            "message": "Bulb not connected"
        })
    
    try:
        # Try to get actual status
        status = bulb.status()
        if status and 'dps' in status:
            return jsonify({
                "connected": True,
                "message": "Bulb is connected and responsive"
            })
        else:
            return jsonify({
                "connected": False,
                "message": "Bulb not responding"
            })
    except Exception as e:
        print(f"Error checking status: {e}")
        return jsonify({
            "connected": False,
            "message": f"Error: {str(e)}"
        })
    
@app.route('/power', methods=['POST'])
def toggle_power():
    """Turn bulb on/off"""
    if not connection_established or bulb is None:
        return jsonify({
            "success": False,
            "error": "Bulb not connected"
        }), 503
    
    try:
        state = request.json.get('state', True)
        
        if state:
            bulb.turn_on()
            action = "ON"
        else:
            bulb.turn_off()
            action = "OFF"
        
        print(f"Bulb turned {action}")
        return jsonify({
            "success": True,
            "state": state
        })
        
    except Exception as e:
        print(f"Error toggling power: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/brightness', methods=['POST'])
def set_brightness():
    """Set brightness"""
    if not connection_established or bulb is None:
        return jsonify({
            "success": False,
            "error": "Bulb not connected"
        }), 503
    
    try:
        brightness = request.json.get('brightness', 500)
        brightness = max(10, min(1000, brightness))
        
        bulb.set_brightness(brightness)
        print(f"Brightness set to {brightness}")
        
        return jsonify({
            "success": True,
            "brightness": brightness
        })
        
    except Exception as e:
        print(f"Error setting brightness: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/temperature', methods=['POST'])
def set_temperature():
    """Set color temperature"""
    if not connection_established or bulb is None:
        return jsonify({
            "success": False,
            "error": "Bulb not connected"
        }), 503
    
    try:
        kelvin = request.json.get('temperature', 4700)
        kelvin = max(MIN_KELVIN, min(MAX_KELVIN, kelvin))
        tuya_value = kelvin_to_tuya(kelvin)
        
        # Try set_colourtemp first (most reliable)
        bulb.set_colourtemp(tuya_value)
        
        print(f"Temperature: {kelvin}K (Tuya: {tuya_value})")
        
        return jsonify({
            "success": True,
            "temperature": kelvin,
            "tuya_value": tuya_value
        })
        
    except Exception as e:
        print(f"Error setting temperature: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/connection')
def get_connection_info():
    """Get connection status (for frontend)"""
    return jsonify({
        "connected": connection_established,
        "ip_address": BULB_CONFIG["ip_address"],
        "device_id": BULB_CONFIG["device_id"][:8] + "..."  # Partial ID for security
    })

@app.route('/restart', methods=['POST'])
def restart_connection():
    """Manually restart connection (admin only)"""
    global bulb, connection_established
    
    print("Manual reconnection requested...")
    
    try:
        # Close old connection
        bulb = None
        
        # Create new connection
        bulb = tinytuya.BulbDevice(
            dev_id=BULB_CONFIG["device_id"],
            address=BULB_CONFIG["ip_address"],
            local_key=BULB_CONFIG["local_key"],
            version=float(BULB_CONFIG["version"])
        )
        
        bulb.set_socketTimeout(5)
        test = bulb.status()
        
        if test:
            connection_established = True
            print("Reconnected successfully!")
            return jsonify({"success": True, "message": "Reconnected"})
        else:
            connection_established = False
            return jsonify({"success": False, "message": "Bulb not responding"})
            
    except Exception as e:
        connection_established = False
        print(f" Reconnection failed: {e}")
        return jsonify({"success": False, "message": str(e)})

@app.route('/debug')
def debug_info():
    """Debug info without auto-reconnecting"""
    return jsonify({
        "connection": {
            "established": connection_established,
            "bulb_exists": bulb is not None,
            "config_ip": BULB_CONFIG["ip_address"]
        },
        "temperature": {
            "min_kelvin": MIN_KELVIN,
            "max_kelvin": MAX_KELVIN,
            "example_2700k_to_tuya": kelvin_to_tuya(2700),
            "example_6500k_to_tuya": kelvin_to_tuya(6500)
        }
    })

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    print("\n Starting Flask server...")
    print(f"   Web interface: http://localhost:5000")
    print(f"   Debug info:    http://localhost:5000/debug")
    print(f"   Connection:    http://localhost:5000/connection")
    print("\n Ready to control your smart bulb!")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)  # use_reloader=False prevents double initialization