// ========== STATE MANAGEMENT ==========
let bulbState = {
    power: false,
    brightness: 50,
    connected: false
};

// ========== DOM ELEMENTS ==========
const bulb = document.getElementById('bulb');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const powerOnBtn = document.getElementById('powerOnBtn');
const powerOffBtn = document.getElementById('powerOffBtn');
const statusText = document.getElementById('statusText');
const statusDisplay = document.getElementById('statusDisplay');
const currentPower = document.getElementById('currentPower');
const currentBrightness = document.getElementById('currentBrightness');

// ========== BRIGHTNESS FUNCTIONS ==========
function updateBrightnessDisplay(value) {
    brightnessSlider.value = value;
    brightnessValue.textContent = `${value}%`;
    currentBrightness.textContent = `${value}%`;
    
    // Update bulb appearance based on brightness
    updateBulbAppearance();
}

function updateBulbAppearance() {
    if (bulbState.power) {
        const brightness = bulbState.brightness;
        const intensity = brightness / 100;
        
        // Scale the brightness effect
        bulb.style.background = `radial-gradient(circle at 30% 30%,
            rgba(255, 255, 255, ${intensity}),
            rgba(200, 200, 200, ${intensity * 0.7}))`;
        
        bulb.style.boxShadow = `0 0 ${brightness}px rgba(255, 255, 255, ${intensity * 0.7})`;
        bulb.style.color = `rgba(0, 0, 0, ${intensity})`;
    } else {
        bulb.style.background = 'radial-gradient(circle at 30% 30%, #333, #111)';
        bulb.style.boxShadow = 'none';
        bulb.style.color = '#333';
    }
}

// ========== POWER CONTROL ==========
function setPower(state) {
    bulbState.power = state;

    if (state) {
        bulb.classList.add('on');
        powerOnBtn.style.opacity = '1';
        powerOffBtn.style.opacity = '0.7';
        currentPower.textContent = 'ON';
        statusDisplay.style.borderColor = '#00b09b';
        statusDisplay.style.background = 'rgba(0, 176, 155, 0.1)';
        statusText.textContent = 'Bulb is ON';
        updateBulbAppearance();
    } else {
        bulb.classList.remove('on');
        powerOnBtn.style.opacity = '0.7';
        powerOffBtn.style.opacity = '1';
        currentPower.textContent = 'OFF';
        statusDisplay.style.borderColor = '#ff416c';
        statusDisplay.style.background = 'rgba(255, 65, 108, 0.1)';
        statusText.textContent = 'Bulb is OFF';
        
        // Reset bulb appearance when off
        bulb.style.background = 'radial-gradient(circle at 30% 30%, #333, #111)';
        bulb.style.boxShadow = 'none';
        bulb.style.color = '#333';
    }
}

// ========== EVENT LISTENERS ==========
// Brightness Slider
brightnessSlider.addEventListener('input', (e) => {
    const brightness = parseInt(e.target.value);
    
    // Update UI immediately
    bulbState.brightness = brightness;
    updateBrightnessDisplay(brightness);
    updateStatus(`Brightness: ${brightness}%`);
    
    // Send to bulb if power is on
    if (bulbState.power) {
        sendBrightness(brightness);
    }
});

// Brightness Slider release for final update
brightnessSlider.addEventListener('change', (e) => {
    if (!bulbState.power) return;
    
    const brightness = parseInt(e.target.value);
    sendBrightness(brightness);
});

// Power Buttons - Immediate action
powerOnBtn.addEventListener('click', () => {
    setPower(true);
    sendPower(true);
});

powerOffBtn.addEventListener('click', () => {
    setPower(false);
    sendPower(false);
});

// Bulb click to toggle power
bulb.addEventListener('click', () => {
    const newPowerState = !bulbState.power;
    setPower(newPowerState);
    sendPower(newPowerState);
});

// ========== API FUNCTIONS ==========
async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data.success) {
            bulbState.power = data.power;
            bulbState.brightness = data.brightness;
            bulbState.connected = true;

            // Update UI
            setPower(data.power);
            updateBrightnessDisplay(data.brightness);
            updateBulbAppearance();

            updateStatus('Status synced with bulb');
        } else {
            updateStatus('Failed to fetch bulb status: ' + data.error);
            bulbState.connected = false;
        }
    } catch (error) {
        updateStatus('Error connecting to server: ' + error.message);
        bulbState.connected = false;
    }
}

async function sendPower(power) {
    try {
        const response = await fetch('/api/power', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ power: power })
        });
        const data = await response.json();

        if (data.success) {
            updateStatus(data.message);
        } else {
            updateStatus('Power control failed: ' + data.error);
            // Revert UI state on failure
            setPower(!power);
        }
    } catch (error) {
        updateStatus('Error sending power command: ' + error.message);
        // Revert UI state on error
        setPower(!power);
    }
}

async function sendBrightness(brightness) {
    try {
        const response = await fetch('/api/brightness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brightness: brightness })
        });
        const data = await response.json();

        if (data.success) {
            updateStatus(`Brightness set to ${brightness}%`);
        } else {
            updateStatus('Brightness control failed: ' + data.error);
        }
    } catch (error) {
        updateStatus('Error sending brightness command: ' + error.message);
    }
}

// ========== UTILITY FUNCTIONS ==========
function updateStatus(message) {
    statusText.textContent = message;

    // Flash animation
    statusDisplay.style.transform = 'scale(1.02)';
    setTimeout(() => {
        statusDisplay.style.transform = 'scale(1)';
    }, 200);

    // Log to console (for debugging)
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case ' ':
            e.preventDefault();
            const newPowerState = !bulbState.power;
            setPower(newPowerState);
            sendPower(newPowerState);
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (bulbState.power) {
                const newBrightness = Math.min(bulbState.brightness + 10, 100);
                bulbState.brightness = newBrightness;
                updateBrightnessDisplay(newBrightness);
                sendBrightness(newBrightness);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (bulbState.power) {
                const newBrightness = Math.max(bulbState.brightness - 10, 1);
                bulbState.brightness = newBrightness;
                updateBrightnessDisplay(newBrightness);
                sendBrightness(newBrightness);
            }
            break;
    }
});

// ========== INITIALIZATION ==========
function init() {
    // Fetch current bulb status and sync UI
    fetchStatus();
}

// Start everything
window.addEventListener('DOMContentLoaded', init);