// cutting.js - Enhanced version with modal workflow

// Make the update function globally available
// Debug function remains the same
function debugCuttingSystem() {
    console.log("======= DEBUGGING CUTTING SYSTEM =======");
    
    // Check pickSheets in storage
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    console.log(`Found ${pickSheets.length} total pick sheets`);
    
    // Look for orders with needsCutting flag
    const ordersNeedingCutting = pickSheets.filter(sheet => sheet.needsCutting === true);
    console.log(`Found ${ordersNeedingCutting.length} orders with needsCutting=true`);
    
    // Check each order for items that need cutting
    let totalItemsNeedingCut = 0;
    pickSheets.forEach(sheet => {
      if (!sheet.items || sheet.items.length === 0) return;
      
      const itemsNeedingCut = sheet.items.filter(item => 
        item.needsCutting === true && 
        item.status === 'picked' && 
        !item.cuttingCompleted
      );
      
      if (itemsNeedingCut.length > 0) {
        console.log(`Order ${sheet.id} has ${itemsNeedingCut.length} items needing cutting:`);
        itemsNeedingCut.forEach(item => {
          console.log(`- ${item.blindType} (${item.width}x${item.length}): status=${item.status}`);
        });
        totalItemsNeedingCut += itemsNeedingCut.length;
      }
    });
    
    console.log(`Found ${totalItemsNeedingCut} total items that need cutting`);
    console.log("======= END DEBUGGING =======");
    
    return totalItemsNeedingCut > 0;
}

// Global tracking of current cutting job
let currentCuttingJob = null;

window.updateCuttingOrders = function() {
    console.log("GLOBAL updateCuttingOrders called");
    updateCuttingOrdersInternal();
};

// Internal function to update cutting orders table - modified to use the view button
// Modify the updateCuttingOrdersInternal function in cutting.js
function updateCuttingOrdersInternal() {
    console.log("Updating cutting orders table");
    debugCuttingSystem();
    
    const cuttingOrdersTable = document.getElementById('cuttingOrdersTable');
    if (!cuttingOrdersTable) {
        console.error("Cutting orders table not found in DOM");
        return;
    }
    
    const tbody = cuttingOrdersTable.querySelector('tbody');
    if (!tbody) {
        console.error("Table body not found in cutting orders table");
        return;
    }

    try {
        const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
        console.log(`Found ${pickSheets.length} pick sheets in storage.`);
        
        // Group cutting items by order for a cleaner display
        const orderSummaries = {};
        
        pickSheets.forEach(sheet => {
            console.log(`Processing order ${sheet.id}: needsCutting=${sheet.needsCutting}, status=${sheet.status}`);
            if (sheet.items && sheet.items.length > 0) {
                const itemsNeedingCut = sheet.items.filter(item => {
                    const needsCut = item.needsCutting === true && item.status === 'picked' && !item.cuttingCompleted;
                    return needsCut;
                });
                
                if (itemsNeedingCut.length > 0) {
                    console.log(`Order ${sheet.id} has ${itemsNeedingCut.length} items that need cutting`);
                    
                    // Create a summary of this order's cutting needs
                    const blindTypes = [...new Set(itemsNeedingCut.map(item => item.blindType))];
                    const dimensionsSummary = itemsNeedingCut.map(item => 
                        `${item.width}" × ${item.length}"`).join(', ');
                    
                    orderSummaries[sheet.id] = {
                        orderId: sheet.id,
                        clientName: sheet.clientName,
                        propertyName: sheet.propertyName,
                        blindTypes: blindTypes.join(', '),
                        dimensions: dimensionsSummary,
                        itemCount: itemsNeedingCut.length,
                        totalItems: sheet.items.filter(item => item.needsCutting).length,
                        status: sheet.status
                    };
                }
            }
        });

        tbody.innerHTML = '';
        
        if (Object.keys(orderSummaries).length === 0) {
            console.log("No cutting orders found, showing empty message");
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending cutting orders</td></tr>';
            return;
        }

        console.log(`Found ${Object.keys(orderSummaries).length} orders with items needing cutting`);
        
        // Display orders that need cutting
        Object.values(orderSummaries).forEach(summary => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${summary.orderId || 'N/A'}</td>
                <td>${summary.blindTypes}</td>
                <td>${summary.dimensions}</td>
                <td>${summary.itemCount} of ${summary.totalItems}</td>
                <td><span class="status-badge status-pending">Pending Cut</span></td>
                <td>
                    <button onclick="viewCuttingDetails('${summary.orderId}')" class="premium-button">View & Cut</button>
                    <button onclick="sendToDelivery('${summary.orderId}')" class="premium-button">Cutting Completed</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating cutting orders:', error);
        console.error('Error stack:', error.stack);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading cutting orders</td></tr>';
    }
}
// Add this function to cutting.js
function sendToDelivery(orderId) {
    console.log(`Marking cutting completed for order ${orderId}`);
    
    // Load the order data
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const orderIndex = pickSheets.findIndex(sheet => sheet.id === orderId);
    
    if (orderIndex === -1) {
        alert('Order not found');
        return;
    }
    
    const order = pickSheets[orderIndex];
    
    // Mark all items as cut and update order status
    order.status = 'Dock';
    order.stagingArea = 'dock';
    order.cuttingCompleted = true;
    
    // Update all items
    order.items.forEach(item => {
        if (item.needsCutting === true) {
            item.status = 'cut';
            item.cuttingCompleted = true;
            item.stagingArea = 'dock';
        }
    });
    
    // Save updates to pick sheets
    StorageUtil.save(StorageKeys.PICK_SHEETS, pickSheets);
    
    // Add to install/delivery schedule
    addToInstallSchedule(order);
    
    // Update UI
    updateCuttingOrdersInternal();
    
    alert('Order marked as cut and sent to Install/Delivery schedule');
}

// Add this function to create a schedule entry
function addToInstallSchedule(order) {
    // Get existing schedule items
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Check if this order is already in the schedule
    const existingIndex = scheduleItems.findIndex(item => item.orderId === order.id);
    
    // Format items for display
    const itemsText = order.items
        .filter(item => item.status === 'cut' || item.status === 'picked')
        .map(item => `${item.quantity}x ${item.blindType} (${item.width}"x${item.length}")`)
        .join(', ');
    
    // Get client type and service type from the order
    const clientType = order.clientType || 'residential';
    const serviceType = order.serviceType || 'install';
    
    if (existingIndex >= 0) {
        // Update existing schedule item
        scheduleItems[existingIndex].type = serviceType;
        scheduleItems[existingIndex].clientType = clientType;
        scheduleItems[existingIndex].items = itemsText;
        scheduleItems[existingIndex].status = 'pending';
    } else {
        // Create new schedule item
        const scheduleItem = {
            id: Date.now(),
            orderId: order.id,
            time: 'TBD',
            type: serviceType,
            clientType: clientType,
            client: order.clientName,
            address: order.propertyName || 'No address provided',
            items: itemsText,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            staff: ''
        };
        
        scheduleItems.push(scheduleItem);
    }
    
    // Save updated schedule items
    StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
    
    // If Install/Delivery tab is active, refresh it
    if (document.getElementById('installDelivery').classList.contains('active')) {
        if (typeof filterSchedule === 'function') {
            filterSchedule('all');
        }
    }
}

// Function for locally calling the update function
function updateCuttingOrders() {
    updateCuttingOrdersInternal();
}

// New function to display the cutting details in a modal
function viewCuttingDetails(orderId) {
    console.log(`Viewing cutting details for order ${orderId}`);
    
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const order = pickSheets.find(sheet => sheet.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Get only the items that need cutting
    const itemsNeedingCut = order.items.filter(item => 
        item.needsCutting === true && 
        item.status === 'picked' && 
        !item.cuttingCompleted);
    
    // If no items need cutting, show a message
    if (itemsNeedingCut.length === 0) {
        alert('No items in this order need cutting or all cutting has been completed.');
        return;
    }
    
    // Set up the modal
    const modal = document.getElementById('universalModal');
    const modalContent = modal.querySelector('.premium-details-container');
    const buttonGroup = modal.querySelector('.premium-button-group');
    const modalTitle = modal.querySelector('.premium-subheader');
    
    modalTitle.textContent = `Cutting Details - Order ${orderId}`;
    
    // Create the content for the modal
    modalContent.innerHTML = `
        <div class="premium-info-section">
            <h3 class="premium-subheader">Order Information</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Client:</strong> ${order.clientName}</p>
            <p><strong>Property:</strong> ${order.propertyName || 'N/A'}</p>
        </div>
        <div class="premium-info-section">
            <h3 class="premium-subheader">Items Needing Cutting</h3>
            <table class="premium-table">
                <thead>
                    <tr>
                        <th class="premium-th">Blind Type</th>
                        <th class="premium-th">Current Size</th>
                        <th class="premium-th">Target Size</th>
                        <th class="premium-th">Quantity</th>
                        <th class="premium-th">Select</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsNeedingCut.map((item, index) => {
                        // Calculate dimensions for cutting
                        const stockSize = getStockSize(item);
                        const targetWidth = parseFloat(item.width);
                        const targetLength = parseFloat(item.length);
                        
                        return `
                        <tr>
                            <td class="premium-td">${item.blindType}</td>
                            <td class="premium-td">${stockSize ? stockSize : 'Unknown'}</td>
                            <td class="premium-td">${targetWidth}" × ${targetLength}"</td>
                            <td class="premium-td">${item.quantity}</td>
                            <td class="premium-td">
                                <input type="radio" name="cutItem" value="${index}" 
                                    ${index === 0 ? 'checked' : ''}>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Set up the buttons
    buttonGroup.innerHTML = `
        <button onclick="startCuttingProcess('${orderId}')" class="premium-button premium-primary">
            Start Cutting
        </button>
        <button onclick="closeModal()" class="premium-button premium-cancel">
            Cancel
        </button>
    `;
    
    // Store the items for later use
    currentCuttingJob = {
        orderId: order.id,
        items: itemsNeedingCut
    };
    
    // Show the modal
    modal.style.display = 'flex';
}

// Function to get the appropriate stock size for an item
function getStockSize(item) {
    // Get standard sizes from inventory
    const standardSizes = StorageUtil.load(StorageKeys.INVENTORY) || [];
    
    // Find the closest larger stock size
    let closestLargerSize = null;
    let closestWidth = Infinity;
    let closestLength = Infinity;
    
    const targetWidth = parseFloat(item.width);
    const targetLength = parseFloat(item.length);
    
    standardSizes.forEach(stockItem => {
        if (!stockItem.size) return;
        
        const [stockWidth, stockLength] = stockItem.size.split('x').map(dim => parseFloat(dim.trim()));
        
        // Only consider stock that's larger than our target in both dimensions
        if (stockWidth >= targetWidth && stockLength >= targetLength) {
            if (stockWidth < closestWidth || (stockWidth === closestWidth && stockLength < closestLength)) {
                closestWidth = stockWidth;
                closestLength = stockLength;
                closestLargerSize = stockItem.size;
            }
        }
    });
    
    return closestLargerSize;
}

// Function to start the cutting process
function startCuttingProcess(orderId) {
    console.log(`Starting cutting process for order ${orderId}`);
    
    if (!currentCuttingJob || currentCuttingJob.orderId !== orderId) {
        alert('Error: Cutting job data not found. Please try again.');
        return;
    }
    
    // Get the selected item
    const selectedRadio = document.querySelector('input[name="cutItem"]:checked');
    if (!selectedRadio) {
        alert('Please select an item to cut.');
        return;
    }
    
    const selectedIndex = parseInt(selectedRadio.value);
    const selectedItem = currentCuttingJob.items[selectedIndex];
    
    // Get the stock size
    const stockSize = getStockSize(selectedItem);
    if (!stockSize) {
        alert('Error: Could not determine appropriate stock size for this item.');
        return;
    }
    
    const [stockWidth, stockLength] = stockSize.split('x').map(dim => parseFloat(dim.trim()));
    const targetWidth = parseFloat(selectedItem.width);
    const targetLength = parseFloat(selectedItem.length);
    
    // Calculate cutting coordinates
    const widthCut = stockWidth - targetWidth;
    const lengthCut = stockLength - targetLength;
    
    // Show the cutting interface
    const cuttingInterfaceContent = `
        <div class="premium-cutting-interface">
            <h3 class="premium-subheader">CNC Cutting Operation</h3>
            <div class="premium-cutting-status">
                <p><strong>Cutting:</strong> ${selectedItem.blindType}</p>
                <p><strong>From:</strong> ${stockWidth}" × ${stockLength}"</p>
                <p><strong>To:</strong> ${targetWidth}" × ${targetLength}"</p>
                <p><strong>Width Cut:</strong> ${widthCut.toFixed(3)}"</p>
                <p><strong>Length Cut:</strong> ${lengthCut.toFixed(3)}"</p>
            </div>
            
            <div class="premium-cutting-controls">
                <button onclick="simulateCNCOperation(${selectedIndex})" class="premium-button premium-primary">
                    Send to CNC Machine
                </button>
                <div class="premium-progress-bar">
                    <div class="premium-progress" id="cuttingProgress" style="width: 0%"></div>
                </div>
                <p id="progressStatus">Ready to cut</p>
            </div>
        </div>
    `;
    
    // Update modal content
    const modalContent = document.querySelector('.premium-modal-content .premium-details-container');
    modalContent.innerHTML = cuttingInterfaceContent;
    
    // Hide the buttons
    const buttonGroup = document.querySelector('.premium-modal-content .premium-button-group');
    buttonGroup.style.display = 'none';
}

// Function to simulate the CNC operation
function simulateCNCOperation(itemIndex) {
    console.log(`Simulating CNC operation for item index ${itemIndex}`);
    
    const progressBar = document.getElementById('cuttingProgress');
    const progressStatus = document.getElementById('progressStatus');
    
    // Disable the send button
    const sendButton = document.querySelector('.premium-cutting-controls button');
    sendButton.disabled = true;
    
    // Update progress bar
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        
        // Update status
        if (progress < 25) {
            progressStatus.textContent = 'Positioning material...';
        } else if (progress < 50) {
            progressStatus.textContent = 'Cutting width...';
        } else if (progress < 75) {
            progressStatus.textContent = 'Cutting length...';
        } else if (progress < 100) {
            progressStatus.textContent = 'Finishing cuts...';
        } else {
            progressStatus.textContent = 'Cutting complete!';
            clearInterval(interval);
            
            // Enable completing the cut
            const controlsDiv = document.querySelector('.premium-cutting-controls');
            controlsDiv.innerHTML += `
                <button onclick="completeCuttingNew(${itemIndex})" class="premium-button premium-primary">
                    Mark Complete
                </button>
            `;
        }
    }, 200);
}

// New function to mark a cutting job as complete (renamed to avoid conflict)
function completeCuttingNew(itemIndex) {
    console.log(`Completing cutting for item index ${itemIndex}`);
    
    if (!currentCuttingJob) {
        alert('Error: Cutting job data not found.');
        return;
    }
    
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const orderIndex = pickSheets.findIndex(sheet => sheet.id === currentCuttingJob.orderId);
    
    if (orderIndex === -1) {
        alert('Error: Order not found.');
        return;
    }
    
    // Get the order and selected item
    const order = pickSheets[orderIndex];
    const selectedItem = currentCuttingJob.items[itemIndex];
    
    // Find the matching item in the order
    const orderItemIndex = order.items.findIndex(item => 
        item.blindType === selectedItem.blindType && 
        item.width === selectedItem.width && 
        item.length === selectedItem.length);
    
    if (orderItemIndex === -1) {
        alert('Error: Item not found in order.');
        return;
    }
    
    // Mark the item as cutting completed
    order.items[orderItemIndex].cuttingCompleted = true;
    order.items[orderItemIndex].status = 'cut';
    
    // Check if all items are cut
    const allCut = order.items.every(item => 
        !item.needsCutting || item.cuttingCompleted);
    
    if (allCut) {
        // All items are cut, update order status
        order.status = 'cut';
        alert('All items in this order have been cut. Order marked as Complete.');
    } else {
        // Some items still need cutting
        alert('Item marked as cut. There are still items in this order that need cutting.');
    }
    
    // Save updates
    StorageUtil.save(StorageKeys.PICK_SHEETS, pickSheets);
    
    // Close the modal
    closeModal();
    
    // Update the cutting orders table
    updateCuttingOrders();
    
    // Update the schedule item if needed
    updateScheduleForCutting(currentCuttingJob.orderId);
}

// The existing completeCutting function remains for compatibility
function completeCutting(orderId, blindType) {
    console.log(`Legacy completeCutting called for order ${orderId}, blind type ${blindType}`);
    
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const sheet = pickSheets.find(s => s.id === orderId);
    
    if (!sheet) {
        console.error(`Order ${orderId} not found in storage`);
        alert(`Error: Order #${orderId} not found`);
        return;
    }
    
    const item = sheet.items.find(i => i.blindType === blindType && i.status === 'picked');
    
    if (!item) {
        console.error(`Item ${blindType} not found in order ${orderId} or not in 'picked' status`);
        alert(`Error: Item ${blindType} not found in order #${orderId}`);
        return;
    }
    
    // Mark item as cut
    item.cuttingCompleted = true;
    item.status = 'cut';
    console.log(`Marked item ${blindType} as cut in order ${orderId}`);
    
    // Check if all items for this order are now cut
    const itemsNeedingCutting = sheet.items.filter(i => i.needsCutting === true);
    const allItemsCut = itemsNeedingCutting.every(i => i.cuttingCompleted === true || i.status === 'cut');
    
    if (allItemsCut && itemsNeedingCutting.length > 0) {
        // If all items are cut, update the order status
        sheet.status = 'cut';
        console.log(`All items cut for order ${orderId}, updating order status to 'cut'`);
        alert(`All cutting completed for Order #${orderId}. The order is ready for delivery.`);
    } else {
        console.log(`Some items still need cutting for order ${orderId}`);
        alert(`Cutting completed for ${blindType} in Order #${orderId}`);
    }
    
    // Save updated pick sheets back to storage
    StorageUtil.save(StorageKeys.PICK_SHEETS, pickSheets);
    
    // Update the cutting orders table
    updateCuttingOrders();
    
    // Update the schedule item if needed
    updateScheduleForCutting(orderId);
    
    // Update the Install/Delivery tab if it's currently active
    if (document.getElementById('installDelivery').classList.contains('active')) {
        if (typeof filterSchedule === 'function') {
            filterSchedule('all');
        } else {
            console.warn("filterSchedule function not found");
        }
    }
}

// Update schedule after cutting is complete - keep your existing function
function updateScheduleForCutting(orderId) {
    console.log(`Updating schedule for order ${orderId} after cutting`);
    
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    const itemIndex = scheduleItems.findIndex(item => item.orderId === orderId);
    
    if (itemIndex === -1) {
        console.warn(`Order ${orderId} not found in schedule items`);
        return;
    }
    
    const pickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const order = pickSheets.find(sheet => sheet.id === orderId);
    
    if (!order) {
        console.warn(`Order ${orderId} not found in pick sheets`);
        return;
    }
    
    // Check if all items that need cutting are now cut
    const itemsNeedingCutting = order.items.filter(i => i.needsCutting === true);
    const allItemsCut = itemsNeedingCutting.every(i => i.cuttingCompleted === true || i.status === 'cut');
    
    if (allItemsCut && itemsNeedingCutting.length > 0) {
        // If all items are cut, update the schedule item
        console.log(`Updating schedule item for order ${orderId} to 'ready' status`);
        scheduleItems[itemIndex].status = 'ready';
        scheduleItems[itemIndex].type = 'delivery'; // Change from cutting to delivery
        
        // Save updated schedule items back to storage
        StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
    }
}

// This function is called from pickSheet.js after picking is complete
function onPickingComplete(orderId) {
    console.log(`onPickingComplete called for order ${orderId}`);
    // Force update with a slight delay to ensure storage is updated
    setTimeout(function() {
        updateCuttingOrders();
    }, 300);
}

// Calculate cuts based on desired width and stock width - keep your existing function
function calculateCuts() {
    const desiredWidth = parseFloat(document.getElementById('desiredWidth').value);
    const stockWidth = parseFloat(document.getElementById('stockWidth').value);
    const cutResults = document.getElementById('cutResults');
    
    if (isNaN(desiredWidth) || isNaN(stockWidth)) {
        cutResults.innerHTML = '<p>Please enter valid width values.</p>';
        return;
    }
    
    if (desiredWidth > stockWidth) {
        cutResults.innerHTML = '<p>Desired width cannot be greater than stock width.</p>';
        return;
    }
    
    const leftoverWidth = stockWidth - desiredWidth;
    const wastePercentage = (leftoverWidth / stockWidth) * 100;
    
    cutResults.innerHTML = `
        <p>Cutting Results:</p>
        <p>Stock Width: ${stockWidth} inches</p>
        <p>Desired Width: ${desiredWidth} inches</p>
        <p>Leftover Material: ${leftoverWidth.toFixed(3)} inches</p>
        <p>Waste Percentage: ${wastePercentage.toFixed(2)}%</p>
    `;
}

// Refresh pick sheet orders manually - keep your existing function
function refreshPickSheetOrders() {
    try {
        console.log("Manually refreshing pick sheet orders");
        // Update the cutting orders table
        updateCuttingOrders();
        alert("Cutting orders refreshed. Check the table for any pending orders.");
    } catch (error) {
        console.error('Error refreshing pick sheet orders:', error);
        alert('Failed to refresh pick sheet orders. Check console for details.');
    }
}

// Helper function to close the modal
function closeModal() {
    const modal = document.getElementById('universalModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Add window global for direct refresh from anywhere
window.refreshCuttingOrders = function() {
    console.log("Global refreshCuttingOrders called");
    setTimeout(updateCuttingOrders, 300);
};