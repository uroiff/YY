// ==UserScript==
// @name     	Harmony Box Auto-Purchase
// @namespace	http://tampermonkey.net/
// @version  	7.0
// @description  Automatically find and purchase Harmony Boxes between specified price thresholds
// @author   	You
// @match    	*://*.yiya.gg/*
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
	let statusBlinkInterval = null; // For blinking status indicator

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
    	// Skip if we're already in the process of purchasing or if bot is inactive
    	if (attemptingPurchase || !botActive) return;

    	// Reset popup retry counter whenever we start a new purchase attempt
    	popupRetryCount = 0;

    	console.log("Scanning for Harmony boxes within threshold range...");
    	updateStatus(`Đang quét hộp từ ${MIN_PRICE_THRESHOLD} đến ${MAX_PRICE_THRESHOLD}...`);

    	// Step 1: Find all price elements on the page
    	const priceElements = document.querySelectorAll('.text-brand-primary.text-heading-14-bold');

    	if (priceElements.length === 0) {
        	console.log("No price elements found");
        	updateStatus("Không tìm thấy thông tin giá");
        	return;
    	}

    	// Find the maximum price within threshold range and its associated element
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

    	// Find the closest "Add to Cart" button to this price element
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

    	// Click the Add to Cart button
    	console.log("Clicking Add to Cart button...");
    	updateStatus("Đang nhấp nút thêm vào giỏ hàng...");
    	attemptingPurchase = true;
    	addToCartButton.click();

    	// Step 2: Handle the popup that appears after clicking Add to Cart
    	setTimeout(handlePopup, 300);
	}

	// Function to handle the popup after clicking Add to Cart
	function handlePopup() {
    	// Find the Add to Cart button in the popup
    	const popupAddToCartButton = document.querySelector('.popup-buy-cart--content .btn-common--text');

    	if (!popupAddToCartButton) {
        	popupRetryCount++;
        	console.log(`Popup Add to Cart button not found yet, retry attempt ${popupRetryCount} of 3...`);
        	updateStatus(`Đang tìm nút popup, lần thử ${popupRetryCount}...`);

        	if (popupRetryCount >= 2) {
            	// After 2 attempts, reset and return to the beginning
            	console.log("Failed to find popup button after 2 attempts. Resetting...");
            	updateStatus("Không tìm thấy nút popup. Đang đặt lại...");
            	attemptingPurchase = false;
            	return; // Return to the main loop instead of retrying
        	} else {
            	// Retry if less than 2 attempts
            	setTimeout(handlePopup, 300);
            	return;
        	}
    	}

    	// Reset counter on success
    	popupRetryCount = 0;

    	// Click the Add to Cart button in the popup
    	console.log("Clicking popup Add to Cart button...");
    	updateStatus("Đang nhấp nút thêm vào giỏ hàng trên popup...");
    	popupAddToCartButton.click();

    	// Reset the purchase attempt flag after a short delay
    	setTimeout(() => {
        	attemptingPurchase = false;
        	console.log("Purchase cycle completed, waiting for next scan");
        	updateStatus("Chu kỳ mua hoàn tất, đang chờ lần quét tiếp theo");
    	}, 2000);
	}

	// Function to update the status display
	function updateStatus(message) {
    	const statusText = document.getElementById('harmony-bot-status');
    	if (statusText) {
        	statusText.textContent = message;
    	}
	}

	// Function to update the timer display
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

	// Function to start the bot
	function startBot() {
    	if (botActive) return;

    	botActive = true;
    	startTime = new Date();
    	checkInterval = setInterval(findAndPurchaseBox, CHECK_INTERVAL);
    	timerInterval = setInterval(updateTimer, 1000);

    	// Update UI to reflect active state
    	const startButton = document.getElementById('harmony-bot-start');
    	const stopButton = document.getElementById('harmony-bot-stop');

    	if (startButton) startButton.disabled = true;
    	if (stopButton) stopButton.disabled = false;

    	// Update status indicator
    	updateStatusIndicator();

    	console.log("Bot started");
    	updateStatus("Bot đang hoạt động và quét");
	}

	// Function to stop the bot
	function stopBot() {
    	if (!botActive) return;

    	botActive = false;
    	clearInterval(checkInterval);
    	clearInterval(timerInterval);
    	checkInterval = null;

    	// Update UI to reflect inactive state
    	const startButton = document.getElementById('harmony-bot-start');
    	const stopButton = document.getElementById('harmony-bot-stop');

    	if (startButton) startButton.disabled = false;
    	if (stopButton) stopButton.disabled = true;

    	// Update status indicator
    	updateStatusIndicator();

    	console.log("Bot stopped");
    	updateStatus("Bot đã dừng");
	}

	// Function to save the threshold values
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
        	// Reset inputs to current values
        	minThresholdInput.value = MIN_PRICE_THRESHOLD;
        	maxThresholdInput.value = MAX_PRICE_THRESHOLD;
    	}
	}

	// Function to minimize the control panel
	function minimizePanel() {
    	const controlPanel = document.getElementById('harmony-bot-panel');
    	const minimizeButton = document.getElementById('harmony-bot-minimize');
    	const panelContent = document.getElementById('harmony-bot-content');
    	const restoreButton = document.getElementById('harmony-bot-restore');

    	if (!controlPanel || !minimizeButton || !panelContent || !restoreButton) return;

    	// Hide the panel content and minimize button
    	panelContent.style.display = 'none';
    	minimizeButton.style.display = 'none';

    	// Show the restore button
    	restoreButton.style.display = 'block';

    	// Reduce the panel size
    	controlPanel.style.width = '40px';
    	controlPanel.style.height = '40px';

    	// Update the minimized state
    	panelMinimized = true;
    	saveSettings();

    	console.log("Panel minimized");
	}

	// Function to restore the control panel
	function restorePanel() {
    	const controlPanel = document.getElementById('harmony-bot-panel');
    	const minimizeButton = document.getElementById('harmony-bot-minimize');
    	const panelContent = document.getElementById('harmony-bot-content');
    	const restoreButton = document.getElementById('harmony-bot-restore');

    	if (!controlPanel || !minimizeButton || !panelContent || !restoreButton) return;

    	// Show the panel content and minimize button
    	panelContent.style.display = 'block';
    	minimizeButton.style.display = 'block';

    	// Hide the restore button
    	restoreButton.style.display = 'none';

    	// Restore the panel size
    	controlPanel.style.width = '250px';
    	controlPanel.style.height = 'auto';

    	// Update the minimized state
    	panelMinimized = false;
    	saveSettings();

    	console.log("Panel restored");
	}

	// Create and add the control panel to the page
	function createControlPanel() {
    	// Create the control panel container
    	const controlPanel = document.createElement('div');
    	controlPanel.id = 'harmony-bot-panel';
    	controlPanel.style.position = 'fixed';
    	controlPanel.style.bottom = '10px';
    	controlPanel.style.right = '10px';
    	controlPanel.style.backgroundColor = 'rgba(40, 40, 40, 0.9)';
    	controlPanel.style.color = '#fff';
    	controlPanel.style.padding = '15px';
    	controlPanel.style.borderRadius = '8px';
    	controlPanel.style.zIndex = '9999';
    	controlPanel.style.width = '250px';
    	controlPanel.style.fontFamily = 'Arial, sans-serif';
    	controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    	controlPanel.style.transition = 'width 0.3s, height 0.3s'; // Add smooth transition

    	// Create header with title and minimize button
    	const header = document.createElement('div');
    	header.style.display = 'flex';
    	header.style.justifyContent = 'space-between';
    	header.style.alignItems = 'center';
    	header.style.marginBottom = '10px';

    	// Create the title
    	const title = document.createElement('div');
    	title.style.fontWeight = 'bold';
    	title.style.fontSize = '16px';
    	title.textContent = 'YiYa Tự Động Mua Hàng';
    	header.appendChild(title);

    	// Create minimize button
    	const minimizeButton = document.createElement('button');
    	minimizeButton.id = 'harmony-bot-minimize';
    	minimizeButton.innerHTML = '&#8722;'; // Minus symbol
    	minimizeButton.style.background = 'transparent';
    	minimizeButton.style.border = 'none';
    	minimizeButton.style.color = '#ffffff';
    	minimizeButton.style.fontSize = '20px';
    	minimizeButton.style.cursor = 'pointer';
    	minimizeButton.style.padding = '0 5px';
    	minimizeButton.title = 'Thu nhỏ';
    	minimizeButton.addEventListener('click', minimizePanel);
    	header.appendChild(minimizeButton);

    	controlPanel.appendChild(header);

    	// Create restore button (initially hidden)
    	const restoreButton = document.createElement('button');
    	restoreButton.id = 'harmony-bot-restore';
    	restoreButton.innerHTML = '&#43;'; // Plus symbol
    	restoreButton.style.background = 'transparent';
    	restoreButton.style.border = 'none';
    	restoreButton.style.color = '#ffffff';
    	restoreButton.style.fontSize = '20px';
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

    	// Create content container
    	const contentContainer = document.createElement('div');
    	contentContainer.id = 'harmony-bot-content';

    	// Create threshold inputs section
    	const thresholdSection = document.createElement('div');
    	thresholdSection.style.marginBottom = '15px';

    	// Minimum price threshold
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

    	// Maximum price threshold
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

    	// Create save button below input fields
    	const saveButton = document.createElement('button');
    	saveButton.textContent = 'Lưu';
    	saveButton.style.width = '100%';
    	saveButton.style.padding = '8px';
    	saveButton.style.backgroundColor = '#2196F3'; // Blue color
    	saveButton.style.color = 'white';
    	saveButton.style.border = 'none';
    	saveButton.style.borderRadius = '4px';
    	saveButton.style.cursor = 'pointer';
    	saveButton.style.marginBottom = '15px';
    	saveButton.addEventListener('click', saveThresholds);
    	thresholdSection.appendChild(saveButton);

    	contentContainer.appendChild(thresholdSection);

    	// Create start/stop buttons
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
    	stopButton.disabled = true; // Initially disabled
    	stopButton.addEventListener('click', stopBot);
    	buttonSection.appendChild(stopButton);

    	contentContainer.appendChild(buttonSection);

    	// Create timer display
    	const timer = document.createElement('div');
    	timer.id = 'harmony-bot-timer';
    	timer.textContent = 'Thời gian chạy: 00:00:00';
    	timer.style.marginBottom = '10px';
    	timer.style.textAlign = 'center';
    	timer.style.fontSize = '14px';
    	contentContainer.appendChild(timer);

    	// Create status display
    	const status = document.createElement('div');
    	status.id = 'harmony-bot-status';
    	status.textContent = 'Bot không hoạt động';
    	status.style.textAlign = 'center';
    	status.style.padding = '10px';
    	status.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    	status.style.borderRadius = '4px';
    	status.style.fontSize = '14px';
    	contentContainer.appendChild(status);

    	// Add a drag handle and make panel draggable
    	const dragHandle = document.createElement('div');
    	dragHandle.style.cursor = 'move';
    	dragHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    	dragHandle.style.height = '5px';
    	dragHandle.style.width = '40px';
    	dragHandle.style.borderRadius = '5px';
    	dragHandle.style.margin = '0 auto';
    	dragHandle.style.marginTop = '10px';
    	contentContainer.appendChild(dragHandle);

    	// Add content container to the panel
    	controlPanel.appendChild(contentContainer);

    	// Add panel to the page
    	document.body.appendChild(controlPanel);

    	// Make the panel draggable
    	makeDraggable(controlPanel, dragHandle);

    	// Apply minimized state if saved
    	if (panelMinimized) {
        	minimizePanel();
    	}
	}

	// Function to update bot status indicator
	function updateStatusIndicator() {
    	const statusIndicator = document.getElementById('harmony-bot-status-indicator');
    	const minimizedStatusIndicator = document.getElementById('harmony-bot-minimized-status');

    	if (!statusIndicator || !minimizedStatusIndicator) return;

    	if (botActive) {
        	// Set green color for active bot
        	statusIndicator.style.backgroundColor = '#4CAF50';
        	minimizedStatusIndicator.style.backgroundColor = '#4CAF50';

        	// Create blinking effect
        	if (statusBlinkInterval) clearInterval(statusBlinkInterval);
        	statusBlinkInterval = setInterval(() => {
            	const currentOpacity = parseFloat(statusIndicator.style.opacity);
            	const newOpacity = currentOpacity === 1 ? 0.3 : 1;
            	statusIndicator.style.opacity = newOpacity;
            	minimizedStatusIndicator.style.opacity = newOpacity;
        	}, 800);
    	} else {
        	// Set red color for inactive bot
        	statusIndicator.style.backgroundColor = '#f44336';
        	minimizedStatusIndicator.style.backgroundColor = '#f44336';

        	// Stop blinking effect
        	if (statusBlinkInterval) {
            	clearInterval(statusBlinkInterval);
            	statusBlinkInterval = null;
        	}

        	// Reset opacity
        	statusIndicator.style.opacity = 1;
        	minimizedStatusIndicator.style.opacity = 1;
    	}
	}

	// Initialize the script
	function initialize() {
    	console.log("Harmony Box Auto-Purchase script initialized");

    	// Load saved settings
    	loadSettings();

    	// Create the control panel
    	createControlPanel();

    	console.log(`Default thresholds set to ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);
	}

	// Wait for the page to fully load before initializing
	window.addEventListener('load', initialize);
})();
