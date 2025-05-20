// ==UserScript==
// @name     	Harmony Box Auto-Purchase
// @namespace	http://tampermonkey.net/
// @version  	3.0
// @description  Automatically find and purchase Harmony Boxes above a specified price threshold
// @author   	You
// @match    	*://*.yiya.gg/*
// @grant    	none
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @downloadURL https://github.com/trungduy17/telebot/raw/main/yy_autocart.user.js
// @updateURL   https://github.com/trungduy17/telebot/raw/main/yy_autocart.user.js
// @grant       GM.xmlHttpRequest
// @grant       GM.registerMenuCommand
// @run-at       ocument-start
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    let MIN_PRICE_THRESHOLD = 150.00; // Default minimum price threshold
    let MAX_PRICE_THRESHOLD = 500.00; // Default maximum price threshold
    let MAX_CAPITAL = 1000.00; // Default maximum capital after 3 boxes
    const CHECK_INTERVAL = 500; // How often to check for items (milliseconds)
    const MAX_BOXES_TO_ADD = 3; // Maximum number of boxes to add to cart

    // Global variables
    let attemptingPurchase = false;
    let popupRetryCount = 0; // Counter for popup retry attempts
    let botActive = false; // Bot status flag
    let checkInterval = null; // Store interval ID for start/stop functionality
    let startTime = null; // To track when the bot was started
    let timerInterval = null; // For updating the timer display
    let boxesAddedToCart = 0; // Counter for boxes added to cart
    let currentCapitalSpent = 0; // Track how much capital has been spent

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('harmonyBotMinThreshold', MIN_PRICE_THRESHOLD);
        localStorage.setItem('harmonyBotMaxThreshold', MAX_PRICE_THRESHOLD);
        localStorage.setItem('harmonyBotMaxCapital', MAX_CAPITAL);
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

        const savedMaxCapital = localStorage.getItem('harmonyBotMaxCapital');
        if (savedMaxCapital !== null) {
            MAX_CAPITAL = parseFloat(savedMaxCapital);
        }
    }

    // Main function to find and purchase boxes
    function findAndPurchaseBox() {
        // Skip if we're already in the process of purchasing or if bot is inactive
        if (attemptingPurchase || !botActive) return;

        // Check if we've already added the maximum number of boxes
        if (boxesAddedToCart >= MAX_BOXES_TO_ADD) {
            console.log(`Maximum number of boxes (${MAX_BOXES_TO_ADD}) already added to cart`);
            updateStatus(`Maximum boxes (${MAX_BOXES_TO_ADD}) added to cart`);
            stopBot(); // Auto-stop the bot
            return;
        }

        // Reset popup retry counter whenever we start a new purchase attempt
        popupRetryCount = 0;

        console.log("Scanning for Harmony boxes above threshold...");
        updateStatus(`Scanning for boxes: ${MIN_PRICE_THRESHOLD} - ${MAX_PRICE_THRESHOLD}`);

        // Step 1: Find all price elements on the page
        const priceElements = document.querySelectorAll('.text-brand-primary.text-heading-14-bold');

        if (priceElements.length === 0) {
            console.log("No price elements found");
            updateStatus("No price elements found");
            return;
        }

        // Find the maximum price above threshold but below max threshold
        let maxPrice = 0;
        let maxPriceElement = null;

        priceElements.forEach(element => {
            const priceText = element.textContent.trim();
            const price = parseFloat(priceText);

            // Check if price is within our desired range and better than previous found
            if (!isNaN(price) &&
                price >= MIN_PRICE_THRESHOLD &&
                price <= MAX_PRICE_THRESHOLD &&
                price > maxPrice &&
                (currentCapitalSpent + price) <= MAX_CAPITAL) {
                maxPrice = price;
                maxPriceElement = element;
            }
        });

        if (!maxPriceElement) {
            const capitalRemaining = MAX_CAPITAL - currentCapitalSpent;
            console.log(`No suitable box found in range ${MIN_PRICE_THRESHOLD}-${MAX_PRICE_THRESHOLD} with capital limit ${capitalRemaining}`);
            updateStatus(`No suitable box found (Capital left: ${capitalRemaining.toFixed(2)})`);
            return;
        }

        console.log(`Found Harmony box with price: ${maxPrice}`);
        updateStatus(`Found box: ${maxPrice} (${boxesAddedToCart + 1}/${MAX_BOXES_TO_ADD})`);

        // Find the closest "Add to Cart" button to this price element
        const cardItem = maxPriceElement.closest('.card-item-buy');
        if (!cardItem) {
            console.log("Could not find the associated card item");
            updateStatus("Could not find the associated card item");
            return;
        }

        const addToCartButton = cardItem.querySelector('.btn-common--text');
        if (!addToCartButton) {
            console.log("Could not find Add to Cart button");
            updateStatus("Could not find Add to Cart button");
            return;
        }

        // Click the Add to Cart button
        console.log("Clicking Add to Cart button...");
        updateStatus("Clicking Add to Cart button...");
        attemptingPurchase = true;
        addToCartButton.click();

        // Step 2: Handle the popup that appears after clicking Add to Cart
        setTimeout(() => handlePopup(maxPrice), 300);
    }

    // Function to handle the popup after clicking Add to Cart
    function handlePopup(price) {
        // Find the Add to Cart button in the popup
        const popupAddToCartButton = document.querySelector('.popup-buy-cart--content .btn-common--text');

        if (!popupAddToCartButton) {
            popupRetryCount++;
            console.log(`Popup Add to Cart button not found yet, retry attempt ${popupRetryCount} of 3...`);
            updateStatus(`Looking for popup button, attempt ${popupRetryCount}...`);

            if (popupRetryCount >= 2) {
                // After 2 attempts, reset and return to the beginning
                console.log("Failed to find popup button after 2 attempts. Resetting...");
                updateStatus("Failed to find popup button. Resetting...");
                attemptingPurchase = false;
                return; // Return to the main loop instead of retrying
            } else {
                // Retry if less than 2 attempts
                setTimeout(() => handlePopup(price), 300);
                return;
            }
        }

        // Reset counter on success
        popupRetryCount = 0;

        // Click the Add to Cart button in the popup
        console.log("Clicking popup Add to Cart button...");
        updateStatus("Clicking popup Add to Cart button...");
        popupAddToCartButton.click();

        // Update counters on successful purchase
        boxesAddedToCart++;
        currentCapitalSpent += price;

        // Update capital display
        updateCapitalDisplay();

        // Reset the purchase attempt flag after a short delay
        setTimeout(() => {
            attemptingPurchase = false;
            console.log(`Purchase cycle completed (${boxesAddedToCart}/${MAX_BOXES_TO_ADD}), capital used: ${currentCapitalSpent.toFixed(2)}`);
            updateStatus(`Box ${boxesAddedToCart}/${MAX_BOXES_TO_ADD} added (Capital used: ${currentCapitalSpent.toFixed(2)})`);

            // If we've reached the max boxes, stop the bot
            if (boxesAddedToCart >= MAX_BOXES_TO_ADD) {
                console.log("Maximum number of boxes added to cart. Stopping bot.");
                updateStatus(`Maximum boxes (${MAX_BOXES_TO_ADD}) added. Stopping.`);
                stopBot();
            }
        }, 1000);
    }

    // Update the capital display
    function updateCapitalDisplay() {
        const capitalDisplay = document.getElementById('harmony-bot-capital');
        if (capitalDisplay) {
            const capitalRemaining = MAX_CAPITAL - currentCapitalSpent;
            capitalDisplay.textContent = `Capital: ${currentCapitalSpent.toFixed(2)} / ${MAX_CAPITAL.toFixed(2)} (${capitalRemaining.toFixed(2)} remaining)`;
        }
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

        timerElement.textContent = `Running time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Function to start the bot
    function startBot() {
        if (botActive) return;

        // Reset counters when starting
        boxesAddedToCart = 0;
        currentCapitalSpent = 0;
        updateCapitalDisplay();

        botActive = true;
        startTime = new Date();
        checkInterval = setInterval(findAndPurchaseBox, CHECK_INTERVAL);
        timerInterval = setInterval(updateTimer, 1000);

        // Update UI to reflect active state
        const startButton = document.getElementById('harmony-bot-start');
        const stopButton = document.getElementById('harmony-bot-stop');

        if (startButton) startButton.disabled = true;
        if (stopButton) stopButton.disabled = false;

        console.log("Bot started");
        updateStatus("Bot active and scanning");
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

        console.log("Bot stopped");
        updateStatus("Bot stopped");
    }

    // Function to save the settings values
    function saveThresholds() {
        const minThresholdInput = document.getElementById('harmony-bot-min-threshold');
        const maxThresholdInput = document.getElementById('harmony-bot-max-threshold');
        const maxCapitalInput = document.getElementById('harmony-bot-max-capital');

        if (!minThresholdInput || !maxThresholdInput || !maxCapitalInput) return;

        const newMinThreshold = parseFloat(minThresholdInput.value);
        const newMaxThreshold = parseFloat(maxThresholdInput.value);
        const newMaxCapital = parseFloat(maxCapitalInput.value);

        let isValid = true;
        let errorMessage = "";

        // Validate min threshold
        if (isNaN(newMinThreshold) || newMinThreshold <= 0) {
            isValid = false;
            errorMessage = "Invalid minimum price value";
        }

        // Validate max threshold
        else if (isNaN(newMaxThreshold) || newMaxThreshold <= newMinThreshold) {
            isValid = false;
            errorMessage = "Max price must be greater than min price";
        }

        // Validate max capital
        else if (isNaN(newMaxCapital) || newMaxCapital <= 0) {
            isValid = false;
            errorMessage = "Invalid maximum capital value";
        }

        if (isValid) {
            MIN_PRICE_THRESHOLD = newMinThreshold;
            MAX_PRICE_THRESHOLD = newMaxThreshold;
            MAX_CAPITAL = newMaxCapital;
            saveSettings();
            console.log(`Settings updated: Min=${MIN_PRICE_THRESHOLD}, Max=${MAX_PRICE_THRESHOLD}, Capital=${MAX_CAPITAL}`);
            updateStatus(`Settings saved successfully`);
            updateCapitalDisplay();
        } else {
            console.log(errorMessage);
            updateStatus(errorMessage);
            // Reset inputs to current values
            minThresholdInput.value = MIN_PRICE_THRESHOLD;
            maxThresholdInput.value = MAX_PRICE_THRESHOLD;
            maxCapitalInput.value = MAX_CAPITAL;
        }
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
        controlPanel.style.width = '280px';
        controlPanel.style.fontFamily = 'Arial, sans-serif';
        controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

        // Create the title
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        title.textContent = 'YiYa AutoCart';
        controlPanel.appendChild(title);

        // Create min threshold input section
        const minThresholdSection = document.createElement('div');
        minThresholdSection.style.marginBottom = '10px';

        const minThresholdLabel = document.createElement('label');
        minThresholdLabel.textContent = 'Min Price';
        minThresholdLabel.style.display = 'block';
        minThresholdLabel.style.marginBottom = '5px';
        minThresholdLabel.style.color = '#ffffff';
        minThresholdSection.appendChild(minThresholdLabel);

        // Create min threshold input field
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
        minThresholdSection.appendChild(minThresholdInput);

        controlPanel.appendChild(minThresholdSection);

        // Create max threshold input section
        const maxThresholdSection = document.createElement('div');
        maxThresholdSection.style.marginBottom = '10px';

        const maxThresholdLabel = document.createElement('label');
        maxThresholdLabel.textContent = 'Max Price';
        maxThresholdLabel.style.display = 'block';
        maxThresholdLabel.style.marginBottom = '5px';
        maxThresholdLabel.style.color = '#ffffff';
        maxThresholdSection.appendChild(maxThresholdLabel);

        // Create max threshold input field
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
        maxThresholdSection.appendChild(maxThresholdInput);

        controlPanel.appendChild(maxThresholdSection);

        // Create max capital input section
        const maxCapitalSection = document.createElement('div');
        maxCapitalSection.style.marginBottom = '10px';

        const maxCapitalLabel = document.createElement('label');
        maxCapitalLabel.textContent = 'Max Capital (3 boxes)';
        maxCapitalLabel.style.display = 'block';
        maxCapitalLabel.style.marginBottom = '5px';
        maxCapitalLabel.style.color = '#ffffff';
        maxCapitalSection.appendChild(maxCapitalLabel);

        // Create max capital input field
        const maxCapitalInput = document.createElement('input');
        maxCapitalInput.id = 'harmony-bot-max-capital';
        maxCapitalInput.type = 'number';
        maxCapitalInput.min = '0';
        maxCapitalInput.step = '0.01';
        maxCapitalInput.value = MAX_CAPITAL;
        maxCapitalInput.style.width = '100%';
        maxCapitalInput.style.padding = '5px';
        maxCapitalInput.style.borderRadius = '4px';
        maxCapitalInput.style.border = '1px solid #ccc';
        maxCapitalInput.style.backgroundColor = '#ffffff';
        maxCapitalInput.style.color = '#000000';
        maxCapitalInput.style.fontWeight = 'bold';
        maxCapitalInput.style.fontSize = '16px';
        maxCapitalInput.style.boxSizing = 'border-box';
        maxCapitalInput.style.marginBottom = '10px';
        maxCapitalSection.appendChild(maxCapitalInput);

        controlPanel.appendChild(maxCapitalSection);

        // Create save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Settings';
        saveButton.style.width = '100%';
        saveButton.style.padding = '8px';
        saveButton.style.backgroundColor = '#2196F3'; // Blue color
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.marginBottom = '15px';
        saveButton.addEventListener('click', saveThresholds);
        controlPanel.appendChild(saveButton);

        // Create start/stop buttons
        const buttonSection = document.createElement('div');
        buttonSection.style.display = 'flex';
        buttonSection.style.justifyContent = 'space-between';
        buttonSection.style.marginBottom = '15px';
        buttonSection.style.gap = '10px';

        const startButton = document.createElement('button');
        startButton.id = 'harmony-bot-start';
        startButton.textContent = 'Start Bot';
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
        stopButton.textContent = 'Stop Bot';
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

        controlPanel.appendChild(buttonSection);

        // Create capital display
        const capitalDisplay = document.createElement('div');
        capitalDisplay.id = 'harmony-bot-capital';
        capitalDisplay.textContent = `Capital: 0.00 / ${MAX_CAPITAL.toFixed(2)} (${MAX_CAPITAL.toFixed(2)} remaining)`;
        capitalDisplay.style.marginBottom = '10px';
        capitalDisplay.style.textAlign = 'center';
        capitalDisplay.style.fontSize = '14px';
        controlPanel.appendChild(capitalDisplay);

        // Create timer display
        const timer = document.createElement('div');
        timer.id = 'harmony-bot-timer';
        timer.textContent = 'Running time: 00:00:00';
        timer.style.marginBottom = '10px';
        timer.style.textAlign = 'center';
        timer.style.fontSize = '14px';
        controlPanel.appendChild(timer);

        // Create status display
        const status = document.createElement('div');
        status.id = 'harmony-bot-status';
        status.textContent = 'Bot inactive';
        status.style.textAlign = 'center';
        status.style.padding = '10px';
        status.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        status.style.borderRadius = '4px';
        status.style.fontSize = '14px';
        controlPanel.appendChild(status);

        // Add a drag handle and make panel draggable
        const dragHandle = document.createElement('div');
        dragHandle.style.cursor = 'move';
        dragHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        dragHandle.style.height = '5px';
        dragHandle.style.width = '40px';
        dragHandle.style.borderRadius = '5px';
        dragHandle.style.margin = '0 auto';
        dragHandle.style.marginTop = '10px';
        controlPanel.appendChild(dragHandle);

        // Add panel to the page
        document.body.appendChild(controlPanel);

        // Make the panel draggable
        makeDraggable(controlPanel, dragHandle);
    }

    // Function to make an element draggable
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // Get the initial mouse cursor position
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // Call function whenever the cursor moves
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set the element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto'; // Remove right positioning
            element.style.bottom = 'auto'; // Remove bottom positioning
        }

        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Initialize the script
    function initialize() {
        console.log("Harmony Box Auto-Purchase script initialized");

        // Load saved settings
        loadSettings();

        // Create the control panel
        createControlPanel();

        console.log(`Settings loaded: Min=${MIN_PRICE_THRESHOLD}, Max=${MAX_PRICE_THRESHOLD}, Capital=${MAX_CAPITAL}`);
    }

    // Wait for the page to fully load before initializing
    window.addEventListener('load', initialize);
})();
