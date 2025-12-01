// ========== STATE MANAGEMENT ==========
let bulbState = {
    power: false,
    kelvin: 4500,
    brightness: 50,
    connected: false
};

// Animation state
let animationState = {
    targetKelvin: 4500,
    currentKelvin: 4500,
    targetBrightness: 50,
    currentBrightness: 50,
    animationSpeed: 0.1, // Lower = slower transition (0.05 = very slow, 0.3 = faster)
    isAnimating: false,
    animationFrameId: null
};

// Queues for batched updates
let kelvinQueue = [];
let brightnessQueue = [];

// Interval timers
let kelvinInterval = null;
let brightnessInterval = null;

// Interval frequency in milliseconds
const UPDATE_INTERVAL = 300; // Increased for slower updates
const MIN_KELVIN_DIFF = 50;
const MIN_BRIGHTNESS_DIFF = 5;

// Last successfully sent values
let lastSentKelvin = 4500;
let lastSentBrightness = 50;

// ========== DOM ELEMENTS ==========
const bulb = document.getElementById('bulb');
const container = document.querySelector('.container');
const kelvinSlider = document.getElementById('kelvinSlider');
const kelvinValue = document.getElementById('kelvinValue');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const powerOnBtn = document.getElementById('powerOnBtn');
const powerOffBtn = document.getElementById('powerOffBtn');
const statusText = document.getElementById('statusText');
const statusDisplay = document.getElementById('statusDisplay');
const currentPower = document.getElementById('currentPower');
const currentTemp = document.getElementById('currentTemp');
const currentBrightness = document.getElementById('currentBrightness');
const tempPresets = document.querySelectorAll('.temp-preset');

// ========== COLOR TEMPERATURE FUNCTIONS ==========
function kelvinToRGB(kelvin) {
    // Convert Kelvin to RGB (simplified approximation)
    let temperature = kelvin / 100;
    let red, green, blue;

    if (temperature <= 66) {
        red = 255;
        green = temperature;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;
        if (temperature <= 19) {
            blue = 0;
        } else {
            blue = temperature - 10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
        }
    } else {
        red = temperature - 60;
        red = 329.698727446 * Math.pow(red, -0.1332047592);
        green = temperature - 60;
        green = 288.1221695283 * Math.pow(green, -0.0755148492);
        blue = 255;
    }

    // Clamp values
    red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    blue = Math.min(255, Math.max(0, blue));

    return {
        r: Math.round(red),
        g: Math.round(green),
        b: Math.round(blue)
    };
}

function updateBulbColor() {
    if (!bulbState.power) return;

    const rgb = kelvinToRGB(animationState.currentKelvin);
    const brightnessFactor = animationState.currentBrightness / 100;

    // Adjust RGB based on brightness
    const adjustedR = Math.round(rgb.r * brightnessFactor);
    const adjustedG = Math.round(rgb.g * brightnessFactor);
    const adjustedB = Math.round(rgb.b * brightnessFactor);

    // Update bulb appearance
    bulb.style.background = `radial-gradient(circle at 30% 30%,
        rgb(${adjustedR}, ${adjustedG}, ${adjustedB}),
        rgb(${Math.round(adjustedR * 0.7)}, ${Math.round(adjustedG * 0.7)}, ${Math.round(adjustedB * 0.7)}))`;

    // Update bulb glow
    bulb.style.boxShadow = `0 0 ${animationState.currentBrightness}px rgba(${adjustedR}, ${adjustedG}, ${adjustedB}, 0.7)`;

    // Update temperature display color
    const hue = Math.round(30 - ((animationState.currentKelvin - 2700) / 3800) * 30);
    kelvinValue.style.background = `linear-gradient(90deg,
        hsl(${hue}, 100%, 50%),
        hsl(${hue}, 100%, 60%))`;
    kelvinValue.style.webkitBackgroundClip = 'text';
    kelvinValue.style.backgroundClip = 'text';
}

function updateKelvinDisplay(kelvin) {
    kelvinSlider.value = kelvin;
    kelvinValue.textContent = `${kelvin}K`;
    currentTemp.textContent = `${kelvin}K`;

    // Update active preset
    tempPresets.forEach(preset => {
        const presetKelvin = parseInt(preset.dataset.kelvin);
        if (Math.abs(presetKelvin - kelvin) <= 200) {
            preset.classList.add('active');
        } else {
            preset.classList.remove('active');
        }
    });

    // Update container border with fade effect based on temperature
    const rgb = kelvinToRGB(kelvin);
    container.style.boxShadow = `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
}

function updateBrightnessDisplay(value) {
    brightnessSlider.value = value;
    brightnessValue.textContent = `${value}%`;
    currentBrightness.textContent = `${value}%`;
}

// ========== ANIMATION FUNCTIONS ==========
function startAnimation() {
    if (animationState.isAnimating) return;
    
    animationState.isAnimating = true;
    animateStep();
}

function animateStep() {
    // Check if we need to animate kelvin
    const kelvinDiff = Math.abs(animationState.targetKelvin - animationState.currentKelvin);
    const brightnessDiff = Math.abs(animationState.targetBrightness - animationState.currentBrightness);
    
    // Smooth interpolation for kelvin
    if (kelvinDiff > 0.5) {
        animationState.currentKelvin += (animationState.targetKelvin - animationState.currentKelvin) * animationState.animationSpeed;
        bulbState.kelvin = Math.round(animationState.currentKelvin);
        updateKelvinDisplay(Math.round(animationState.currentKelvin));
        updateBulbColor();
    }
    
    // Smooth interpolation for brightness
    if (brightnessDiff > 0.5) {
        animationState.currentBrightness += (animationState.targetBrightness - animationState.currentBrightness) * animationState.animationSpeed;
        bulbState.brightness = Math.round(animationState.currentBrightness);
        updateBrightnessDisplay(Math.round(animationState.currentBrightness));
        updateBulbColor();
    }
    
    // Continue animation if we still have changes to make
    if (kelvinDiff > 0.5 || brightnessDiff > 0.5) {
        animationState.animationFrameId = requestAnimationFrame(animateStep);
    } else {
        // Animation complete
        animationState.isAnimating = false;
        animationState.animationFrameId = null;
    }
}

function stopAnimation() {
    if (animationState.animationFrameId) {
        cancelAnimationFrame(animationState.animationFrameId);
        animationState.animationFrameId = null;
    }
    animationState.isAnimating = false;
}

function setTargetKelvin(kelvin, immediate = false) {
    animationState.targetKelvin = kelvin;
    
    if (immediate) {
        animationState.currentKelvin = kelvin;
        bulbState.kelvin = kelvin;
        updateKelvinDisplay(kelvin);
    }
    
    startAnimation();
}

function setTargetBrightness(brightness, immediate = false) {
    animationState.targetBrightness = brightness;
    
    if (immediate) {
        animationState.currentBrightness = brightness;
        bulbState.brightness = brightness;
        updateBrightnessDisplay(brightness);
    }
    
    startAnimation();
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
        updateBulbColor();
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
        
        // Stop animation and clear queues when turning off
        stopAnimation();
        clearQueues();
    }
}

// ========== QUEUE MANAGEMENT ==========
function addToKelvinQueue(kelvin) {
    // Only add if significantly different from last value in queue
    if (kelvinQueue.length === 0 || 
        Math.abs(kelvinQueue[kelvinQueue.length - 1] - kelvin) >= MIN_KELVIN_DIFF) {
        kelvinQueue.push(kelvin);
    }
    
    // Start interval if not already running
    if (!kelvinInterval) {
        kelvinInterval = setInterval(processKelvinQueue, UPDATE_INTERVAL);
    }
}

function addToBrightnessQueue(brightness) {
    // Only add if significantly different from last value in queue
    if (brightnessQueue.length === 0 || 
        Math.abs(brightnessQueue[brightnessQueue.length - 1] - brightness) >= MIN_BRIGHTNESS_DIFF) {
        brightnessQueue.push(brightness);
    }
    
    // Start interval if not already running
    if (!brightnessInterval) {
        brightnessInterval = setInterval(processBrightnessQueue, UPDATE_INTERVAL);
    }
}

function processKelvinQueue() {
    if (kelvinQueue.length === 0) {
        // No more values to process, stop interval
        clearInterval(kelvinInterval);
        kelvinInterval = null;
        return;
    }
    
    // Get the most recent kelvin value from the queue
    const kelvin = kelvinQueue[kelvinQueue.length - 1];
    
    // Clear the queue (we only need the latest value)
    kelvinQueue = [];
    
    // Send the update if significantly different from last sent value
    if (Math.abs(kelvin - lastSentKelvin) >= MIN_KELVIN_DIFF) {
        sendTemperature(kelvin);
        lastSentKelvin = kelvin;
    }
}

function processBrightnessQueue() {
    if (brightnessQueue.length === 0) {
        // No more values to process, stop interval
        clearInterval(brightnessInterval);
        brightnessInterval = null;
        return;
    }
    
    // Get the most recent brightness value from the queue
    const brightness = brightnessQueue[brightnessQueue.length - 1];
    
    // Clear the queue (we only need the latest value)
    brightnessQueue = [];
    
    // Send the update if significantly different from last sent value
    if (Math.abs(brightness - lastSentBrightness) >= MIN_BRIGHTNESS_DIFF) {
        sendBrightness(brightness);
        lastSentBrightness = brightness;
    }
}

function clearQueues() {
    kelvinQueue = [];
    brightnessQueue = [];
    
    if (kelvinInterval) {
        clearInterval(kelvinInterval);
        kelvinInterval = null;
    }
    
    if (brightnessInterval) {
        clearInterval(brightnessInterval);
        brightnessInterval = null;
    }
}

// ========== EVENT LISTENERS ==========
// Kelvin Slider - Immediate UI updates, queued API calls
kelvinSlider.addEventListener('input', (e) => {
    const kelvin = parseInt(e.target.value);
    
    // Set target for smooth animation
    setTargetKelvin(kelvin);
    updateStatus(`Temperature: ${kelvin}K`);
    
    // Add to queue for batched processing
    if (bulbState.power) {
        addToKelvinQueue(kelvin);
    }
});

// Brightness Slider - Immediate UI updates, queued API calls
brightnessSlider.addEventListener('input', (e) => {
    const brightness = parseInt(e.target.value);
    
    // Set target for smooth animation
    setTargetBrightness(brightness);
    updateStatus(`Brightness: ${brightness}%`);
    
    // Add to queue for batched processing
    if (bulbState.power) {
        addToBrightnessQueue(brightness);
    }
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

// Temperature Presets - Immediate UI updates with queued API call
tempPresets.forEach(preset => {
    preset.addEventListener('click', () => {
        const kelvin = parseInt(preset.dataset.kelvin);
        
        // Set target for smooth animation
        setTargetKelvin(kelvin);
        updateStatus(`Temperature: ${kelvin}K`);
        
        // Add to queue for immediate processing
        if (bulbState.power) {
            kelvinQueue = [kelvin]; // Clear existing queue and set new value
            if (!kelvinInterval) {
                kelvinInterval = setInterval(processKelvinQueue, UPDATE_INTERVAL);
            }
        }
    });
});

// Handle slider release for immediate final update
kelvinSlider.addEventListener('change', (e) => {
    if (!bulbState.power) return;
    
    const kelvin = parseInt(e.target.value);
    
    // Force immediate processing of any queued values
    if (kelvinQueue.length > 0) {
        kelvinQueue.push(kelvin);
        processKelvinQueue();
    }
});

brightnessSlider.addEventListener('change', (e) => {
    if (!bulbState.power) return;
    
    const brightness = parseInt(e.target.value);
    
    // Force immediate processing of any queued values
    if (brightnessQueue.length > 0) {
        brightnessQueue.push(brightness);
        processBrightnessQueue();
    }
});

// ========== API FUNCTIONS ==========
async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data.success) {
            bulbState.power = data.power;
            bulbState.kelvin = data.kelvin;
            bulbState.brightness = data.brightness;
            bulbState.connected = true;

            // Update animation state
            animationState.targetKelvin = data.kelvin;
            animationState.currentKelvin = data.kelvin;
            animationState.targetBrightness = data.brightness;
            animationState.currentBrightness = data.brightness;

            // Update last sent values
            lastSentKelvin = data.kelvin;
            lastSentBrightness = data.brightness;

            // Update UI immediately (no animation on initial load)
            setPower(data.power);
            updateKelvinDisplay(data.kelvin);
            updateBrightnessDisplay(data.brightness);
            updateBulbColor();

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

async function sendTemperature(kelvin) {
    try {
        const response = await fetch('/api/temperature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kelvin: kelvin })
        });
        const data = await response.json();

        if (data.success) {
            updateStatus(`Temperature set to ${kelvin}K`);
        } else {
            updateStatus('Temperature control failed: ' + data.error);
        }
    } catch (error) {
        updateStatus('Error sending temperature command: ' + error.message);
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
                setTargetBrightness(newBrightness);
                addToBrightnessQueue(newBrightness);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (bulbState.power) {
                const newBrightness = Math.max(bulbState.brightness - 10, 1);
                setTargetBrightness(newBrightness);
                addToBrightnessQueue(newBrightness);
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (bulbState.power) {
                const newKelvin = Math.max(bulbState.kelvin - 100, 2700);
                setTargetKelvin(newKelvin);
                addToKelvinQueue(newKelvin);
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (bulbState.power) {
                const newKelvin = Math.min(bulbState.kelvin + 100, 6500);
                setTargetKelvin(newKelvin);
                addToKelvinQueue(newKelvin);
            }
            break;
    }
});

// ========== INITIALIZATION ==========
function init() {
    // Add CSS for slider thumb
    const style = document.createElement('style');
    style.textContent = `
        .kelvin-slider::-moz-range-thumb {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: white;
            border: 4px solid #4cc9f0;
            cursor: grab;
            box-shadow: 0 0 20px rgba(76, 201, 240, 0.7);
        }

        .kelvin-slider::-moz-range-thumb:active {
            transform: scale(1.1);
            cursor: grabbing;
        }

        .brightness-slider::-moz-range-thumb {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #4cc9f0;
            cursor: pointer;
            border: 4px solid white;
            box-shadow: 0 0 15px rgba(76, 201, 240, 0.7);
        }
    `;
    document.head.appendChild(style);

    // Fetch current bulb status and sync UI
    fetchStatus();
}

// Start everything
window.addEventListener('DOMContentLoaded', init);