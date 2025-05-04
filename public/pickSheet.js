// pickSheet.js

// Global variable to track the current order being processed
let currentPickOrderId = null;

// Update the pick sheet table with current data
function updatePickSheet() {
    const pickSheetTable = document.getElementById('pickSheetTable');
    if (!pickSheetTable) return;
    const tbody = pickSheetTable.querySelector('tbody');
    if (!tbody) return;

    try {
        // Load pick sheets from storage
        const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
        
        // Get filter and search values
        const filterValue = document.getElementById('pickSheetFilter')?.value || 'all';
        const searchValue = document.getElementById('orderSearch')?.value?.toLowerCase() || '';
        
        // Clear the table
        tbody.innerHTML = '';
        
        // Filter the pick sheets based on filter and search values
        const filteredSheets = pickSheets.filter(sheet => {
            const matchesFilter = filterValue === 'all' || sheet.status === filterValue;
            const matchesSearch = searchValue === '' || 
                sheet.clientName?.toLowerCase().includes(searchValue) ||
                sheet.id?.toLowerCase().includes(searchValue) ||
                (sheet.propertyName?.toLowerCase().includes(searchValue) || '');
            return matchesFilter && matchesSearch;
        });
        
        // Display message if no results
        if (filteredSheets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No work orders found</td></tr>';
            return;
        }
        
        // Add each pick sheet to the table
        filteredSheets.forEach(sheet => {
            const locationInfo = sheet.stagingArea ? getStagingAreaLabel(sheet.stagingArea) : 'Warehouse';
            const needsCuttingTag = sheet.needsCutting ? '<span class="needs-cutting">Needs Cutting</span>' : '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sheet.id || 'N/A'}</td>
                <td>${sheet.clientName || 'N/A'}</td>
                <td>${formatItems(sheet.items || [])}</td>
                <td>${locationInfo} ${needsCuttingTag}</td>
                <td>${getStatusBadge(sheet.status || 'pending')}</td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button class="action-button view-button">View</button>
                        <br>
                        <button class="action-button delete-button">Del</button>
                    </div>
                </td>
            `;
            
            // Add event listeners to buttons (better than inline onclick)
            const viewButton = row.querySelector('.view-button');
            const deleteButton = row.querySelector('.delete-button');
            
            if (viewButton) {
                viewButton.addEventListener('click', () => viewPickDetails(sheet.id));
            }
            
            if (deleteButton) {
                deleteButton.addEventListener('click', () => deletePickSheet(sheet.id));
            }
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating pick sheet:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading work orders</td></tr>';
    }
}

// Format the items for display in the table
function formatItems(items) {
    return `<ul class="item-list">${items.map(item => {
        const stagingInfo = item.stagingArea ? ` (${getStagingAreaLabel(item.stagingArea)})` : '';
        const needsCuttingTag = item.needsCutting ? ' <span class="needs-cutting">Needs Cutting</span>' : '';
        
        return `
        <li>${item.blindType}<br>${item.width}x${item.length} (${item.quantity})
            <span class="status-badge status-${item.status}">${item.status}${stagingInfo}</span>${needsCuttingTag}
        </li>`;
    }).join('')}</ul>`;
}

// Delete a pick sheet after confirmation
function deletePickSheet(orderId) {
    if (confirm(`Are you sure you want to delete work order ${orderId}? This action cannot be undone.`)) {
        const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
        const updatedSheets = pickSheets.filter(sheet => sheet.id !== orderId);
        StorageUtil.save(StorageKeys.PICK_SHEETS, updatedSheets);
        updatePickSheet();
    }
}

// Open the pick sheet details modal for viewing and editing
function viewPickDetails(orderId) {
    console.log(`viewPickDetails called with orderId: ${orderId}`);
    
    // Store the current order ID globally
    currentPickOrderId = orderId;
    
    if (!orderId || orderId === 'undefined') {
        console.error("Invalid orderId provided to viewPickDetails:", orderId);
        alert("Error: Invalid order ID. Please refresh and try again.");
        return;
    }
    
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const order = pickSheets.find(sheet => sheet.id === orderId);
    
    if (!order) {
        console.error(`Order ${orderId} not found`);
        alert('Order not found');
        return;
    }
    
    const modal = document.getElementById('pickSheetModal');
    const detailsContainer = document.getElementById('pickSheetDetails');
    
    // Get staging area info
    const currentStagingArea = order.stagingArea || 'Not Assigned';
    const currentStage = getStageLabel(order.status);
    const needsCutting = order.needsCutting;
    
    detailsContainer.innerHTML = `
        <div class="premium-details-container">
            <div class="premium-info-section">
                <h3 class="premium-subheader">Order Information</h3>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Date Created:</strong> ${formatDate(order.dateCreated)}</p>
                <p><strong>Client:</strong> ${order.clientName}</p>
                <p><strong>Property:</strong> ${order.propertyName}</p>
                <p><strong>Current Stage:</strong> ${currentStage}</p>
                ${order.stagingArea ? `<p><strong>Current Location:</strong> ${getStagingAreaLabel(currentStagingArea)}</p>` : ''}
                ${needsCutting ? '<p><strong class="needs-cutting">Needs Cutting: Yes</strong></p>' : ''}
            </div>
        </div>
    `;
    
    // Set up the picking form separately
    const pickingForm = document.getElementById('pickingForm');
    pickingForm.innerHTML = `
        <form id="pickForm">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th class="premium-th">Blind Type</th>
                        <th class="premium-th">Dimensions</th>
                        <th class="premium-th">Recommended Size</th>
                        <th class="premium-th">Quantity Needed</th>
                        <th class="premium-th">Quantity Picked</th>
                        <th class="premium-th">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map((item, index) => {
                        const itemStagingInfo = item.stagingArea ? ` (${getStagingAreaLabel(item.stagingArea)})` : '';
                        const needsCuttingTag = item.needsCutting ? ' <span class="needs-cutting">Needs Cutting</span>' : '';
                        
                        return `
                        <tr>
                            <td class="premium-td">${item.blindType}</td>
                            <td class="premium-td">${item.width}" × ${item.length}"</td>
                            <td class="premium-td">${item.recommendedSize || ''}</td>
                            <td class="premium-td">${item.quantity}</td>
                            <td class="premium-td">
                                <div class="quantity-input">
                                    <input type="number" id="picked_${index}" name="picked_${index}"
                                        min="0" max="${item.quantity}" value="${item.quantity}"
                                        class="premium-input">
                                    <span>/ ${item.quantity}</span>
                                </div>
                            </td>
                            <td class="premium-td">
                                <span class="status-badge status-${item.status}">
                                    ${item.status}${itemStagingInfo}
                                </span>
                                ${needsCuttingTag}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </form>
    `;
    
    // Set up button event handlers with direct function references
    setupModalButtons(order);
    
    // Display the modal
    modal.style.display = 'flex';
}

// Set up the modal buttons with direct event handlers
function setupModalButtons(order) {
    const primaryButton = document.querySelector('.premium-button.premium-primary');
    if (!primaryButton) {
        console.error("Could not find primary button in modal");
        return;
    }
    
    // Update button text and display
    primaryButton.textContent = 'Complete Picking';
    primaryButton.style.display = 'block';
    
    // Remove any existing event listeners
    primaryButton.replaceWith(primaryButton.cloneNode(true));
    
    // Get the fresh reference after replacement
    const newPrimaryButton = document.querySelector('.premium-button.premium-primary');
    
    // Attach a direct event listener
    newPrimaryButton.addEventListener('click', completePickingFromModal);
    
    console.log(`Set up direct event listener for complete picking button`);
}

// Function to handle the complete picking button click
function completePickingFromModal() {
    console.log(`Complete picking button clicked, using orderId: ${currentPickOrderId}`);
    completePicking(currentPickOrderId);
}

// Process the completed picking
function completePicking(orderId) {
    // Use the global variable as fallback if parameter isn't passed correctly
    if (!orderId && currentPickOrderId) {
        console.log(`No orderId provided to completePicking, using currentPickOrderId: ${currentPickOrderId}`);
        orderId = currentPickOrderId;
    }
    
    console.log(`completePicking called with orderId: ${orderId}`);
    
    if (!orderId || orderId === 'undefined') {
        console.error("Invalid orderId provided to completePicking:", orderId);
        alert("Error: Order undefined not found. Please refresh and try again.");
        return;
    }
    
    // Load pick sheets from storage
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    console.log(`Found ${pickSheets.length} pick sheets`);
    
    const orderIndex = pickSheets.findIndex(sheet => sheet.id === orderId);
    
    if (orderIndex === -1) {
        console.error(`Order ${orderId} not found`);
        alert(`Error: Order ${orderId} not found. Please refresh and try again.`);
        return;
    }
    
    const order = pickSheets[orderIndex];
    console.log(`Found order: ${order.id}, status: ${order.status}`);
    
    // Force the cutting path - always mark the order for cutting
    const stagingArea = 'cnc';
    
    // Update the order directly
    order.status = 'CNC';
    order.stagingArea = stagingArea;
    order.needsCutting = true;
    
    // Update all items to be picked
    order.items.forEach((item, index) => {
        const pickedInput = document.getElementById(`picked_${index}`);
        const pickedQty = pickedInput ? (parseInt(pickedInput.value) || item.quantity) : item.quantity;
        
        item.status = 'picked';
        item.pickedQuantity = pickedQty;
        item.stagingArea = stagingArea;
        item.needsCutting = true;
    });
    
    // Save the updated orders
    StorageUtil.save(StorageKeys.PICK_SHEETS, pickSheets);
    console.log(`Updated order ${orderId} status to 'CNC'`);
    
    // Update the UI
    updatePickSheet();
    
    // Refresh cutting orders if the function exists
    if (window.refreshCuttingOrders) {
        console.log("Refreshing cutting orders");
        window.refreshCuttingOrders();
    }
    
    // Add to schedule if needed
    addToSchedule(order);
    
    // Reset the global variable
    currentPickOrderId = null;
    
    alert('Items successfully picked and sent to CNC station.');
    closePickSheetModal();
}

// Helper function to determine if an item needs special cutting
function needsSpecialCut(item) {
    console.log(`Checking if ${item.blindType} (${item.width}x${item.length}) needs cutting`);
    
    // Get standard sizes from inventory
    const standardSizes = StorageUtil.load(StorageKeys.INVENTORY) || [];
    console.log(`Found ${standardSizes.length} standard sizes in inventory`);
    
    // Check if there's an exact match for this item's dimensions
    const exactMatchExists = standardSizes.some(stockItem => {
        if (!stockItem.size) return false;
        
        const [stockWidth, stockLength] = stockItem.size.split('x').map(dim => parseFloat(dim.trim()));
        const itemWidth = parseFloat(item.width);
        const itemLength = parseFloat(item.length);
        
        const isMatch = stockWidth === itemWidth && stockLength === itemLength;
        if (isMatch) {
            console.log(`Found exact match in inventory: ${stockItem.size}`);
        }
        return isMatch;
    });
    
    // If no exact match exists, it needs cutting
    const needsCutting = !exactMatchExists;
    console.log(`Item ${item.blindType} needs cutting: ${needsCutting}`);
    return needsCutting;
}

// Function to add picked items to the schedule
function addToSchedule(order) {
    // Load existing schedule items
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Check if this order is already in the schedule
    const existingIndex = scheduleItems.findIndex(item => item.orderId === order.id);
    
    // Format items for display
    const pickedItems = [];
    
    order.items
        .filter(item => item.status === 'picked')
        .forEach(item => {
            pickedItems.push(`${item.quantity}x ${item.blindType} (${item.width}"x${item.length}")`);
        });
    
    const pickedItemsText = pickedItems.join(', ');
    
    if (pickedItems.length === 0) {
        return; // No picked items to schedule
    }
    
    if (existingIndex >= 0) {
        // Update existing schedule item
        scheduleItems[existingIndex].items = pickedItemsText;
        scheduleItems[existingIndex].status = 'pending';
        scheduleItems[existingIndex].stagingArea = order.stagingArea;
        scheduleItems[existingIndex].needsCutting = order.needsCutting;
    } else {
        // Create new schedule item
        const scheduleItem = {
            id: Date.now(), // Unique ID for the schedule item
            orderId: order.id, // Reference back to the original order
            time: 'TBD', // To be determined
            type: order.needsCutting ? 'cutting' : 'delivery', // Default to delivery or cutting based on need
            client: order.clientName,
            address: order.propertyName || 'No address provided',
            items: pickedItemsText,
            status: 'pending',
            date: new Date().toISOString().split('T')[0], // Today's date
            staff: '', // No staff assigned yet
            stagingArea: order.stagingArea,
            needsCutting: order.needsCutting
        };
        
        scheduleItems.push(scheduleItem);
    }
    
    // Save updated schedule items
    StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
    
    // If we're on the install/delivery tab, refresh the display
    if (document.getElementById('installDelivery').classList.contains('active')) {
        filterSchedule('all');
    }
}

// Get the display label for a staging area
function getStagingAreaLabel(stagingAreaValue) {
    const stagingAreas = {
        'will-call': 'Will Call',
        'dock': 'Staging Dock',
        'cnc': 'CNC Machine',
        'staged': 'Ready for Delivery',
        '': 'Not Assigned'
    };
    return stagingAreas[stagingAreaValue] || stagingAreaValue;
}

// Get the display label for a stage/status
function getStageLabel(status) {
    const stages = {
        'pending': 'Pending Pick',
        'in-progress': 'In Progress',
        'partial': 'Partially Picked',
        'picked': 'Picked',
        'complete': 'Complete',
        'willcall': 'Will Call',
        'staged': 'Ready for Delivery',
        'cut': 'Cut Complete',
        'CNC': 'At CNC Station',
        'Dock': 'Ready for Delivery',
        'Cancelled': 'Cancelled'
    };
    return stages[status] || status;
}

// Close the pick sheet modal and reset the current order ID
function closePickSheetModal() {
    const modal = document.getElementById('pickSheetModal');
    if (modal) modal.style.display = 'none';
    
    // Reset the global variable
    currentPickOrderId = null;
}

// Check if an inventory item exists for a specific size
function inventoryItemExists(width, length) {
    const inventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
    return inventory.some(item => {
        if (!item.size) return false;
        const [invWidth, invLength] = item.size.split('x').map(dim => parseFloat(dim.trim()));
        return invWidth === parseFloat(width) && invLength === parseFloat(length);
    });
}

// Initialize pick sheet data if none exists
function initializePickSheetData() {
    const existingData = StorageUtil.load(StorageKeys.PICK_SHEETS);
    if (!existingData || existingData.length === 0) {
        const sampleData = [
            {
                id: "WO-" + Math.floor(100000 + Math.random() * 900000),
                clientName: "John Smith",
                propertyName: "Smith Residence",
                dateCreated: new Date().toISOString(),
                status: "pending",
                items: [
                    {
                        blindType: "Faux Wood",
                        width: "43",
                        length: "72",
                        quantity: 2,
                        pickedQuantity: 0,
                        status: "pending",
                        recommendedSize: "43\" × 72\""
                    }
                ]
            },
            {
                id: "WO-" + Math.floor(100000 + Math.random() * 900000),
                clientName: "Jane Doe",
                propertyName: "Downtown Office",
                dateCreated: new Date().toISOString(),
                status: "pending",
                items: [
                    {
                        blindType: "Vertical",
                        width: "85",
                        length: "64",
                        quantity: 3,
                        pickedQuantity: 0,
                        status: "pending",
                        recommendedSize: "85\" × 64\""
                    },
                    {
                        blindType: "Faux Wood",
                        width: "36",
                        length: "48",
                        quantity: 1,
                        pickedQuantity: 0,
                        status: "pending",
                        recommendedSize: "36\" × 48\""
                    }
                ]
            }
        ];
        
        StorageUtil.save(StorageKeys.PICK_SHEETS, sampleData);
        console.log("Initialized sample pick sheet data");
    }
}

// Set up event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Pick Sheet tab script loading...");
    
    // Initialize data if needed
    initializePickSheetData();
    
    // Add event listeners for filter and search
    document.getElementById('pickSheetFilter')?.addEventListener('change', updatePickSheet);
    document.getElementById('orderSearch')?.addEventListener('input', updatePickSheet);
    
    // Update the pick sheet table
    updatePickSheet();
    
    // Make functions globally available
    window.updatePickSheet = updatePickSheet;
    window.viewPickDetails = viewPickDetails;
    window.completePicking = completePicking;
    window.closePickSheetModal = closePickSheetModal;
    window.deletePickSheet = deletePickSheet;
    window.completePickingFromModal = completePickingFromModal;
    
    console.log("Pick Sheet tab script loaded");
});

// Function to notify when picking is complete (for other modules)
function onPickingComplete(orderId) {
    console.log("onPickingComplete called for order:", orderId);
    if (window.refreshCuttingOrders) {
        window.refreshCuttingOrders();
    }
}