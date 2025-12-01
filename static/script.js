class BulbController {
    constructor() {
        // Start with optimistic defaults
        this.currentStatus = {
            power: true,
            brightness: 500,
            temperature: 4700
        };
        
        this.isConnected = false;
        this.isLoading = false;
        
        this.initElements();
        this.setupEventListeners();
        
        // Set initial connection status
        this.updateConnectionStatus(false);
        
        // Set initial background based on temperature
        this.updateBackgroundGradient(this.currentStatus.temperature);
        
        // Start connection check
        this.checkConnection();
    }
    
    initElements() {
        this.powerToggle = document.getElementById('powerToggle');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = document.querySelector('.status-dot');
        
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.temperatureSlider = document.getElementById('temperatureSlider');
        
        this.brightnessValue = document.getElementById('brightnessValue');
        this.temperatureValue = document.getElementById('temperatureValue');
        
        this.lastUpdate = document.getElementById('lastUpdate');
        this.bulbIp = document.getElementById('bulbIp');
        
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toastMessage');
        
        this.presetButtons = document.querySelectorAll('.preset-btn');
        
        this.bulbIp.textContent = '172.20.10.3';
        
        // Get body element for background updates
        this.body = document.body;
        
        // Pre-calculate temperature colors
        this.temperatureColors = {
            // Warm to neutral temperatures (2700K to 4000K)
            2700: { r: 255, g: 180, b: 107 }, // Warm white (orange tint)
            3000: { r: 255, g: 209, b: 163 }, // Warm white
            3500: { r: 255, g: 228, b: 206 }, // Neutral white
            4000: { r: 255, g: 241, b: 224 }, // Cool white
            
            // Cool to daylight temperatures (4000K to 6700K)
            4500: { r: 255, g: 250, b: 244 }, // Cool white
            5000: { r: 255, g: 255, b: 251 }, // Daylight
            5500: { r: 242, g: 247, b: 255 }, // Cool daylight
            6000: { r: 230, g: 238, b: 255 }, // Daylight
            6500: { r: 220, g: 233, b: 255 }, // Cool daylight
            6700: { r: 214, g: 229, b: 255 }  // Very cool white (blue tint)
        };
    }
    
    getTemperatureColor(temperature) {
        // Find the two closest temperature points
        const temps = Object.keys(this.temperatureColors).map(Number).sort((a, b) => a - b);
        
        // If temperature is exactly one of our defined points
        if (this.temperatureColors[temperature]) {
            return this.temperatureColors[temperature];
        }
        
        // Find bounding temperatures
        let lower = temps[0];
        let upper = temps[temps.length - 1];
        
        for (let i = 0; i < temps.length - 1; i++) {
            if (temperature >= temps[i] && temperature <= temps[i + 1]) {
                lower = temps[i];
                upper = temps[i + 1];
                break;
            }
        }
        
        // Calculate interpolation ratio
        const ratio = (temperature - lower) / (upper - lower);
        
        // Interpolate between the two colors
        const lowerColor = this.temperatureColors[lower];
        const upperColor = this.temperatureColors[upper];
        
        return {
            r: Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * ratio),
            g: Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * ratio),
            b: Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * ratio)
        };
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    async checkConnection() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        // Update status to show connecting
        const statusText = this.connectionStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Connecting...';
            statusText.style.color = '#ffa502'; // Orange color for connecting
        }
        
        try {
            // Quick connection check (1.5 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);
            
            const response = await fetch('/status', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = data.connected;
                this.updateConnectionStatus(this.isConnected);
                
                if (this.isConnected) {
                    this.showNotification('Connected to bulb!', 'success');
                    // Try to get state
                    this.tryGetState();
                } else {
                    this.showNotification('Bulb offline', 'error');
                }
            }
        } catch (error) {
            console.log('Connection check failed:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            if (error.name === 'AbortError') {
                this.showNotification('Connection timeout', 'error');
            } else {
                this.showNotification('Connection error', 'error');
            }
        } finally {
            this.isLoading = false;
        }
    }
    
    async tryGetState() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/get-state', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update with REAL bulb state
                    this.currentStatus.power = data.state.power;
                    this.currentStatus.brightness = data.state.brightness;
                    this.currentStatus.temperature = data.state.temperature;
                    
                    // Update sliders FIRST before updating displays
                    this.brightnessSlider.value = data.state.brightness;
                    this.temperatureSlider.value = data.state.temperature;
                    
                    // Then update UI displays
                    this.updatePowerUI(data.state.power);
                    this.updateBrightnessDisplay(data.state.brightness);
                    this.updateTemperatureDisplay(data.state.temperature);
                    
                    // Update background based on temperature
                    this.updateBackgroundGradient(data.state.temperature);
                    
                    this.showNotification('Connected! Using bulb state', 'success');
                    console.log('Loaded actual bulb state:', this.currentStatus);
                } else {
                    // Server responded but couldn't get state
                    this.showNotification('Connected, using defaults', 'info');
                    this.updateUI(); // Still update with defaults
                }
            }
        } catch (error) {
            // Silently fail - state fetch is optional
            console.log('State fetch failed (normal):', error.message);
        }
    }
    
    setupEventListeners() {
        // POWER TOGGLE - Simple and reliable
        this.powerToggle.addEventListener('click', () => {
            const newState = !this.currentStatus.power;
            
            // Update UI immediately
            this.currentStatus.power = newState;
            this.updatePowerUI(newState);
            
            // Show feedback
            this.showNotification(`Turning ${newState ? 'ON' : 'OFF'}...`, 'info');
            
            // Send command (fire and forget)
            this.sendPowerCommand(newState);
        });
        
        // BRIGHTNESS SLIDER
        this.setupSimpleSlider(this.brightnessSlider, 'brightness');
        
        // TEMPERATURE SLIDER
        this.setupSimpleSlider(this.temperatureSlider, 'temperature');
        
        // PRESET BUTTONS
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const brightness = parseInt(e.currentTarget.dataset.brightness);
                const temperature = parseInt(e.currentTarget.dataset.temperature);
                
                // Update UI immediately
                this.currentStatus.brightness = brightness;
                this.currentStatus.temperature = temperature;
                this.brightnessSlider.value = brightness;
                this.temperatureSlider.value = temperature;
                this.updateBrightnessDisplay(brightness);
                this.updateTemperatureDisplay(temperature);
                
                // Update background gradient with temperature
                this.updateBackgroundGradient(temperature);
                
                // Visual feedback
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 300);
                
                this.showNotification('Applying preset...', 'info');
                
                // Send commands
                this.sendBrightnessCommand(brightness);
                this.sendTemperatureCommand(temperature);
            });
        });
        
        // Add retry button to connection status
        this.addRetryButton();
    }
    
    setupSimpleSlider(slider, type) {
        let timeoutId = null;
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            
            // Update display immediately
            if (type === 'brightness') {
                this.currentStatus.brightness = value;
                this.updateBrightnessDisplay(value);
            } else {
                this.currentStatus.temperature = value;
                this.updateTemperatureDisplay(value);
                // Update background gradient in real-time for temperature
                this.updateBackgroundGradient(value);
            }
            
            // Debounce the request
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (type === 'brightness') {
                    const percentage = Math.round((value / 1000) * 100);
                    this.showNotification(`Setting brightness to ${percentage}%...`, 'info');
                    this.sendBrightnessCommand(value);
                } else {
                    this.showNotification(`Setting temperature to ${value}K...`, 'info');
                    this.sendTemperatureCommand(value);
                }
            }, 400);
        });
    }
    
    async sendPowerCommand(state) {
        try {
            const response = await fetch('/power', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ state: state })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification(`Bulb turned ${state ? 'ON' : 'OFF'}`, 'success');
                    this.updateConnectionStatus(true);
                    this.isConnected = true;
                }
            }
        } catch (error) {
            console.log('Power command failed:', error);
            this.showNotification('Failed to control bulb', 'error');
            this.updateConnectionStatus(false);
            this.isConnected = false;
        }
    }
    
    async sendBrightnessCommand(value) {
        try {
            const response = await fetch('/brightness', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brightness: value })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const percentage = Math.round((value / 1000) * 100);
                    this.showNotification(`Brightness set to ${percentage}%`, 'success');
                    this.updateConnectionStatus(true);
                    this.isConnected = true;
                }
            }
        } catch (error) {
            console.log('Brightness command failed:', error);
            this.showNotification('Failed to set brightness', 'error');
            this.updateConnectionStatus(false);
            this.isConnected = false;
        }
    }
    
    async sendTemperatureCommand(value) {
        try {
            const response = await fetch('/temperature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ temperature: value })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification(`Temperature set to ${value}K`, 'success');
                    this.updateConnectionStatus(true);
                    this.isConnected = true;
                }
            }
        } catch (error) {
            console.log('Temperature command failed:', error);
            this.showNotification('Failed to set temperature', 'error');
            this.updateConnectionStatus(false);
            this.isConnected = false;
        }
    }
    
    updateUI() {
        this.updatePowerUI(this.currentStatus.power);
        this.brightnessSlider.value = this.currentStatus.brightness;
        this.temperatureSlider.value = this.currentStatus.temperature;
        this.updateBrightnessDisplay(this.currentStatus.brightness);
        this.updateTemperatureDisplay(this.currentStatus.temperature);
        this.updateTimestamp();
    }
    
    updatePowerUI(powerState) {
        if (powerState) {
            this.powerToggle.classList.remove('off');
            this.powerToggle.classList.add('on');
        } else {
            this.powerToggle.classList.remove('on');
            this.powerToggle.classList.add('off');
        }
        
        // Adjust overall brightness based on power state
        this.updateBackgroundBrightness();
        
        // Animation
        this.powerToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.powerToggle.style.transform = 'scale(1)';
        }, 150);
    }
    
    updateBrightnessDisplay(value) {
        const percentage = Math.round((value / 1000) * 100);
        this.brightnessValue.textContent = `${percentage}%`;
        
        this.brightnessValue.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.brightnessValue.style.transform = 'scale(1)';
        }, 150);
        
        // Update background brightness
        this.updateBackgroundBrightness();
    }
    
    updateTemperatureDisplay(value) {
        this.temperatureValue.textContent = `${value}K`;
        
        this.temperatureValue.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.temperatureValue.style.transform = 'scale(1)';
        }, 150);
        
        // Update background gradient with new temperature
        this.updateBackgroundGradient(value);
    }
    
    updateBackgroundGradient(temperature) {
        if (!this.body) return;
        
        // Get the base color for this temperature
        const baseColor = this.getTemperatureColor(temperature);
        
        // Create three shades for the gradient
        // Dark shade: reduce brightness by 85%
        const darkShade = {
            r: Math.round(baseColor.r * 0.15),
            g: Math.round(baseColor.g * 0.15),
            b: Math.round(baseColor.b * 0.15)
        };
        
        // Medium shade: reduce brightness by 70%
        const mediumShade = {
            r: Math.round(baseColor.r * 0.30),
            g: Math.round(baseColor.g * 0.30),
            b: Math.round(baseColor.b * 0.30)
        };
        
        // Light shade: reduce brightness by 55%
        const lightShade = {
            r: Math.round(baseColor.r * 0.45),
            g: Math.round(baseColor.g * 0.45),
            b: Math.round(baseColor.b * 0.45)
        };
        
        // Convert to hex colors
        const color1 = this.rgbToHex(darkShade.r, darkShade.g, darkShade.b);
        const color2 = this.rgbToHex(mediumShade.r, mediumShade.g, mediumShade.b);
        const color3 = this.rgbToHex(lightShade.r, lightShade.g, lightShade.b);
        // Add 'fixed' positioning and full coverage
        this.body.style.backgroundAttachment = 'fixed'; // This makes it cover the entire viewport
        this.body.style.backgroundSize = 'cover';
        this.body.style.backgroundRepeat = 'no-repeat';
        // Apply the gradient with smooth transition
        this.body.style.transition = 'background 0.8s ease-in-out';
        this.body.style.background = `linear-gradient(135deg, 
            ${color1} 0%, 
            ${color2} 50%, 
            ${color3} 100%)`;
        
        // Update debug display (optional)
        console.log(`Temperature: ${temperature}K, Color: RGB(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
    }
    
    updateBackgroundBrightness() {
        if (!this.body) return;
        
        if (!this.currentStatus.power) {
            // When bulb is off, darken the background more
            this.body.style.filter = 'brightness(0.5)';
        } else {
            // Adjust brightness based on bulb brightness (50% to 100%)
            const brightnessFactor = 0.5 + (this.currentStatus.brightness / 1000) * 0.5;
            this.body.style.filter = `brightness(${brightnessFactor})`;
        }
        
        this.body.style.transition = 'filter 0.5s ease-in-out';
    }
    
    updateConnectionStatus(connected) {
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        if (!statusText) return; // Safety check
        
        if (connected) {
            console.log(`📡 updateConnectionStatus called with: ${connected}`);
            this.statusDot.classList.add('connected');
            this.statusDot.classList.remove('disconnected');
            statusText.textContent = 'Connected';
            statusText.style.color = '#2ed573';
        } else {
            this.statusDot.classList.remove('connected');
            this.statusDot.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            statusText.style.color = '#ff4757';
        }
    }
    
    updateTimestamp() {
        const now = new Date();
        this.lastUpdate.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    showNotification(message, type = 'info') {
    if (!this.toast || !this.toastMessage) return;
    
    // Prevent body scroll
    document.body.classList.add('toast-visible');
    
    this.toastMessage.textContent = message;
    
    // Remove all type-based styling
    this.toast.removeAttribute('style');
    
    // Add base styling
    this.toast.style.background = 'rgba(20, 20, 20, 0.95)';
    this.toast.style.color = '#ffffff';
    this.toast.style.border = '1px solid rgba(61, 19, 19, 0.1)';
    
    // Add type-specific text color
    if (type === 'info') {
        this.toast.style.color = '#3498db';
        this.toast.style.borderColor = 'rgba(52, 152, 219, 0.3)';
    } else if (type === 'success') {
        this.toast.style.color = '#2ed573';
        this.toast.style.borderColor = 'rgba(46, 213, 115, 0.3)';
    } else if (type === 'error') {
        this.toast.style.color = '#ff4757';
        this.toast.style.borderColor = 'rgba(255, 71, 87, 0.3)';
    }
    
    // Show toast
    this.toast.classList.add('show');
    
    // Clear any existing timeout
    if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
    }
    
    // Set timeout to hide toast
    this.toastTimeout = setTimeout(() => {
        this.toast.classList.remove('show');
        
        // Re-enable body scroll after toast hides
        setTimeout(() => {
            document.body.classList.remove('toast-visible');
        }, 300); // Wait for the hide animation to complete
    }, 2000);
    }
    
    addRetryButton() {
        const retryBtn = document.createElement('button');
        retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Retry';
        retryBtn.style.cssText = `
            background: rgba(52, 152, 219, 0.2);
            border: 1px solid rgba(52, 152, 219, 0.5);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            position: relative;
            overflow: hidden;
        `;
        
        retryBtn.addEventListener('click', async () => {
            if (this.isLoading) return;
            
            // Store original text
            const originalText = retryBtn.innerHTML;
            
            // Change to connecting state
            retryBtn.innerHTML = '<i class="fas fa-spinner"></i> Connecting...';
            retryBtn.disabled = true;
            
            // Add rotation animation ONLY to the icon
            const icon = retryBtn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
            
            await this.checkConnection();
            
            // Restore original button
            retryBtn.innerHTML = originalText;
            if (icon) {
                icon.style.animation = '';
            }
            retryBtn.disabled = false;
        });
        
        this.connectionStatus.appendChild(retryBtn);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.controller = new BulbController();
    
    // Update time display
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        const timeElement = document.querySelector('.time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    updateTime();
    setInterval(updateTime, 60000);
});