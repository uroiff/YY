// ==UserScript==
// @name         Harmony Box Auto-Purchase
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Automatically find and purchase Harmony Boxes between specified price thresholds with UI enhancements
// @author       You
// @match        *://*.yiya.gg/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://github.com/uroiff/YY/raw/refs/heads/main/yy_autocart.user.js
// @updateURL    https://github.com/uroiff/YY/raw/refs/heads/main/yy_autocart.user.js
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    let MIN_PRICE_THRESHOLD = 200.00; // Default minimum price threshold
    let MAX_PRICE_THRESHOLD = 500.00; // Default maximum price threshold
    const CHECK_INTERVAL = 500; // How often to check for items (milliseconds)

    // Global variables
    let attemptingPurchase = false;
    let popupRetryCount = 0; // Counter for popup retry attempts
    let botActive = false; // Bot status flag
    let checkInterval = null; // Store interval ID for start/stop functionality
    let startTime = null; // To track when the bot was started
    let timerInterval = null; // For updating the timer display
    let panelMinimized = false; // Track panel minimize state
    let minimizedStatusBlinkInterval = null; // For blinking status indicator when panel is minimized

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('harmonyBotMinThreshold', MIN_PRICE_THRESHOLD);
        localStorage.setItem('harmonyBotMaxThreshold', MAX_PRICE_THRESHOLD);
        localStorage.setItem('harmonyBotMinimized', panelMinimized);
    }

    // Load settings from localStorage
    function loadSettings() {
        const savedMinThreshold = localStorage.getItem('harmonyBotMinThreshold');
        if (savedMinThreshold !== null) {
            MIN_PRICE_THRESHOLD = parseFloat(savedMinThreshold);
        }

        const savedMaxThreshold = localStorage.getItem('harmonyBotMaxThreshold');
        if (savedMaxThreshold !== null) {
            MAX_PRICE_THRESHOLD = parseFloat(savedMaxThreshold);
        }

        const savedMinimizedState = localStorage.getItem('harmonyBotMinimized');
        if (savedMinimizedState !== null) {
            panelMinimized = savedMinimizedState === 'true';
        }
    }

    // Main function to find and purchase boxes
    function findAndPurchaseBox() {
        if (attemptingPurchase || !botActive) return;
        popupRetryCount = 0;
        console.log("Scanning for Harmony boxes within threshold range...");
        updateStatus(`Đang quét hộp từ ${MIN_PRICE_THRESHOLD} đến ${MAX_PRICE_THRESHOLD}...`);
        const priceElements = document.querySelectorAll('.text-brand-primary.text-heading-14-bold');
        if (priceElements.length === 0) {
            console.log("No price elements found");
            updateStatus("Không tìm thấy thông tin giá");
            return;
        }
        let maxPrice = 0;
        let maxPriceElement = null;
        priceElements.forEach(element => {
            const priceText = element.textContent.trim();
            const price = parseFloat(priceText);
            if (!isNaN(price) && price >= MIN_PRICE_THRESHOLD && price <= MAX_PRICE_THRESHOLD && price > maxPrice) {
                maxPrice = price;
                maxPriceElement = element;
            }
        });
        if (!maxPriceElement) {
            console.log(`No Harmony box found within the threshold range of ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
            updateStatus(`Không tìm thấy hộp trong khoảng ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
            return;
        }
        console.log(`Found Harmony box with price: ${maxPrice}`);
        updateStatus(`Đã tìm thấy hộp giá: ${maxPrice}`);
        const cardItem = maxPriceElement.closest('.card-item-buy');
        if (!cardItem) {
            console.log("Could not find the associated card item");
            updateStatus("Không tìm thấy thẻ sản phẩm");
            return;
        }
        const addToCartButton = cardItem.querySelector('.btn-common--text');
        if (!addToCartButton) {
            console.log("Could not find Add to Cart button");
            updateStatus("Không tìm thấy nút thêm vào giỏ hàng");
            return;
        }
        console.log("Clicking Add to Cart button...");
        updateStatus("Đang nhấp nút thêm vào giỏ hàng...");
        attemptingPurchase = true;
        addToCartButton.click();
        setTimeout(handlePopup, 300);
    }

    function handlePopup() {
        const popupAddToCartButton = document.querySelector('.popup-buy-cart--content .btn-common--text');
        if (!popupAddToCartButton) {
            popupRetryCount++;
            console.log(`Popup Add to Cart button not found yet, retry attempt ${popupRetryCount} of 3...`);
            updateStatus(`Đang tìm nút popup, lần thử ${popupRetryCount}...`);
            if (popupRetryCount >= 2) {
                console.log("Failed to find popup button after 2 attempts. Resetting...");
                updateStatus("Không tìm thấy nút popup. Đang đặt lại...");
                attemptingPurchase = false;
                return;
            } else {
                setTimeout(handlePopup, 300);
                return;
            }
        }
        popupRetryCount = 0;
        console.log("Clicking popup Add to Cart button...");
        updateStatus("Đang nhấp nút thêm vào giỏ hàng trên popup...");
        popupAddToCartButton.click();
        setTimeout(() => {
            attemptingPurchase = false;
            console.log("Purchase cycle completed, waiting for next scan");
            updateStatus("Chu kỳ mua hoàn tất, đang chờ lần quét tiếp theo");
        }, 2000);
    }

    function updateStatus(message) {
        const statusText = document.getElementById('harmony-bot-status');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    function updateTimer() {
        if (!startTime || !botActive) return;
        const timerElement = document.getElementById('harmony-bot-timer');
        if (!timerElement) return;
        const currentTime = new Date();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000); // in seconds
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = elapsedTime % 60;
        timerElement.textContent = `Thời gian chạy: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function manageMinimizedStatusIcon() {
        const icon = document.getElementById('harmony-bot-minimized-status-icon');
        if (!icon) return;

        if (panelMinimized) {
            icon.style.display = 'block';
            if (minimizedStatusBlinkInterval) {
                clearInterval(minimizedStatusBlinkInterval);
                minimizedStatusBlinkInterval = null;
            }
            icon.style.opacity = '1'; // Reset opacity

            if (botActive) {
                icon.style.backgroundColor = 'green';
                minimizedStatusBlinkInterval = setInterval(() => {
                    icon.style.opacity = icon.style.opacity === '1' ? '0.2' : '1';
                }, 500);
            } else {
                icon.style.backgroundColor = 'red';
                // Solid red, no blinking
            }
        } else {
            icon.style.display = 'none';
            if (minimizedStatusBlinkInterval) {
                clearInterval(minimizedStatusBlinkInterval);
                minimizedStatusBlinkInterval = null;
            }
        }
    }

    function startBot() {
        if (botActive) return;
        botActive = true;
        startTime = new Date();
        checkInterval = setInterval(findAndPurchaseBox, CHECK_INTERVAL);
        timerInterval = setInterval(updateTimer, 1000);
        const startButton = document.getElementById('harmony-bot-start');
        const stopButton = document.getElementById('harmony-bot-stop');
        if (startButton) startButton.disabled = true;
        if (stopButton) stopButton.disabled = false;
        manageMinimizedStatusIcon(); // Update minimized icon if panel is minimized
        console.log("Bot started");
        updateStatus("Bot đang hoạt động và quét");
    }

    function stopBot() {
        if (!botActive) return;
        botActive = false;
        clearInterval(checkInterval);
        clearInterval(timerInterval);
        checkInterval = null;
        const startButton = document.getElementById('harmony-bot-start');
        const stopButton = document.getElementById('harmony-bot-stop');
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
        manageMinimizedStatusIcon(); // Update minimized icon if panel is minimized
        console.log("Bot stopped");
        updateStatus("Bot đã dừng");
    }

    function saveThresholds() {
        const minThresholdInput = document.getElementById('harmony-bot-min-threshold');
        const maxThresholdInput = document.getElementById('harmony-bot-max-threshold');
        if (!minThresholdInput || !maxThresholdInput) return;
        const newMinThreshold = parseFloat(minThresholdInput.value);
        const newMaxThreshold = parseFloat(maxThresholdInput.value);
        if (!isNaN(newMinThreshold) && !isNaN(newMaxThreshold) &&
            newMinThreshold > 0 && newMaxThreshold > 0 &&
            newMinThreshold < newMaxThreshold) {
            MIN_PRICE_THRESHOLD = newMinThreshold;
            MAX_PRICE_THRESHOLD = newMaxThreshold;
            saveSettings();
            console.log(`Thresholds updated to ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
            updateStatus(`Đã cập nhật khoảng giá: ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
        } else {
            console.log("Invalid threshold values");
            updateStatus("Giá trị không hợp lệ");
            minThresholdInput.value = MIN_PRICE_THRESHOLD;
            maxThresholdInput.value = MAX_PRICE_THRESHOLD;
        }
    }

    function minimizePanel() {
        const controlPanel = document.getElementById('harmony-bot-panel');
        const minimizeButton = document.getElementById('harmony-bot-minimize');
        const panelContent = document.getElementById('harmony-bot-content');
        const restoreButton = document.getElementById('harmony-bot-restore');
        const titleElement = document.getElementById('harmony-bot-panel-title');

        if (!controlPanel || !minimizeButton || !panelContent || !restoreButton || !titleElement) return;

        panelContent.style.display = 'none';
        minimizeButton.style.display = 'none';
        if (titleElement) titleElement.style.display = 'none'; // Hide title

        restoreButton.style.display = 'block';
        controlPanel.style.width = '40px';
        controlPanel.style.height = '40px';
        panelMinimized = true;
        saveSettings();
        manageMinimizedStatusIcon(); // Show and update minimized icon
        console.log("Panel minimized");
    }

    function restorePanel() {
        const controlPanel = document.getElementById('harmony-bot-panel');
        const minimizeButton = document.getElementById('harmony-bot-minimize');
        const panelContent = document.getElementById('harmony-bot-content');
        const restoreButton = document.getElementById('harmony-bot-restore');
        const titleElement = document.getElementById('harmony-bot-panel-title');

        if (!controlPanel || !minimizeButton || !panelContent || !restoreButton || !titleElement) return;

        panelContent.style.display = 'block';
        minimizeButton.style.display = 'block';
        if (titleElement) titleElement.style.display = 'block'; // Show title

        restoreButton.style.display = 'none';
        controlPanel.style.width = '250px';
        controlPanel.style.height = 'auto';
        panelMinimized = false;
        saveSettings();
        manageMinimizedStatusIcon(); // Hide minimized icon
        console.log("Panel restored");
    }

    function createControlPanel() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'harmony-bot-panel';
        controlPanel.style.position = 'fixed';
        controlPanel.style.top = '10px';
        controlPanel.style.right = '10px';
        controlPanel.style.backgroundColor = 'rgba(40, 40, 40, 0.9)';
        controlPanel.style.color = '#fff';
        controlPanel.style.padding = '15px';
        controlPanel.style.borderRadius = '8px';
        controlPanel.style.zIndex = '9999';
        controlPanel.style.width = '250px';
        controlPanel.style.fontFamily = 'Arial, sans-serif';
        controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        controlPanel.style.transition = 'width 0.3s, height 0.3s';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';

        const title = document.createElement('div');
        title.id = 'harmony-bot-panel-title'; // Added ID for easier access
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        title.textContent = 'YiYa Bot';
        header.appendChild(title);

        const minimizeButton = document.createElement('button');
        minimizeButton.id = 'harmony-bot-minimize';
        minimizeButton.innerHTML = '&#8722;';
        minimizeButton.style.background = 'transparent';
        minimizeButton.style.border = 'none';
        minimizeButton.style.color = '#ffffff';
        minimizeButton.style.fontSize = '40px';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.style.padding = '0 5px';
        minimizeButton.style.margin = '-20px 0px';
        minimizeButton.title = 'Thu nhỏ';
        minimizeButton.addEventListener('click', minimizePanel);
        header.appendChild(minimizeButton);
        controlPanel.appendChild(header);

        const restoreButton = document.createElement('button');
        restoreButton.id = 'harmony-bot-restore';
        restoreButton.innerHTML = '&#43;';
        restoreButton.style.background = 'transparent';
        restoreButton.style.border = 'none';
        restoreButton.style.color = '#ffffff';
        restoreButton.style.fontSize = '40px';
        restoreButton.style.cursor = 'pointer';
        restoreButton.style.padding = '0';
        restoreButton.style.position = 'absolute';
        restoreButton.style.top = '50%';
        restoreButton.style.left = '50%';
        restoreButton.style.transform = 'translate(-50%, -50%)';
        restoreButton.style.display = 'none';
        restoreButton.title = 'Mở rộng';
        restoreButton.addEventListener('click', restorePanel);
        controlPanel.appendChild(restoreButton);

        // Create minimized status icon (initially hidden)
        const minimizedStatusIcon = document.createElement('div');
        minimizedStatusIcon.id = 'harmony-bot-minimized-status-icon';
        minimizedStatusIcon.style.width = '20px';
        minimizedStatusIcon.style.height = '20px';
        minimizedStatusIcon.style.borderRadius = '50%';
        minimizedStatusIcon.style.position = 'absolute';
        minimizedStatusIcon.style.left = '50%';
        minimizedStatusIcon.style.transform = 'translateX(-50%)';
        minimizedStatusIcon.style.bottom = '-30px'; // Positioned above centered restore button
        minimizedStatusIcon.style.display = 'none';
        minimizedStatusIcon.style.transition = 'opacity 0.4s ease-in-out'; // For blink effect
        controlPanel.appendChild(minimizedStatusIcon);

        const contentContainer = document.createElement('div');
        contentContainer.id = 'harmony-bot-content';

        const thresholdSection = document.createElement('div');
        thresholdSection.style.marginBottom = '15px';
        const minThresholdLabel = document.createElement('label');
        minThresholdLabel.textContent = 'Giá tối thiểu';
        minThresholdLabel.style.display = 'block';
        minThresholdLabel.style.marginBottom = '5px';
        minThresholdLabel.style.color = '#ffffff';
        thresholdSection.appendChild(minThresholdLabel);
        const minThresholdInput = document.createElement('input');
        minThresholdInput.id = 'harmony-bot-min-threshold';
        minThresholdInput.type = 'number';
        minThresholdInput.min = '0';
        minThresholdInput.step = '0.01';
        minThresholdInput.value = MIN_PRICE_THRESHOLD;
        minThresholdInput.style.width = '100%';
        minThresholdInput.style.padding = '5px';
        minThresholdInput.style.borderRadius = '4px';
        minThresholdInput.style.border = '1px solid #ccc';
        minThresholdInput.style.backgroundColor = '#ffffff';
        minThresholdInput.style.color = '#000000';
        minThresholdInput.style.fontWeight = 'bold';
        minThresholdInput.style.fontSize = '16px';
        minThresholdInput.style.boxSizing = 'border-box';
        minThresholdInput.style.marginBottom = '10px';
        thresholdSection.appendChild(minThresholdInput);
        const maxThresholdLabel = document.createElement('label');
        maxThresholdLabel.textContent = 'Giá tối đa';
        maxThresholdLabel.style.display = 'block';
        maxThresholdLabel.style.marginBottom = '5px';
        maxThresholdLabel.style.color = '#ffffff';
        thresholdSection.appendChild(maxThresholdLabel);
        const maxThresholdInput = document.createElement('input');
        maxThresholdInput.id = 'harmony-bot-max-threshold';
        maxThresholdInput.type = 'number';
        maxThresholdInput.min = '0';
        maxThresholdInput.step = '0.01';
        maxThresholdInput.value = MAX_PRICE_THRESHOLD;
        maxThresholdInput.style.width = '100%';
        maxThresholdInput.style.padding = '5px';
        maxThresholdInput.style.borderRadius = '4px';
        maxThresholdInput.style.border = '1px solid #ccc';
        maxThresholdInput.style.backgroundColor = '#ffffff';
        maxThresholdInput.style.color = '#000000';
        maxThresholdInput.style.fontWeight = 'bold';
        maxThresholdInput.style.fontSize = '16px';
        maxThresholdInput.style.boxSizing = 'border-box';
        maxThresholdInput.style.marginBottom = '10px';
        thresholdSection.appendChild(maxThresholdInput);
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Lưu';
        saveButton.style.width = '100%';
        saveButton.style.padding = '8px';
        saveButton.style.backgroundColor = '#2196F3';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.marginBottom = '15px';
        saveButton.addEventListener('click', saveThresholds);
        thresholdSection.appendChild(saveButton);
        contentContainer.appendChild(thresholdSection);

        const buttonSection = document.createElement('div');
        buttonSection.style.display = 'flex';
        buttonSection.style.justifyContent = 'space-between';
        buttonSection.style.marginBottom = '15px';
        buttonSection.style.gap = '10px';
        const startButton = document.createElement('button');
        startButton.id = 'harmony-bot-start';
        startButton.textContent = 'Bắt Đầu';
        startButton.style.flex = '1';
        startButton.style.padding = '8px';
        startButton.style.backgroundColor = '#4CAF50';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '4px';
        startButton.style.cursor = 'pointer';
        startButton.addEventListener('click', startBot);
        buttonSection.appendChild(startButton);
        const stopButton = document.createElement('button');
        stopButton.id = 'harmony-bot-stop';
        stopButton.textContent = 'Dừng Lại';
        stopButton.style.flex = '1';
        stopButton.style.padding = '8px';
        stopButton.style.backgroundColor = '#f44336';
        stopButton.style.color = 'white';
        stopButton.style.border = 'none';
        stopButton.style.borderRadius = '4px';
        stopButton.style.cursor = 'pointer';
        stopButton.disabled = true;
        stopButton.addEventListener('click', stopBot);
        buttonSection.appendChild(stopButton);
        contentContainer.appendChild(buttonSection);

        const timer = document.createElement('div');
        timer.id = 'harmony-bot-timer';
        timer.textContent = 'Thời gian chạy: 00:00:00';
        timer.style.marginBottom = '10px';
        timer.style.textAlign = 'center';
        timer.style.fontSize = '14px';
        contentContainer.appendChild(timer);

        const status = document.createElement('div');
        status.id = 'harmony-bot-status';
        status.textContent = 'Bot không hoạt động';
        status.style.textAlign = 'center';
        status.style.padding = '10px';
        status.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        status.style.borderRadius = '4px';
        status.style.fontSize = '14px';
        contentContainer.appendChild(status);

        // Removed drag handle element and makeDraggable call

        controlPanel.appendChild(contentContainer);
        document.body.appendChild(controlPanel);

        if (panelMinimized) {
            minimizePanel(); // This will also handle title and icon visibility
        } else {
            manageMinimizedStatusIcon(); // Ensure icon is correctly hidden if not minimized initially
        }
    }

    function initialize() {
        console.log("Harmony Box Auto-Purchase script initialized");
        loadSettings();
        createControlPanel(); // Panel creation and initial state management
        console.log(`Default thresholds set to ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
        // Initial state of bot is stopped, so icon (if minimized) will be red.
        // Buttons are initialized correctly in createControlPanel.
    }

    window.addEventListener('load', initialize);
})();
