# CORRECTED VERSION OF YOUR SCRIPT:
import tinytuya
import time

# Bulb credentials - UPDATE THE IP!
DEVICE_ID = "bf91c81918a901700a0abp"
IP_ADDRESS = "172.20.10.3"  # ← YOUR BULB'S LOCAL IP HERE!
LOCAL_KEY = "|jAvk.&+UKf_LW0?"
DEVICE_VERSION = "3.3"  # Use '3.3' for your bulb

# Initialize the device
bulb = tinytuya.BulbDevice(DEVICE_ID, IP_ADDRESS, LOCAL_KEY, version=DEVICE_VERSION)

def turn_on():
    """Turn the bulb on."""
    try:
        bulb.turn_on()
        print("✅ Bulb turned ON")
    except Exception as e:
        print(f"❌ Error: {e}")

def turn_off():
    """Turn the bulb off."""
    try:
        bulb.turn_off()
        print("✅ Bulb turned OFF")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Test it
    turn_on()
