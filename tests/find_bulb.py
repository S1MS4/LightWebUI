import socket
import subprocess
import re

def find_bulb_ip():
    """Find and return the bulb's IP address"""
    
    network_base = "172.20.10."
    
    # Method 1: Check ARP table for bulb's MAC
    result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
    bulb_mac = "50-8a-06-10-82-88".lower()
    
    for line in result.stdout.split('\n'):
        if bulb_mac in line.lower():
            ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
            if ip_match:
                return ip_match.group(1)
    
    # Method 2: Scan for Tuya devices (port 6668)
    for i in range(3, 15):
        ip = f"{network_base}{i}"
        
        if ip == "172.20.10.2":  # Skip your PC
            continue
            
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.3)
            result = sock.connect_ex((ip, 6668))
            sock.close()
            
            if result == 0:
                return ip
        except:
            pass
    
    return None

if __name__ == "__main__":
    ip = find_bulb_ip()
    
    if ip:
        print(ip)
    else:
        print("ERROR: Bulb not found on network")