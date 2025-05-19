// ==UserScript==
// @name     	Harmony Box Auto-Purchase
// @namespace	http://tampermonkey.net/
// @version  	2.0
// @description  Automatically find and purchase Harmony Boxes above a specified price threshold
// @author   	You
// @match    	*://*.yiya.gg/*
// @grant    	none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    let MIN_PRICE_THRESHOLD = 200.00; // Default minimum price threshold
    const CHECK_INTERVAL = 500; // How often to check for items (milliseconds)

    // Global variables
    let attemptingPurchase = false;
    let popupRetryCount = 0; // Counter for popup retry attempts
    let botActive = false; // Bot status flag
    let checkInterval = null; // Store interval ID for start/stop functionality
    let startTime = null; // To track when the bot was started
    let timerInterval = null; // For updating the timer display

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('harmonyBotThreshold', MIN_PRICE_THRESHOLD);
    }

    // Load settings from localStorage
    function loadSettings() {
        const savedThreshold = localStorage.getItem('harmonyBotThreshold');
        if (savedThreshold !== null) {
            MIN_PRICE_THRESHOLD = parseFloat(savedThreshold);
        }
    }

    // Main function to find and purchase boxes
    function findAndPurchaseBox() {
        // Skip if we're already in the process of purchasing or if bot is inactive
        if (attemptingPurchase || !botActive) return;

        // Reset popup retry counter whenever we start a new purchase attempt
        popupRetryCount = 0;

        console.log("Scanning for Harmony boxes above threshold...");
        updateStatus(`Scanning for boxes above ${MIN_PRICE_THRESHOLD}...`);

        // Step 1: Find all price elements on the page
        const priceElements = document.querySelectorAll('.text-brand-primary.text-heading-14-bold');

        if (priceElements.length === 0) {
            console.log("No price elements found");
            updateStatus("No price elements found");
            return;
        }

        // Find the maximum price above threshold and its associated element
        let maxPrice = 0;
        let maxPriceElement = null;

        priceElements.forEach(element => {
            const priceText = element.textContent.trim();
            const price = parseFloat(priceText);

            if (!isNaN(price) && price > MIN_PRICE_THRESHOLD && price > maxPrice) {
                maxPrice = price;
                maxPriceElement = element;
            }
        });

        if (!maxPriceElement) {
            console.log(`No Harmony box found above the threshold of ${MIN_PRICE_THRESHOLD}`);
            updateStatus(`No box found above ${MIN_PRICE_THRESHOLD}`);
            return;
        }

        console.log(`Found Harmony box with price: ${maxPrice}`);
        updateStatus(`Found box with price: ${maxPrice}`);

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
        setTimeout(handlePopup, 300);
    }

    // Function to handle the popup after clicking Add to Cart
    function handlePopup() {
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
                setTimeout(handlePopup, 300);
                return;
            }
        }

        // Reset counter on success
        popupRetryCount = 0;

        // Click the Add to Cart button in the popup
        console.log("Clicking popup Add to Cart button...");
        updateStatus("Clicking popup Add to Cart button...");
        popupAddToCartButton.click();

        // Reset the purchase attempt flag after a short delay
        setTimeout(() => {
            attemptingPurchase = false;
            console.log("Purchase cycle completed, waiting for next scan");
            updateStatus("Purchase cycle completed, waiting for next scan");
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

        timerElement.textContent = `Running time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

    // Function to save the threshold value
    function saveThreshold() {
        const thresholdInput = document.getElementById('harmony-bot-threshold');
        if (!thresholdInput) return;

        const newThreshold = parseFloat(thresholdInput.value);
        if (!isNaN(newThreshold) && newThreshold > 0) {
            MIN_PRICE_THRESHOLD = newThreshold;
            saveSettings();
            console.log(`Threshold updated to ${MIN_PRICE_THRESHOLD}`);
            updateStatus(`Threshold updated to ${MIN_PRICE_THRESHOLD}`);
        } else {
            console.log("Invalid threshold value");
            updateStatus("Invalid threshold value");
            // Reset input to current value
            thresholdInput.value = MIN_PRICE_THRESHOLD;
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
        controlPanel.style.width = '250px';
        controlPanel.style.fontFamily = 'Arial, sans-serif';
        controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

        // Create the title
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';
        title.style.marginBottom = '10px';
        title.style.textAlign = 'center';
        title.textContent = 'YiYa AutoCart';
        controlPanel.appendChild(title);

        // Create threshold input section
        const thresholdSection = document.createElement('div');
        thresholdSection.style.marginBottom = '15px';

        const thresholdLabel = document.createElement('label');
        thresholdLabel.textContent = 'Price';
        thresholdLabel.style.display = 'block';
        thresholdLabel.style.marginBottom = '5px';
        thresholdLabel.style.color = '#ffffff';
        thresholdSection.appendChild(thresholdLabel);

        // Create input field
        const thresholdInput = document.createElement('input');
        thresholdInput.id = 'harmony-bot-threshold';
        thresholdInput.type = 'number';
        thresholdInput.min = '0';
        thresholdInput.step = '0.01';
        thresholdInput.value = MIN_PRICE_THRESHOLD;
        thresholdInput.style.width = '100%';
        thresholdInput.style.padding = '5px';
        thresholdInput.style.borderRadius = '4px';
        thresholdInput.style.border = '1px solid #ccc';
        thresholdInput.style.backgroundColor = '#ffffff';
        thresholdInput.style.color = '#000000';
        thresholdInput.style.fontWeight = 'bold';
        thresholdInput.style.fontSize = '16px';
        thresholdInput.style.boxSizing = 'border-box';
        thresholdInput.style.marginBottom = '10px';
        thresholdSection.appendChild(thresholdInput);

        // Create save button below input field
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.width = '100%';
        saveButton.style.padding = '8px';
        saveButton.style.backgroundColor = '#2196F3'; // Blue color
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.marginBottom = '15px';
        saveButton.addEventListener('click', saveThreshold);
        thresholdSection.appendChild(saveButton);

        controlPanel.appendChild(thresholdSection);

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

        console.log(`Default threshold set to ${MIN_PRICE_THRESHOLD}`);
    }

    // Wait for the page to fully load before initializing
    window.addEventListener('load', initialize);
})();
