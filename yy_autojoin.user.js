// ==UserScript==
// @name         Yiya.gg Auto Join Button Clicker with Time Windows
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Automatically finds and clicks "Join Now" button on yiya.gg during configured time windows
// @author       You
// @match        *://*.yiya.gg/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://github.com/trungduy17/telebot/raw/main/yy_autojoin.user.js
// @updateURL    https://github.com/trungduy17/telebot/raw/main/yy_autojoin.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Create control panel UI styles
    GM_addStyle(`
        #yiya-auto-join-panel {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 300px;
            background-color: #242424;
            color: white;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 12px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        #yiya-auto-join-panel h3 {
            margin-top: 0;
            text-align: center;
            color: #00ccff;
            font-size: 16px;
            border-bottom: 1px solid #444;
            padding-bottom: 8px;
        }
        #yiya-auto-join-panel .control-row {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        #yiya-auto-join-panel input {
            width: 60px;
            background-color: #333;
            border: 1px solid #555;
            color: white;
            border-radius: 3px;
            padding: 5px;
            text-align: center;
        }
        #yiya-auto-join-panel input[type="time"] {
            width: 115px;
        }
        #yiya-auto-join-panel label {
            flex-grow: 1;
            font-size: 14px;
            margin-left: 8px;
        }
        #yiya-auto-join-panel .status {
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            padding: 8px;
            border-radius: 3px;
            background-color: #333;
            min-height: 15px;
        }
        #yiya-auto-join-panel .close-btn {
            position: absolute;
            top: 8px;
            right: 10px;
            cursor: pointer;
            font-size: 16px;
            color: #888;
        }
        #yiya-auto-join-panel .close-btn:hover {
            color: #ccc;
        }
        #yiya-auto-join-panel .drag-handle {
            cursor: move;
            text-align: center;
            margin-bottom: 5px;
            color: #888;
            font-size: 12px;
        }
        #yiya-auto-join-panel .attempts {
            margin-top: 8px;
            font-size: 12px;
            text-align: center;
            color: #aaa;
        }
        #yiya-auto-join-panel .time-window {
            border: 1px solid #444;
            border-radius: 5px;
            padding: 8px;
            margin-bottom: 10px;
            background-color: #2a2a2a;
        }
        #yiya-auto-join-panel .time-window-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        #yiya-auto-join-panel .time-window-title {
            font-weight: bold;
            color: #00ccff;
        }
        #yiya-auto-join-panel .toggle-switch {
            position: relative;
            display: inline-block;
            width: 30px;
            height: 16px;
        }
        #yiya-auto-join-panel .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        #yiya-auto-join-panel .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #444;
            transition: .3s;
            border-radius: 8px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
        }
        #yiya-auto-join-panel .toggle-slider:before {
            position: absolute;
            content: "";
            height: 12px;
            width: 12px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        #yiya-auto-join-panel input:checked + .toggle-slider {
            background-color: #00aa44;
        }
        #yiya-auto-join-panel input:checked + .toggle-slider:before {
            transform: translateX(14px);
        }
        #yiya-auto-join-panel .next-run {
            margin-top: 8px;
            font-size: 12px;
            text-align: center;
            color: #aaa;
        }
        #yiya-auto-join-panel .current-time {
            margin-top: 5px;
            font-size: 12px;
            text-align: center;
            color: #00ccff;
        }
    `);

    // Default time windows
    const DEFAULT_TIME_WINDOWS = [
        { enabled: true, start: '10:28', end: '11:30' },
        { enabled: true, start: '15:28', end: '16:30' }
    ];

    // State variables
    let isRunning = false;
    let isAutoMode = true;
    let searchInterval = null;
    let clockInterval = null;
    let timeCheckInterval = null;
    let panelElement = null;
    let statusElement = null;
    let attemptsElement = null;
    let attemptIntervalInput = null;
    let nextRunElement = null;
    let currentTimeElement = null;
    let attemptCount = 0;

    // Load saved settings or use defaults
    let attemptIntervalMs = GM_getValue('yiyaAttemptInterval', 1000);
    let timeWindows = GM_getValue('yiyaTimeWindows', DEFAULT_TIME_WINDOWS);
    isAutoMode = GM_getValue('yiyaAutoMode', true);

    // Create control panel
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'yiya-auto-join-panel';

        // Create HTML for time windows
        let timeWindowsHTML = '';
        timeWindows.forEach((window, index) => {
            timeWindowsHTML += `
                <div class="time-window" id="time-window-${index}">
                    <div class="time-window-header">
                        <span class="time-window-title">Time Window ${index + 1}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" class="window-toggle" data-index="${index}" ${window.enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="control-row">
                        <input type="time" class="window-start" data-index="${index}" value="${window.start}">
                        <span style="margin: 0 5px;">to</span>
                        <input type="time" class="window-end" data-index="${index}" value="${window.end}">
                    </div>
                </div>
            `;
        });

        panel.innerHTML = `
            <div class="close-btn">×</div>
            <div class="drag-handle">● ● ●</div>
            <h3>Yiya Auto Joiner</h3>

            <div class="current-time">Current time: 12:00:00 AM</div>

            <div class="control-row" style="margin-top: 10px;">
                <label>Auto-mode (time-based)</label>
                <label class="toggle-switch" style="margin-left: 8px;">
                    <input type="checkbox" id="auto-mode-toggle" ${isAutoMode ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            ${timeWindowsHTML}

            <div class="control-row">
                <input type="number" id="attempt-interval" min="100" max="10000" value="${attemptIntervalMs}">
                <label>Time between attempts (ms)</label>
            </div>

            <div class="status">Ready to start</div>
            <div class="attempts">Attempts: 0</div>
            <div class="next-run">Waiting for next scheduled run...</div>
        `;

        document.body.appendChild(panel);
        panelElement = panel;
        statusElement = panel.querySelector('.status');
        attemptsElement = panel.querySelector('.attempts');
        attemptIntervalInput = panel.querySelector('#attempt-interval');
        nextRunElement = panel.querySelector('.next-run');
        currentTimeElement = panel.querySelector('.current-time');

        // Make panel draggable
        makeDraggable(panel);

        // Add event listeners
        attemptIntervalInput.addEventListener('change', saveAttemptInterval);
        panel.querySelector('#auto-mode-toggle').addEventListener('change', toggleAutoMode);

        // Add event listeners for time window controls
        panel.querySelectorAll('.window-toggle').forEach(toggle => {
            toggle.addEventListener('change', updateTimeWindow);
        });

        panel.querySelectorAll('.window-start, .window-end').forEach(input => {
            input.addEventListener('change', updateTimeWindow);
        });

        panel.querySelector('.close-btn').addEventListener('click', () => {
            if (isRunning) stopAutoJoin();
            clearInterval(clockInterval);
            clearInterval(timeCheckInterval);
            panel.remove();
        });

        // Start the clock and time checker
        updateClock();
        clockInterval = setInterval(updateClock, 1000);
        timeCheckInterval = setInterval(checkTimeWindows, 30000);

        // Initial time window check
        checkTimeWindows();

        // Log panel creation to console
        console.log('[Yiya Auto Joiner] Control panel created');
    }

    // Update the current time display
    function updateClock() {
        if (!currentTimeElement) return;

        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert to 12-hour format
        hours = hours.toString().padStart(2, '0');

        currentTimeElement.textContent = `Current time: ${hours}:${minutes}:${seconds} ${period}`;
    }

    // Toggle auto mode
    function toggleAutoMode(e) {
        isAutoMode = e.target.checked;
        GM_setValue('yiyaAutoMode', isAutoMode);

        if (isAutoMode) {
            checkTimeWindows();
            updateStatus('Auto mode enabled, checking time windows...', 'info');
            console.log('[Yiya Auto Joiner] Auto mode enabled');
        } else {
            if (isRunning) {
                stopAutoJoin();
                updateStatus('Auto mode disabled', 'info');
            }
            console.log('[Yiya Auto Joiner] Auto mode disabled');
        }

        updateNextRunTime();
    }

    // Save time window settings when changed
    function updateTimeWindow(e) {
        const index = parseInt(e.target.dataset.index);

        if (e.target.classList.contains('window-toggle')) {
            timeWindows[index].enabled = e.target.checked;
        } else if (e.target.classList.contains('window-start')) {
            timeWindows[index].start = e.target.value;
        } else if (e.target.classList.contains('window-end')) {
            timeWindows[index].end = e.target.value;
        }

        GM_setValue('yiyaTimeWindows', timeWindows);
        console.log(`[Yiya Auto Joiner] Time window ${index + 1} updated:`, timeWindows[index]);

        updateNextRunTime();
        checkTimeWindows();
    }

    // Save attempt interval when changed
    function saveAttemptInterval() {
        const newValue = parseInt(attemptIntervalInput.value);
        if (newValue >= 100 && newValue <= 10000) {
            attemptIntervalMs = newValue;
            GM_setValue('yiyaAttemptInterval', newValue);
            console.log(`[Yiya Auto Joiner] Attempt interval set to ${newValue}ms`);
        } else {
            attemptIntervalInput.value = attemptIntervalMs;
            console.warn(`[Yiya Auto Joiner] Invalid interval value, reset to ${attemptIntervalMs}ms`);
        }
    }

    // Make the panel draggable
    function makeDraggable(element) {
        const dragHandle = element.querySelector('.drag-handle');
        let offsetX, offsetY, isDragging = false;

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            element.style.left = (e.clientX - offsetX) + 'px';
            element.style.top = (e.clientY - offsetY) + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Update status message
    function updateStatus(message, type = 'info') {
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.style.backgroundColor = type === 'error' ? '#ff3333' :
                                             type === 'success' ? '#33aa33' : '#333';
    }

    // Update attempt count
    function updateAttemptCount() {
        if (!attemptsElement) return;
        attemptCount++;
        attemptsElement.textContent = `Attempts: ${attemptCount}`;
    }

    // Start the auto join process
    function startAutoJoin(mode = 'auto') {
        if (isRunning) return;

        isRunning = true;

        if (mode === 'manual') {
            updateStatus('Manually searching for Join Now button...', 'info');
            console.log('[Yiya Auto Joiner] Manual join started');
        } else {
            updateStatus('Auto-started searching for Join Now button...', 'info');
            console.log('[Yiya Auto Joiner] Auto join started - in active time window');
        }

        attemptCount = 0;
        updateAttemptCount();

        attemptIntervalMs = parseInt(attemptIntervalInput.value) || 1000;
        searchInterval = setInterval(findAndClickJoinButton, attemptIntervalMs);
    }

    // Stop the auto join process
    function stopAutoJoin() {
        clearInterval(searchInterval);
        isRunning = false;
        updateStatus('Ready to start');
        console.log('[Yiya Auto Joiner] Auto join stopped');
    }

    // Check if current time is within any of the enabled time windows
    function checkTimeWindows() {
        if (!isAutoMode) return;

        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                           now.getMinutes().toString().padStart(2, '0');

        let inTimeWindow = false;
        let activeWindow = null;

        for (let i = 0; i < timeWindows.length; i++) {
            const window = timeWindows[i];
            if (!window.enabled) continue;

            if (isTimeInRange(currentTime, window.start, window.end)) {
                inTimeWindow = true;
                activeWindow = i + 1;
                break;
            }
        }

        if (inTimeWindow) {
            console.log(`[Yiya Auto Joiner] Current time ${currentTime} is within time window ${activeWindow}`);
            if (!isRunning) startAutoJoin('auto');
        } else {
            console.log(`[Yiya Auto Joiner] Current time ${currentTime} is outside all time windows`);
            if (isRunning) {
                stopAutoJoin();
                updateStatus('Outside active time windows, stopped', 'info');
            }
        }

        updateNextRunTime();
    }

    // Check if a time is within a range
    function isTimeInRange(time, start, end) {
        const timeMinutes = convertTimeToMinutes(time);
        const startMinutes = convertTimeToMinutes(start);
        const endMinutes = convertTimeToMinutes(end);

        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }

    // Convert HH:MM time format to minutes since midnight
    function convertTimeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Update the next scheduled run time display
    function updateNextRunTime() {
        if (!nextRunElement || !isAutoMode) {
            if (nextRunElement) nextRunElement.textContent = 'Auto mode disabled';
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let nextRunMinutes = Infinity;
        let nextWindowIndex = -1;

        timeWindows.forEach((window, index) => {
            if (!window.enabled) return;

            const startMinutes = convertTimeToMinutes(window.start);
            let minutesUntilStart = startMinutes - currentMinutes;

            if (minutesUntilStart <= 0) minutesUntilStart += 24 * 60;

            if (minutesUntilStart < nextRunMinutes) {
                nextRunMinutes = minutesUntilStart;
                nextWindowIndex = index;
            }
        });

        if (nextWindowIndex === -1) {
            nextRunElement.textContent = 'No active time windows';
            return;
        }

        const nextRunHours = Math.floor(nextRunMinutes / 60);
        const nextRunMins = nextRunMinutes % 60;

        let timeText;
        if (nextRunHours === 0) {
            timeText = `${nextRunMins} minute${nextRunMins !== 1 ? 's' : ''}`;
        } else {
            timeText = `${nextRunHours} hour${nextRunHours !== 1 ? 's' : ''} and ${nextRunMins} minute${nextRunMins !== 1 ? 's' : ''}`;
        }

        nextRunElement.textContent = `Next scheduled run in ${timeText}`;
    }

    // Find and click the "Join Now" button
    function findAndClickJoinButton() {
        updateAttemptCount();
        console.log(`[Yiya Auto Joiner] Searching for Join Now button (Attempt #${attemptCount})`);

        // Method 1: Look for button with exact text
        let joinButton = Array.from(document.querySelectorAll('button')).find(
            button => button.textContent.trim() === 'Join Now'
        );

        // Method 2: Look for any element containing the text
        if (!joinButton) {
            joinButton = Array.from(document.querySelectorAll('button, a, div[role="button"]')).find(
                el => el.textContent.includes('Join Now') && el.offsetParent !== null
            );
        }

        if (joinButton) {
            updateStatus('Found Join Now button! Clicking...', 'success');
            console.log('[Yiya Auto Joiner] Found Join Now button!', joinButton);

            const originalBackground = joinButton.style.backgroundColor;
            const originalBorder = joinButton.style.border;

            joinButton.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            joinButton.style.border = '2px solid lime';

            setTimeout(() => {
                console.log('[Yiya Auto Joiner] Clicking Join Now button...');
                joinButton.click();

                setTimeout(() => {
                    joinButton.style.backgroundColor = originalBackground;
                    joinButton.style.border = originalBorder;
                }, 1000);

                updateStatus('Successfully clicked Join Now button!', 'success');
                console.log('[Yiya Auto Joiner] Successfully clicked Join Now button!');
                if (isRunning) {
                    console.log('[Yiya Auto Joiner] Auto stopping after successful click');
                    stopAutoJoin();
                }
            }, 500);

            return true;
        }

        updateStatus(`Searching for Join Now button... (Attempt ${attemptCount})`, 'info');
        return false;
    }

    // Initialize the script when page is fully loaded
    window.addEventListener('load', () => {
        console.log('[Yiya Auto Joiner] Script initialized, creating control panel...');
        setTimeout(createControlPanel, 1000);
    });
})();
