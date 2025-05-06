// willCall.js - Enhanced version for database integration

// Global variables
window.StorageKeys = window.StorageKeys || {
    WILL_CALL_ORDERS: 'blinds_will_call_orders',
    FINALIZED_ORDERS: 'finalized_orders'
};

// Function to update the Will Call table
function updateWillCallTable() {
    console.log("updateWillCallTable function called");
    
    // Get filter and search values
    const filterValue = document.getElementById('willCallFilter')?.value || 'all';
    const searchValue = document.getElementById('willCallSearch')?.value?.toLowerCase() || '';
    
    // Try to fetch from API first, fall back to local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        // Construct the URL with optional status filter
        let url = '/api/will-call-orders';
        if (filterValue !== 'all') {
            url += `?status=${filterValue}`;
        }
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayWillCallOrders(data.data, searchValue);
                } else {
                    console.error('Error fetching will call orders:', data.message);
                    // Fall back to local storage
                    loadFromLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Fall back to local storage
                loadFromLocalStorage();
            });
    } else {
        // Use local storage
        loadFromLocalStorage();
    }
    
    // Function to load from local storage
    function loadFromLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        console.log("Loaded will call orders from storage:", willCallOrders);
        
        // Filter by status if needed
        const filteredOrders = filterValue === 'all' 
            ? willCallOrders 
            : willCallOrders.filter(order => order.status === filterValue);
            
        displayWillCallOrders(filteredOrders, searchValue);
    }
}

// Function to display will call orders
function displayWillCallOrders(orders, searchTerm) {
    const willCallTable = document.getElementById('willCallTable')?.querySelector('tbody');
    if (!willCallTable) {
        console.error("Will Call table body not found");
        return;
    }
    
    // Clear the table
    willCallTable.innerHTML = '';
    
    // Filter by search term if provided
    const filteredOrders = searchTerm 
        ? orders.filter(order => 
            order.client_name?.toLowerCase().includes(searchTerm) ||
            order.id?.toLowerCase().includes(searchTerm) ||
            order.order_id?.toLowerCase().includes(searchTerm)
        )
        : orders;
        
    if (filteredOrders.length === 0) {
        willCallTable.innerHTML = '<tr><td colspan="7" class="text-center">No will-call orders found</td></tr>';
        return;
    }
    
    // Sort by expected date (soonest first)
    filteredOrders.sort((a, b) => {
        const dateA = new Date(a.expected_date || a.order_date);
        const dateB = new Date(b.expected_date || b.order_date);
        return dateA - dateB;
    });
    
    // Display each order
    filteredOrders.forEach(order => {
        // Format expected date
        const expectedDate = new Date(order.expected_date);
        const formattedDate = expectedDate.toLocaleDateString();
        
        // Get items summary
        let itemsSummary = '';
        try {
            const items = typeof order.items === 'object' ? order.items : JSON.parse(order.order_data || '[]');
            const count = items.length;
            const types = [...new Set(items.map(item => item.blindType))].join(', ');
            itemsSummary = `${count} items (${types})`;
        } catch (e) {
            console.error('Error parsing items:', e);
            itemsSummary = 'Error parsing items';
        }
        
        // Create the row
        const row = createTableRow([
            order.id || order.order_id,
            order.client_name,
            `<span class="lead-time-badge">${order.lead_time} Days</span>`,
            formattedDate,
            itemsSummary,
            `<span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span>`,
            `<div class="premium-button-group">
                <button onclick="viewWillCallDetails('${order.id || order.order_id}')" class="premium-button premium-secondary">View</button>
                <button onclick="completeWillCallOrder('${order.id || order.order_id}')" class="premium-button premium-secondary">Complete</button>
                <button onclick="updateWillCallNotes('${order.id || order.order_id}')" class="premium-button premium-secondary">Notes</button>
                <button onclick="deleteWillCallOrder('${order.id || order.order_id}')" class="premium-button premium-danger">Delete</button>
            </div>`
        ]);
        willCallTable.appendChild(row);
    });
}

// Function to view will call details
function viewWillCallDetails(orderId) {
    // Try to fetch from API first, fall back to local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        fetch(`/api/will-call-orders/${orderId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showDetailsModal(data.data);
                } else {
                    console.error('Error fetching order details:', data.message);
                    // Fall back to local storage
                    showDetailsFromLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Fall back to local storage
                showDetailsFromLocalStorage();
            });
    } else {
        // Use local storage
        showDetailsFromLocalStorage();
    }
    
    // Function to show details from local storage
    function showDetailsFromLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        const order = willCallOrders.find(o => o.id === orderId || o.order_id === orderId);
        if (order) {
            showDetailsModal(order);
        } else {
            alert('Order details not found');
        }
    }
    
    // Function to show the details modal
    function showDetailsModal(order) {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'premium-modal';
        modalContainer.style.display = 'flex';
        
        // Parse items
        let items = [];
        try {
            items = typeof order.items === 'object' ? order.items : JSON.parse(order.order_data || '[]');
        } catch (e) {
            console.error('Error parsing items:', e);
        }
        
        // Format expected date
        const expectedDate = new Date(order.expected_date);
        const formattedExpectedDate = expectedDate.toLocaleDateString();
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'premium-modal-content';
        
        // Create items table HTML
        let itemsTableHTML = `
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Item Type</th>
                        <th>Dimensions</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        items.forEach(item => {
            const dimensions = item.width && item.length ? `${item.width}" x ${item.length}"` : 'N/A';
            itemsTableHTML += `
                <tr>
                    <td>${item.blindType}</td>
                    <td>${dimensions}</td>
                    <td>${item.quantity}</td>
                </tr>
            `;
        });
        
        itemsTableHTML += '</tbody></table>';
        
        // Set the modal content
        modalContent.innerHTML = `
            <span class="premium-close-modal" onclick="closeWillCallModal()">&times;</span>
            <h2 class="premium-subheader">Will Call Order Details</h2>
            
            <div class="premium-details-container">
                <div>
                    <p><strong>Order ID:</strong> ${order.id || order.order_id}</p>
                    <p><strong>Client:</strong> ${order.client_name}</p>
                    <p><strong>Phone:</strong> ${order.client_phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.client_email || 'N/A'}</p>
                    <p><strong>Property:</strong> ${order.property_name || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Lead Time:</strong> ${order.lead_time} days</p>
                    <p><strong>Expected Date:</strong> ${formattedExpectedDate}</p>
                    <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
                    <p><strong>Notes:</strong> ${order.notes || 'No notes'}</p>
                </div>
            </div>
            
            <h3>Order Items</h3>
            ${itemsTableHTML}
            
            <div class="premium-button-group">
                <button onclick="closeWillCallModal()" class="premium-button">Close</button>
                <button onclick="completeWillCallOrder('${order.id || order.order_id}')" class="premium-button premium-primary">Mark as Complete</button>
            </div>
        `;
        
        // Append modal to body
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
    }
}

// Function to close will call modal
function closeWillCallModal() {
    const modal = document.querySelector('.premium-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Function to mark will call order as complete
function completeWillCallOrder(orderId) {
    if (confirm('Are you sure you want to mark this order as complete?')) {
        // Try API first, fall back to local storage
        if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
            fetch(`/api/will-call-orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'completed'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    handleCompleteSuccess();
                } else {
                    console.error('Error updating order status:', data.message);
                    // Fall back to local storage
                    updateInLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Fall back to local storage
                updateInLocalStorage();
            });
        } else {
            // Use local storage
            updateInLocalStorage();
        }
        
        // Function to update in local storage
        function updateInLocalStorage() {
            const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
            const orderIndex = willCallOrders.findIndex(o => o.id === orderId || o.order_id === orderId);
            
            if (orderIndex !== -1) {
                willCallOrders[orderIndex].status = 'completed';
                StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
                handleCompleteSuccess();
            } else {
                alert('Order not found');
            }
        }
        
        // Function to handle successful completion
        function handleCompleteSuccess() {
            // Close any open modal
            closeWillCallModal();
            
            // Update the table
            updateWillCallTable();
            
            // Show success message
            alert('Order marked as complete');
        }
    }
}

// Function to update will call notes
function updateWillCallNotes(orderId) {
    // Get the current notes
    let currentNotes = '';
    
    // Try to fetch from API first, fall back to local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        fetch(`/api/will-call-orders/${orderId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotesModal(data.data.notes || '');
                } else {
                    console.error('Error fetching order details:', data.message);
                    // Fall back to local storage
                    getNotesFromLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Fall back to local storage
                getNotesFromLocalStorage();
            });
    } else {
        // Use local storage
        getNotesFromLocalStorage();
    }
    
    // Function to get notes from local storage
    function getNotesFromLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        const order = willCallOrders.find(o => o.id === orderId || o.order_id === orderId);
        if (order) {
            showNotesModal(order.notes || '');
        } else {
            showNotesModal('');
            console.warn('Order not found in local storage');
        }
    }
    
    // Function to show the notes modal
    function showNotesModal(notes) {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'premium-modal';
        modalContainer.style.display = 'flex';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'premium-modal-content';
        
        // Set the modal content
        modalContent.innerHTML = `
            <span class="premium-close-modal" onclick="closeWillCallModal()">&times;</span>
            <h2 class="premium-subheader">Update Order Notes</h2>
            
            <div class="premium-form-grid">
                <div class="premium-input-group">
                    <label>Order Notes:</label>
                    <textarea id="willCallOrderNotes" class="premium-textarea" rows="5">${notes}</textarea>
                </div>
            </div>
            
            <div class="premium-button-group">
                <button onclick="saveWillCallNotes('${orderId}')" class="premium-button premium-primary">Save Notes</button>
                <button onclick="closeWillCallModal()" class="premium-button">Cancel</button>
            </div>
        `;
        
        // Append modal to body
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
    }
}

// Function to save will call notes
function saveWillCallNotes(orderId) {
    const notes = document.getElementById('willCallOrderNotes').value;
    
    // Try API first, fall back to local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        fetch(`/api/will-call-orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: notes
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                handleSaveSuccess();
            } else {
                console.error('Error updating notes:', data.message);
                // Fall back to local storage
                saveToLocalStorage();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Fall back to local storage
            saveToLocalStorage();
        });
    } else {
        // Use local storage
        saveToLocalStorage();
    }
    
    // Function to save to local storage
    function saveToLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        const orderIndex = willCallOrders.findIndex(o => o.id === orderId || o.order_id === orderId);
        
        if (orderIndex !== -1) {
            willCallOrders[orderIndex].notes = notes;
            StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
            handleSaveSuccess();
        } else {
            alert('Order not found');
            closeWillCallModal();
        }
    }
    
    // Function to handle successful save
    function handleSaveSuccess() {
        // Close the modal
        closeWillCallModal();
        
        // Update the table
        updateWillCallTable();
        
        // Show success message
        alert('Notes updated successfully');
    }
}

// Function to download will call list
function downloadWillCallList() {
    // Get the orders from either API or local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        fetch('/api/will-call-orders')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    generateExcelFile(data.data);
                } else {
                    console.error('Error fetching will call orders:', data.message);
                    // Fall back to local storage
                    downloadFromLocalStorage();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Fall back to local storage
                downloadFromLocalStorage();
            });
    } else {
        // Use local storage
        downloadFromLocalStorage();
    }
    
    // Function to download from local storage
    function downloadFromLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        generateExcelFile(willCallOrders);
    }
    
    // Function to generate Excel file
    function generateExcelFile(orders) {
        // Format data for Excel
        const data = orders.map(order => {
            // Parse items if needed
            let itemCount = 0;
            let itemTypes = '';
            try {
                const items = typeof order.items === 'object' ? order.items : JSON.parse(order.order_data || '[]');
                itemCount = items.length;
                itemTypes = [...new Set(items.map(item => item.blindType))].join(', ');
            } catch (e) {
                console.error('Error parsing items:', e);
            }
            
            // Format expected date
            const expectedDate = order.expected_date ? new Date(order.expected_date) : new Date();
            
            return {
                'Order ID': order.id || order.order_id,
                'Client': order.client_name,
                'Lead Time': order.lead_time + ' days',
                'Expected Date': expectedDate.toLocaleDateString(),
                'Items Count': itemCount,
                'Item Types': itemTypes,
                'Status': order.status || 'pending',
                'Notes': order.notes || ''
            };
        });
        
        // Create and download Excel file
        if (typeof XLSX === 'undefined') {
            console.error("XLSX library not available");
            alert('Error: Excel library not loaded. Please refresh the page and try again.');
            return;
        }
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'WillCallOrders');
        XLSX.writeFile(workbook, 'WillCallOrders.xlsx');
        alert('Will call list downloaded successfully!');
    }
}

// Function to email supplier
function emailSupplier() {
    // Get the current will call orders
    const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    
    // Filter to pending orders only
    const pendingOrders = willCallOrders.filter(order => order.status === 'pending' || !order.status);
    
    if (pendingOrders.length === 0) {
        alert('No pending will call orders to send to supplier');
        return;
    }
    
    // Format email body
    const subject = 'Will Call Orders Update';
    let body = 'Here are the current pending will call orders:\n\n';
    
    pendingOrders.forEach(order => {
        // Parse items if needed
        let itemSummary = 'No items';
        try {
            const items = typeof order.items === 'object' ? order.items : JSON.parse(order.order_data || '[]');
            
            if (items.length > 0) {
                itemSummary = items.map(item => {
                    const dimensions = item.width && item.length ? `${item.width}" x ${item.length}"` : '';
                    return `${item.quantity}x ${item.blindType} ${dimensions}`.trim();
                }).join(', ');
            }
        } catch (e) {
            console.error('Error parsing items:', e);
        }
        
        // Format expected date
        const expectedDate = order.expected_date ? new Date(order.expected_date).toLocaleDateString() : 'Not specified';
        
        body += `
Order ID: ${order.id || order.order_id}
Client: ${order.client_name}
Lead Time: ${order.lead_time} days
Expected Date: ${expectedDate}
Items: ${itemSummary}
Notes: ${order.notes || 'None'}

-----------------------------------------
`;
    });
    
    body += '\nPlease process these orders as soon as possible. Thank you!';
    
    // Create mailto link
    const mailtoLink = `mailto:supplier@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}

// Function to initialize will call data
function initializeWillCallData() {
    // Check if we already have orders in storage
    const existingData = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS);
    if (!existingData || existingData.length === 0) {
        // Create sample data
        const sampleData = [
            {
                id: 'WC-100001',
                order_id: 'WO-100001',
                client_name: 'John Smith',
                client_phone: '555-123-4567',
                client_email: 'john@example.com',
                property_name: 'Smith Residence',
                client_type: 'residential',
                lead_time: 5,
                order_date: new Date().toISOString(),
                expected_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                order_data: JSON.stringify([
                    {
                        blindType: 'Faux Wood',
                        width: '35',
                        length: '72',
                        quantity: '2',
                        unitPrice: 89.99
                    },
                    {
                        blindType: 'Vertical',
                        width: '72',
                        length: '84',
                        quantity: '1',
                        unitPrice: 129.99
                    }
                ]),
                status: 'pending',
                notes: 'Customer prefers afternoon delivery'
            },
            {
                id: 'WC-100002',
                order_id: 'WO-100002',
                client_name: 'Jane Doe',
                client_phone: '555-987-6543',
                client_email: 'jane@example.com',
                property_name: 'Doe Residence',
                client_type: 'residential',
                lead_time: 2,
                order_date: new Date().toISOString(),
                expected_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                order_data: JSON.stringify([
                    {
                        blindType: 'Faux Wood',
                        width: '24',
                        length: '36',
                        quantity: '4',
                        unitPrice: 59.99
                    }
                ]),
                status: 'completed',
                notes: 'Rush order - customer is a repeat client'
            }
        ];
        
        // Save to storage
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, sampleData);
        console.log("Initialized sample will call data");
    }
}

// Function to send order to Will Call
function sendToWillCall() {
    // First validate that we have a valid work order
    const clientName = document.getElementById('clientName').value;
    if (!clientName) {
        alert('Please enter a client name before sending to Will Call');
        return;
    }
    
    // Collect work order data
    const workOrderData = {
        id: 'WO-' + Date.now().toString().slice(-6),
        dateCreated: new Date().toISOString(),
        clientName: document.getElementById('clientName').value,
        propertyName: document.getElementById('propertyName').value,
        clientPhone: document.getElementById('clientPhone').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientType: document.getElementById('clientType')?.value || 'residential',
        serviceType: document.getElementById('serviceType')?.value || 'install',
        items: [],
        status: 'pending'
    };
    
    // Collect all line items from the table
    const rows = Array.from(document.getElementById('workOrderTable').querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const cells = row.cells;
        if (cells.length > 0) {
            const blindType = cells[0].querySelector('select')?.value || '';
            const width = cells[1].querySelector('input')?.value || '';
            const length = cells[2].querySelector('input')?.value || '';
            const quantity = cells[3].querySelector('input')?.value || '0';
            const recommendedSize = cells[5].querySelector('.recommended-size')?.textContent || '-';
            
            if (blindType && width && length && quantity) {
                const item = {
                    blindType,
                    width,
                    length,
                    quantity,
                    recommendedSize,
                    status: 'pending',
                    unitPrice: parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0
                };
                workOrderData.items.push(item);
            }
        }
    });
    
    // Add installation/removal services if needed
    if (workOrderData.serviceType === 'install' && 
        document.getElementById('includeInstallation') && 
        document.getElementById('includeInstallation').checked) {
        workOrderData.items.push({
            blindType: 'Installation',
            description: 'Blind Installation Service',
            quantity: '1',
            unitPrice: 75.00
        });
    }
    
    if (document.getElementById('includeRemoval') && 
        document.getElementById('includeRemoval').checked) {
        workOrderData.items.push({
            blindType: 'Removal',
            description: 'Removal of Old Blinds',
            unitPrice: 35.00,
            quantity: '1'
        });
    }
    
    // Validate that we have at least one item
    if (workOrderData.items.length === 0) {
        alert('Please add at least one item to the work order');
        return;
    }
    
    // Show the Will Call dialog for lead time selection
    showWillCallDialog(workOrderData);
}

// Function to show the Will Call dialog
function showWillCallDialog(workOrderData) {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'premium-modal';
    modalContainer.style.display = 'flex';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'premium-modal-content';
    
    // Create the dialog content
    modalContent.innerHTML = `
        <span class="premium-close-modal" onclick="closeWillCallDialog()">&times;</span>
        <h2 class="premium-subheader">Send to Will Call</h2>
        <p>Please select a lead time for this order:</p>
        
        <div class="premium-form-grid">
            <div class="premium-input-group">
                <label>Lead Time:</label>
                <select id="willCallLeadTime" class="premium-select">
                    <option value="2">2 Days</option>
                    <option value="5" selected>5 Days</option>
                </select>
            </div>
            
            <div class="premium-input-group">
                <label>Notes:</label>
                <textarea id="willCallNotes" class="premium-textarea" rows="3" placeholder="Optional order notes"></textarea>
            </div>
        </div>
        
        <div class="premium-details-container">
            <h3>Order Summary</h3>
            <p><strong>Client:</strong> ${workOrderData.clientName}</p>
            <p><strong>Items:</strong> ${workOrderData.items.length}</p>
        </div>
        
        <div class="premium-button-group">
            <button onclick="confirmWillCallOrder()" class="premium-button premium-primary">Confirm & Send to Will Call</button>
            <button onclick="closeWillCallDialog()" class="premium-button">Cancel</button>
        </div>
    `;
    
    // Append modal to body
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
    
    // Store workOrderData in window object for access by confirm function
    window.tempWorkOrderData = workOrderData;
}

// Function to close the Will Call dialog
function closeWillCallDialog() {
    const modal = document.querySelector('.premium-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    // Clear the temporary data
    window.tempWorkOrderData = null;
}

// Function to confirm and process Will Call order
function confirmWillCallOrder() {
    // Get the stored work order data
    const workOrderData = window.tempWorkOrderData;
    if (!workOrderData) {
        alert('Error: Work order data not found');
        closeWillCallDialog();
        return;
    }
    
    // Get lead time and notes
    const leadTime = parseInt(document.getElementById('willCallLeadTime').value);
    const notes = document.getElementById('willCallNotes').value;
    
    // Calculate expected date based on lead time
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + leadTime);
    
    // Create Will Call order
    const willCallOrder = {
        id: 'WC-' + Date.now().toString().slice(-6),
        order_id: workOrderData.id,
        client_name: workOrderData.clientName,
        client_phone: workOrderData.clientPhone,
        client_email: workOrderData.clientEmail,
        property_name: workOrderData.propertyName,
        client_type: workOrderData.clientType,
        lead_time: leadTime,
        order_date: new Date().toISOString(),
        expected_date: expectedDate.toISOString(),
        order_data: JSON.stringify(workOrderData.items),
        status: 'pending',
        notes: notes
    };
    
    // Save to both finalized orders and will call tables
    saveToDatabase(workOrderData, willCallOrder);
}

// Function to save to database or local storage
function saveToDatabase(workOrderData, willCallOrder) {
    // Try to use the API if available
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        // Save finalized order
        fetch('/api/finalized-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workOrderData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Now save will call order
                return fetch('/api/will-call-orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(willCallOrder)
                });
            } else {
                throw new Error('Failed to save finalized order: ' + data.message);
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                handleSaveSuccess();
            } else {
                throw new Error('Failed to save will call order: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Fall back to local storage
            saveToLocalStorage(workOrderData, willCallOrder);
            handleSaveSuccess();
        });
    } else {
        // Use local storage
        saveToLocalStorage(workOrderData, willCallOrder);
        handleSaveSuccess();
    }
}

// Function to save to localStorage
function saveToLocalStorage(workOrderData, willCallOrder) {
    // Save to finalized orders
    const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
    finalizedOrders.push(workOrderData);
    StorageUtil.save(StorageKeys.FINALIZED_ORDERS, finalizedOrders);
    
    // Save to will call orders
    const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    willCallOrders.push(willCallOrder);
    StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
}

// Function to handle successful save
function handleSaveSuccess() {
    // Close the dialog
    closeWillCallDialog();
    
    // Reset the form
    document.getElementById('workOrderForm').reset();
    document.getElementById('workOrderTable').querySelector('tbody').innerHTML = '';
    
    // Show success message
    alert('Order successfully sent to Will Call!');
    
    // Update will call tab if it's active
    if (document.getElementById('willCall')?.classList.contains('active')) {
        if (typeof updateWillCallTable === 'function') {
            updateWillCallTable();
        }
    }
}

// Function to delete will call order
function deleteWillCallOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    // Try API first, fall back to local storage
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
        fetch(`/api/will-call-orders/${orderId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateWillCallTable();
                alert('Order deleted successfully.');
            } else {
                console.error('Error deleting order:', data.message);
                deleteFromLocalStorage();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            deleteFromLocalStorage();
        });
    } else {
        deleteFromLocalStorage();
    }
    function deleteFromLocalStorage() {
        const willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        const newOrders = willCallOrders.filter(o => o.id !== orderId && o.order_id !== orderId);
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, newOrders);
        updateWillCallTable();
        alert('Order deleted successfully.');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Will Call tab script loading...');
    
    // Initialize storage keys if not already defined
    window.StorageKeys = window.StorageKeys || {};
    StorageKeys.WILL_CALL_ORDERS = 'blinds_will_call_orders';
    StorageKeys.FINALIZED_ORDERS = 'finalized_orders';
    
    // Initialize sample data
    initializeWillCallData();
    
    // Update the table
    updateWillCallTable();
    
    // Add event listeners
    const filterElement = document.getElementById('willCallFilter');
    if (filterElement) {
        filterElement.addEventListener('change', updateWillCallTable);
    }
    
    const searchElement = document.getElementById('willCallSearch');
    if (searchElement) {
        searchElement.addEventListener('input', updateWillCallTable);
    }
    
    // Add Will Call button to work orders tab
    const workOrdersTab = document.getElementById('workOrders');
    if (workOrdersTab) {
        const buttonGroup = workOrdersTab.querySelector('.premium-button-group');
        if (buttonGroup) {
            const willCallButton = document.createElement('button');
            willCallButton.type = 'button';
            willCallButton.className = 'premium-button';
            willCallButton.style.backgroundColor = '#f0ad4e';
            willCallButton.style.color = 'white';
            willCallButton.innerHTML = '🏭 Send to Will Call';
            willCallButton.onclick = sendToWillCall;
            
            // Add the button to the button group
            buttonGroup.appendChild(willCallButton);
        }
    }
    
    // Make functions globally available
    window.updateWillCallTable = updateWillCallTable;
    window.viewWillCallDetails = viewWillCallDetails;
    window.closeWillCallModal = closeWillCallModal;
    window.completeWillCallOrder = completeWillCallOrder;
    window.updateWillCallNotes = updateWillCallNotes;
    window.saveWillCallNotes = saveWillCallNotes;
    window.downloadWillCallList = downloadWillCallList;
    window.emailSupplier = emailSupplier;
    window.sendToWillCall = sendToWillCall;
    window.showWillCallDialog = showWillCallDialog;
    window.closeWillCallDialog = closeWillCallDialog;
    window.confirmWillCallOrder = confirmWillCallOrder;
    window.deleteWillCallOrder = deleteWillCallOrder;
    
    console.log('Will Call tab script loaded');
});