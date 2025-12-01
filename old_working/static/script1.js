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
        
        // Don't auto-connect on start, let user click retry or wait
        // Or if you want auto-connect, keep this line:
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
    }
    
    async checkConnection() {
        if (this.isLoading) return;
        this.isLoading = true;
        
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
                    // Try to get state, but don't wait too long
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
                    
                    // IMPORTANT: Update sliders FIRST before updating displays
                    this.brightnessSlider.value = data.state.brightness;
                    this.temperatureSlider.value = data.state.temperature;
                    
                    // Then update UI displays
                    this.updatePowerUI(data.state.power);
                    this.updateBrightnessDisplay(data.state.brightness);
                    this.updateTemperatureDisplay(data.state.temperature);
                    
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
            // Don't show error for this, it's a background operation
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
    }
    
    updateTemperatureDisplay(value) {
        this.temperatureValue.textContent = `${value}K`;
        
        this.temperatureValue.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.temperatureValue.style.transform = 'scale(1)';
        }, 150);
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            console.log(`📡 updateConnectionStatus called with: ${connected}`);
            this.statusDot.classList.add('connected');
            this.statusDot.classList.remove('disconnected');

            const statusText = this.connectionStatus.querySelector('span:last-child');
            if (statusText) {
                statusText.textContent = 'Connected';
                statusText.style.color = '#2ed573';
            }
        } else {
            this.statusDot.classList.remove('connected');
            this.statusDot.classList.add('disconnected');

            const statusText = this.connectionStatus.querySelector('span:last-child');
            if (statusText) {
                statusText.textContent = 'Disconnected';
                statusText.style.color = '#ff4757';
            }
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
        
        this.toastMessage.textContent = message;
        
        if (type === 'info') {
            this.toast.style.background = 'rgba(52, 152, 219, 0.9)';
        } else if (type === 'success') {
            this.toast.style.background = 'rgba(46, 213, 115, 0.9)';
        } else if (type === 'error') {
            this.toast.style.background = 'rgba(255, 71, 87, 0.9)';
        }
        
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
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
        `;
        
        retryBtn.addEventListener('click', async () => {
            if (this.isLoading) return;
            
            retryBtn.style.transform = 'rotate(180deg)';
            retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            retryBtn.disabled = true;
            
            await this.checkConnection();
            
            retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Retry';
            retryBtn.style.transform = 'rotate(0deg)';
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