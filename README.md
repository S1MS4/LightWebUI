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

## Features

- **Modern Glassmorphism UI**: Clean, dark-themed interface with glass-like cards and smooth animations
- **Real-time Controls**: Instant control over bulb power, brightness (10-1000), and color temperature (2700K-6700K)
- **Connection Management**: Automatic and manual reconnection with visual status indicators
- **Quick Presets**: One-touch presets for different lighting scenarios (Relax, Work, Focus)
- **Responsive Design**: Fully responsive layout that works on desktop and mobile devices
- **Background Sync**: Dynamic background that changes with color temperature settings

## Project Structure

```
LightWebUI/
├── app.py                 # Flask backend server
├── templates/
│   └── index.html        # Main HTML interface
├── static/
│   ├── style.css         # CSS styles with animations
│   └── script.js         # Frontend JavaScript controller
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/S1MS4/LightWebUI.git
cd LightWebUI
```

2. Install Python dependencies:
```
pip install -r requirements.txt
```

3. Configure your bulb settings in `app.py`:
```python
BULB_CONFIG = {
    "device_id": "your_device_id",
    "ip_address": "your_bulb_ip",
    "local_key": "your_local_key",
    "version": "3.3"
}
```

## Usage

1. Start the Flask server:
```
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
- Font Awesome 6.4.0 (CDN)

## API Endpoints

- `GET /` - Main web interface
- `GET /status` - Connection status check
- `GET /get-state` - Retrieve current bulb state
- `POST /power` - Toggle power on/off
- `POST /brightness` - Set brightness level
- `POST /temperature` - Set color temperature
- `GET /connection` - Connection information
- `POST /restart` - Manual reconnection
- `GET /debug` - Debug information

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available for personal and educational use.

## Troubleshooting

1. **Connection Issues**: Ensure your bulb is powered on and connected to the same network
2. **No Response**: Verify the IP address and local key in `app.py`
3. **Control Not Working**: Check if the bulb supports the Tuya protocol version 3.3
4. **Interface Not Loading**: Ensure all dependencies are installed and Flask server is running

## Contributing

Contributions are welcome. Please ensure your code follows the existing style and includes appropriate comments.
