// installDelivery.js - Rewritten version to connect with finalized work orders

// Storage keys for different data collections
StorageKeys.FINALIZED_ORDERS = 'finalized_orders';
StorageKeys.DELIVERY_SCHEDULE = 'delivery_schedule';

// Function to load work orders that need to be scheduled
function loadPendingWorkOrders() {
    const tbody = document.querySelector('#pendingOrdersTable tbody');
    if (!tbody) {
        console.error('Pending orders table body not found');
        return;
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    // Load finalized orders from storage
    const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Get orders that haven't been scheduled yet
    const scheduledOrderIds = deliverySchedule.map(item => item.orderId);
    const pendingOrders = finalizedOrders.filter(order => 
        !scheduledOrderIds.includes(order.id) && 
        order.serviceType !== 'pickup' // Exclude pickup orders
    );
    
    if (pendingOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending orders found</td></tr>';
        return;
    }
    
    // Add each pending order to the table
    pendingOrders.forEach(order => {
        const itemCount = order.items ? order.items.length : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.clientName}</td>
            <td>${order.propertyName || ''}</td>
            <td>${itemCount} items</td>
            <td>${order.serviceType || 'delivery'}</td>
            <td>
                <button onclick="scheduleOrder('${order.id}')" class="standard-action-button">Schedule</button>
                <button onclick="viewOrderDetails('${order.id}')" class="standard-view-button">View Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Function to filter the delivery schedule
function filterSchedule(type) {
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) {
        console.error('Schedule table body not found');
        return;
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    // Load the delivery schedule
    const scheduleItems = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Filter based on type
    const filteredItems = type === 'all' 
        ? scheduleItems 
        : scheduleItems.filter(item => item.type === type);
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No scheduled items found</td></tr>';
        return;
    }
    
    // Add each item to the table
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.time || 'TBD'}</td>
            <td>${item.type}</td>
            <td>${item.clientName} <span class="client-type-badge">${item.clientType || ''}</span></td>
            <td>${item.address || ''}</td>
            <td>${item.items || ''}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button onclick="updateStatus('${item.id}', 'in-progress')" class="standard-action-button">Start</button>
                <button onclick="updateStatus('${item.id}', 'complete')" class="standard-action-button">Complete</button>
                <button onclick="viewScheduleDetails('${item.id}')" class="standard-view-button">Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Function to filter by client type
function filterByClientType(clientType) {
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) {
        console.error('Schedule table body not found');
        return;
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    // Load the delivery schedule
    const scheduleItems = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Filter based on client type
    const filteredItems = clientType === 'all' 
        ? scheduleItems 
        : scheduleItems.filter(item => item.clientType === clientType);
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No scheduled items found</td></tr>';
        return;
    }
    
    // Add each item to the table
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.time || 'TBD'}</td>
            <td>${item.type}</td>
            <td>${item.clientName} <span class="client-type-badge">${item.clientType || ''}</span></td>
            <td>${item.address || ''}</td>
            <td>${item.items || ''}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button onclick="updateStatus('${item.id}', 'in-progress')" class="standard-action-button">Start</button>
                <button onclick="updateStatus('${item.id}', 'complete')" class="standard-action-button">Complete</button>
                <button onclick="viewScheduleDetails('${item.id}')" class="standard-view-button">Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Function to schedule a new order
function scheduleOrder(orderId) {
    // Load the finalized orders
    const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
    const order = finalizedOrders.find(o => o.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Create the schedule modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'details-modal';
    modalContainer.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;';
    
    // Format items for display
    let itemsDescription = '';
    if (order.items && order.items.length > 0) {
        itemsDescription = order.items.map(item => 
            `${item.quantity}x ${item.blindType} (${item.width}" x ${item.length}")`
        ).join(', ');
    }
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'details-content';
    modalContent.style = 'background:#000; border:2px solid #bc9355; padding:20px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative; color:white;';
    modalContent.innerHTML = `
        <h3>Schedule Delivery/Installation</h3>
        <div class="schedule-details">
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Client:</strong> ${order.clientName}</p>
            <p><strong>Property:</strong> ${order.propertyName || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.clientPhone || 'N/A'}</p>
            <p><strong>Email:</strong> ${order.clientEmail || 'N/A'}</p>
            <p><strong>Service Type:</strong> ${order.serviceType || 'delivery'}</p>
            <p><strong>Items:</strong> ${itemsDescription}</p>
            
            <div class="schedule-form">
                <div class="input-group">
                    <label for="scheduleDate">Date:</label>
                    <input type="date" id="scheduleDate" class="premium-input" required>
                </div>
                
                <div class="input-group">
                    <label for="scheduleTime">Time:</label>
                    <input type="time" id="scheduleTime" class="premium-input" required>
                </div>
                
                <div class="input-group">
                    <label for="assignedStaff">Assign To:</label>
                    <select id="assignedStaff" class="premium-select">
                        <option value="">Select Staff...</option>
                        <option value="driver1">Driver 1</option>
                        <option value="driver2">Driver 2</option>
                        <option value="installer1">Installer 1</option>
                        <option value="installer2">Installer 2</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="scheduleNotes">Notes:</label>
                    <textarea id="scheduleNotes" class="premium-textarea" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="button-group">
            <button onclick="confirmSchedule('${order.id}')" class="premium-button premium-primary">Confirm Schedule</button>
            <button onclick="document.body.removeChild(this.closest('.details-modal'))" class="premium-button">Cancel</button>
        </div>
    `;
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('scheduleDate').valueAsDate = tomorrow;
}

// Function to confirm scheduling an order
function confirmSchedule(orderId) {
    // Get schedule details
    const scheduleDate = document.getElementById('scheduleDate').value;
    const scheduleTime = document.getElementById('scheduleTime').value;
    const assignedStaff = document.getElementById('assignedStaff').value;
    const scheduleNotes = document.getElementById('scheduleNotes').value;
    
    if (!scheduleDate || !scheduleTime) {
        alert('Please select a date and time');
        return;
    }
    
    // Load the necessary data
    const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Find the order
    const order = finalizedOrders.find(o => o.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Format items for schedule
    let itemsDescription = '';
    if (order.items && order.items.length > 0) {
        const itemCount = order.items.reduce((total, item) => {
            return total + parseInt(item.quantity || 1);
        }, 0);
        
        itemsDescription = `${itemCount} items (${order.items.map(item => item.blindType).join(', ')})`;
    }
    
    // Create a new schedule item
    const scheduleItem = {
        id: 'SCH-' + Date.now().toString().slice(-6),
        orderId: order.id,
        date: scheduleDate,
        time: scheduleTime,
        clientName: order.clientName,
        clientType: order.clientType || 'residential',
        propertyName: order.propertyName || '',
        address: order.propertyName || 'Client address not provided',
        type: order.serviceType === 'install' ? 'install' : 'delivery',
        items: itemsDescription,
        status: 'pending',
        staff: assignedStaff || '',
        notes: scheduleNotes || '',
        createdAt: new Date().toISOString()
    };
    
    // Add to delivery schedule
    deliverySchedule.push(scheduleItem);
    StorageUtil.save(StorageKeys.DELIVERY_SCHEDULE, deliverySchedule);
    
    // Close the modal
    document.querySelectorAll('.details-modal').forEach(modal => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    });
    
    // Refresh the tables
    loadPendingWorkOrders();
    filterSchedule('all');
    
    alert('Order scheduled successfully!');
}

// Function to view order details
function viewOrderDetails(orderId) {
    // Load the finalized orders
    const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
    const order = finalizedOrders.find(o => o.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Create the details modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'details-modal';
    modalContainer.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;';
    
    // Generate items table
    let itemsTable = '<table class="premium-table"><thead><tr><th>Item</th><th>Size</th><th>Quantity</th></tr></thead><tbody>';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            itemsTable += `<tr>
                <td>${item.blindType}</td>
                <td>${item.width}" x ${item.length}"</td>
                <td>${item.quantity}</td>
            </tr>`;
        });
    }
    itemsTable += '</tbody></table>';
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'details-content';
    modalContent.style = 'background:#000; border:2px solid #bc9355; padding:20px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative; color:white;';
    modalContent.innerHTML = `
        <h3>Order Details</h3>
        <div class="order-details">
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Date Created:</strong> ${new Date(order.dateCreated).toLocaleString()}</p>
            <p><strong>Client:</strong> ${order.clientName}</p>
            <p><strong>Property:</strong> ${order.propertyName || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.clientPhone || 'N/A'}</p>
            <p><strong>Email:</strong> ${order.clientEmail || 'N/A'}</p>
            <p><strong>Client Type:</strong> ${order.clientType || 'residential'}</p>
            <p><strong>Service Type:</strong> ${order.serviceType || 'delivery'}</p>
            
            <h4>Items</h4>
            ${itemsTable}
        </div>
        <button onclick="document.body.removeChild(this.closest('.details-modal'))" class="premium-button" style="margin-top:20px;">Close</button>
    `;
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
}

// Function to view schedule details
function viewScheduleDetails(scheduleId) {
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    const schedule = deliverySchedule.find(s => s.id === scheduleId);
    
    if (!schedule) {
        alert('Schedule not found');
        return;
    }
    
    // Create the details modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'details-modal';
    modalContainer.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;';
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'details-content';
    modalContent.style = 'background:#000; border:2px solid #bc9355; padding:20px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative; color:white;';
    modalContent.innerHTML = `
        <h3>Delivery/Installation Details</h3>
        <div class="schedule-details">
            <p><strong>Schedule ID:</strong> ${schedule.id}</p>
            <p><strong>Order ID:</strong> ${schedule.orderId}</p>
            <p><strong>Client:</strong> ${schedule.clientName}</p>
            <p><strong>Address:</strong> ${schedule.address || 'N/A'}</p>
            <p><strong>Date:</strong> ${schedule.date ? new Date(schedule.date).toLocaleDateString() : 'TBD'}</p>
            <p><strong>Scheduled Time:</strong> ${schedule.time || 'TBD'}</p>
            <p><strong>Type:</strong> ${schedule.type}</p>
            <p><strong>Status:</strong> ${schedule.status}</p>
            <p><strong>Items:</strong> ${schedule.items || 'N/A'}</p>
            <p><strong>Assigned Staff:</strong> ${schedule.staff || 'Not assigned'}</p>
            <p><strong>Notes:</strong> ${schedule.notes || 'No notes'}</p>
            
            <div class="assign-staff">
                <label for="assignStaff">Assign Staff:</label>
                <select id="assignStaff" class="premium-select">
                    <option value="">Select Staff...</option>
                    <option value="driver1">Driver 1</option>
                    <option value="driver2">Driver 2</option>
                    <option value="installer1">Installer 1</option>
                    <option value="installer2">Installer 2</option>
                </select>
                <button onclick="assignStaffToSchedule('${schedule.id}')" class="premium-button">Assign</button>
            </div>
            
            <div class="schedule-time">
                <label for="updateTime">Update Time:</label>
                <input type="time" id="updateTime" class="premium-input" value="${schedule.time || ''}">
                <button onclick="updateScheduleTime('${schedule.id}')" class="premium-button">Update</button>
            </div>
            
            <div class="delivery-notes">
                <label for="deliveryNotes">Update Notes:</label>
                <textarea id="deliveryNotes" class="premium-textarea" rows="3">${schedule.notes || ''}</textarea>
                <button onclick="updateDeliveryNotes('${schedule.id}')" class="premium-button">Save Notes</button>
            </div>
        </div>
        <button onclick="document.body.removeChild(this.closest('.details-modal'))" class="premium-button" style="margin-top:20px;">Close</button>
    `;
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
}

// Function to update delivery status
function updateStatus(scheduleId, status) {
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Find and update the schedule
    const scheduleIndex = deliverySchedule.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex !== -1) {
        deliverySchedule[scheduleIndex].status = status;
        
        // Save the updated schedule
        StorageUtil.save(StorageKeys.DELIVERY_SCHEDULE, deliverySchedule);
        
        // Refresh the display
        filterSchedule('all');
    } else {
        alert('Schedule not found');
    }
}

// Function to assign staff to a schedule
function assignStaffToSchedule(scheduleId) {
    const staffSelect = document.getElementById('assignStaff');
    if (!staffSelect) return;
    
    const staff = staffSelect.value;
    if (!staff) {
        alert('Please select a staff member');
        return;
    }
    
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Find and update the schedule
    const scheduleIndex = deliverySchedule.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex !== -1) {
        deliverySchedule[scheduleIndex].staff = staff;
        
        // Save the updated schedule
        StorageUtil.save(StorageKeys.DELIVERY_SCHEDULE, deliverySchedule);
        
        // Close the modal and refresh the display
        document.querySelectorAll('.details-modal').forEach(modal => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
        
        filterSchedule('all');
        
        alert(`Staff member assigned: ${staff}`);
    } else {
        alert('Schedule not found');
    }
}

// Function to update schedule time
function updateScheduleTime(scheduleId) {
    const timeInput = document.getElementById('updateTime');
    if (!timeInput) return;
    
    const time = timeInput.value;
    if (!time) {
        alert('Please select a time');
        return;
    }
    
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Find and update the schedule
    const scheduleIndex = deliverySchedule.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex !== -1) {
        deliverySchedule[scheduleIndex].time = time;
        
        // Save the updated schedule
        StorageUtil.save(StorageKeys.DELIVERY_SCHEDULE, deliverySchedule);
        
        // Close the modal and refresh the display
        document.querySelectorAll('.details-modal').forEach(modal => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
        
        filterSchedule('all');
        
        alert('Schedule time updated successfully');
    } else {
        alert('Schedule not found');
    }
}

// Function to update delivery notes
function updateDeliveryNotes(scheduleId) {
    const notesInput = document.getElementById('deliveryNotes');
    if (!notesInput) return;
    
    const notes = notesInput.value;
    
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Find and update the schedule
    const scheduleIndex = deliverySchedule.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex !== -1) {
        deliverySchedule[scheduleIndex].notes = notes;
        
        // Save the updated schedule
        StorageUtil.save(StorageKeys.DELIVERY_SCHEDULE, deliverySchedule);
        
        // Close the modal and refresh the display
        document.querySelectorAll('.details-modal').forEach(modal => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
        
        filterSchedule('all');
        
        alert('Delivery notes updated successfully');
    } else {
        alert('Schedule not found');
    }
}

// Function to upload photos for an order
function uploadPhotos() {
    const orderNum = document.getElementById('photoOrderNum').value;
    const photoInput = document.getElementById('photoUpload');
    const files = photoInput.files;
    
    if (!orderNum) {
        alert('Please enter an order number');
        return;
    }
    
    if (files.length === 0) {
        alert('Please select photos to upload');
        return;
    }
    
    // Load the photo documentation
    const photoDocumentation = StorageUtil.load('photo_documentation') || {};
    
    // Create entry for this order if it doesn't exist
    if (!photoDocumentation[orderNum]) {
        photoDocumentation[orderNum] = [];
    }
    
    // Process each file
    const photoGrid = document.querySelector('.photo-grid');
    photoGrid.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create image and add to grid
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Installation photo';
            photoGrid.appendChild(img);
            
            // Save to storage
            photoDocumentation[orderNum].push({
                date: new Date().toISOString(),
                dataUrl: e.target.result
            });
            
            // Save after all files are processed
            if (photoDocumentation[orderNum].length === files.length) {
                StorageUtil.save('photo_documentation', photoDocumentation);
                alert('Photos uploaded successfully');
            }
        };
        reader.readAsDataURL(file);
    });
}

// Function to get a status badge HTML
function getStatusBadge(status) {
    const statusClasses = {
        'pending': 'status-badge status-pending',
        'in-progress': 'status-badge status-in-progress',
        'complete': 'status-badge status-complete',
        'cancelled': 'status-badge status-cancelled'
    };
    
    const statusText = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'complete': 'Complete',
        'cancelled': 'Cancelled'
    };
    
    const className = statusClasses[status] || statusClasses.pending;
    const text = statusText[status] || 'Pending';
    
    return `<span class="${className}">${text}</span>`;
}

// Function to plan delivery routes
function updateRoutes() {
    const routeDate = document.getElementById('routeDate')?.value;
    const staffMember = document.getElementById('staffSelect')?.value;
    
    if (!routeDate) {
        console.warn('Route date not selected');
        return;
    }
    
    // Load the delivery schedule
    const deliverySchedule = StorageUtil.load(StorageKeys.DELIVERY_SCHEDULE) || [];
    
    // Filter by date and staff if selected
    const filteredRoutes = deliverySchedule.filter(item => {
        const dateMatch = item.date === routeDate;
        const staffMatch = !staffMember || item.staff === staffMember;
        return dateMatch && staffMatch;
    });
    
    const routesList = document.getElementById('routesList');
    if (!routesList) return;
    
    // Clear the list
    routesList.innerHTML = '';
    
    if (filteredRoutes.length === 0) {
        routesList.innerHTML = '<div class="route-item"><p>No routes scheduled for this date</p></div>';
        return;
    }
    
    // Sort by time
    filteredRoutes.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });
    
    // Add to the list
    filteredRoutes.forEach(route => {
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.innerHTML = `
            <div class="route-time">${route.time || 'TBD'}</div>
            <div class="route-details">
                <p><strong>${route.clientName}</strong> - ${route.type}</p>
                <p>${route.address || ''}</p>
                <p>${route.items || ''}</p>
            </div>
            <div class="route-status">${getStatusBadge(route.status)}</div>
        `;
        routesList.appendChild(routeItem);
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add tab click listeners to clean up modals
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.details-modal').forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });
        });
    });
    
    // Load pending orders and schedule
    loadPendingWorkOrders();
    filterSchedule('all');
    
    // Set default date for route planning to today
    const datePicker = document.getElementById('routeDate');
    if (datePicker) datePicker.valueAsDate = new Date();
    
    // Add event listeners for route planning
    document.getElementById('routeDate')?.addEventListener('change', updateRoutes);
    document.getElementById('staffSelect')?.addEventListener('change', updateRoutes);
    
    // Initial route update
    updateRoutes();
});

// Make functions available globally
window.loadPendingWorkOrders = loadPendingWorkOrders;
window.filterSchedule = filterSchedule;
window.filterByClientType = filterByClientType;
window.scheduleOrder = scheduleOrder;
window.confirmSchedule = confirmSchedule;
window.viewOrderDetails = viewOrderDetails;
window.viewScheduleDetails = viewScheduleDetails;
window.updateStatus = updateStatus;
window.assignStaffToSchedule = assignStaffToSchedule;
window.updateScheduleTime = updateScheduleTime;
window.updateDeliveryNotes = updateDeliveryNotes;
window.uploadPhotos = uploadPhotos;
window.updateRoutes = updateRoutes;