# LightWebUI

![Python](https://img.shields.io/badge/python-3.7%2B-blue)
![Flask](https://img.shields.io/badge/flask-2.3.3-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Status](https://img.shields.io/badge/status-active-success)
![TinyTuya](https://img.shields.io/badge/tinytuya-1.11.1-orange)
![Responsive](https://img.shields.io/badge/responsive-✓-brightgreen)

A modern web-based control interface for smart light bulbs using Flask and TinyTuya.

## Overview

LightWebUI provides a sleek, responsive web interface to control Tuya-compatible smart bulbs over your local network. The interface features real-time status updates, smooth animations, and intuitive controls for power, brightness, and color temperature.

## Critical Setup Instructions

Before using this application:

1. **Ensure your computer and smart bulb are on the same Wi-Fi network.**
2. **Find your bulb’s current IP address** by running:
   ```bash
   python find_bulb.py
   ```
3. **Update the `BULB_CONFIG` block in `app.py`** with your actual:
   - `device_id`
   - `ip_address` (from step 2)
   - `local_key`
   - `version` (typically `"3.3"`)

> **Important**: The bulb is initialized **once at startup only**, exactly as shown in `app.py`. Do **not** re-initialize the bulb inside route handlers or on every request—this will break the persistent connection and cause timeouts.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/S1MS4/LightWebUI.git
   cd LightWebUI
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure your bulb settings in `app.py` as described above.

## Usage

1. Start the Flask server:
   ```bash
   python app.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. The interface will automatically attempt to connect to your smart bulb. Use the controls to:
   - Toggle power on/off
   - Adjust brightness using the slider
   - Change color temperature
   - Apply quick presets

## Dependencies

- Flask 2.3.3
- Flask-CORS 4.0.0
- TinyTuya 1.11.1
- Font Awesome 6.4.0 (loaded via CDN)

## API Endpoints

- `GET /` – Main web interface  
- `GET /status` – Connection status check  
- `GET /get-state` – Retrieve current bulb state  
- `POST /power` – Toggle power on/off  
- `POST /brightness` – Set brightness level  
- `POST /temperature` – Set color temperature  
- `GET /connection` – Connection information  
- `POST /restart` – Manual reconnection  
- `GET /debug` – Debug information  

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT license for personal and educational use.

## Troubleshooting

1. **Connection Issues**: Ensure your bulb is powered on and connected to the same network as your computer.
2. **No Response**: Double-check the IP address (use `find_bulb.py`) and verify the `local_key` in `app.py`.
3. **Control Not Working**: Confirm your bulb uses Tuya protocol version 3.3.
4. **Interface Not Loading**: Make sure all dependencies are installed and the Flask server is running without errors.

## Contributing

Contributions are welcome. Please ensure your code follows the existing style and includes appropriate comments.
