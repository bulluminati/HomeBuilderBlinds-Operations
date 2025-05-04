// installDelivery.js
// Enhanced filterSchedule function with better error handling and empty state
function filterSchedule(type) {
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) {
        console.error('Schedule table body not found');
        return;
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    // Load the latest schedule items
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Filter based on type
    const filteredItems = type === 'all' 
        ? scheduleItems 
        : scheduleItems.filter(item => item.type === type);
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No scheduled items found</td></tr>';
        return;
    }
    // Add this new function right after filterSchedule
function filterByClientType(clientType) {
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) {
        console.error('Schedule table body not found');
        return;
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    // Load the latest schedule items
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
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
            <td>${item.time}</td>
            <td>${item.type}</td>
            <td>${item.client} <span class="client-type-badge">${item.clientType || ''}</span></td>
            <td>${item.address}</td>
            <td>${item.items}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button onclick="updateStatus(${item.id}, 'in-progress')" class="standard-action-button standard-view-button">Start</button>
                <button onclick="updateStatus(${item.id}, 'complete')" class="standard-action-button standard-view-button">Complete</button>
                <button onclick="viewScheduleDetails(${item.id})" class="standard-action-button standard-view-button">Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}
    // Add each item to the table
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.time}</td>
            <td>${item.type}</td>
            <td>${item.client}</td>
            <td>${item.address}</td>
            <td>${item.items}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button onclick="updateStatus(${item.id}, 'in-progress')" class="standard-action-button standard-view-button">Start</button>
                <button onclick="updateStatus(${item.id}, 'complete')" class="standard-action-button standard-view-button">Complete</button>
                <button onclick="viewScheduleDetails(${item.id})" class="standard-action-button standard-view-button">Details</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Enhanced updateStatus function to ensure data is saved
function updateStatus(itemId, status) {
    // Load the latest data
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Find and update the item
    const itemIndex = scheduleItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        scheduleItems[itemIndex].status = status;
        
        // Save the updated items
        StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
        
        // Refresh the display
        filterSchedule('all');
    } else {
        console.error(`Schedule item with ID ${itemId} not found`);
    }
}

// Add a cleanup function to ensure modals are removed when switching tabs
function cleanupInstallDeliveryModals() {
    const modals = document.querySelectorAll('.details-modal');
    modals.forEach(modal => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    });
}

// Enhanced viewScheduleDetails function
function viewScheduleDetails(itemId) {
    console.log(`Viewing schedule details for item ${itemId}`);
    
    // Remove any existing modals first to prevent duplicates
    cleanupInstallDeliveryModals();
    
    // Load the latest data
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Find the item
    const item = scheduleItems.find(item => item.id === itemId);
    
    if (item) {
        // Create a more useful detailed view
        const detailsHTML = `
            <div class="schedule-details">
                <h3>Installation/Delivery Details</h3>
                <p><strong>Order ID:</strong> ${item.orderId}</p>
                <p><strong>Client:</strong> ${item.client}</p>
                <p><strong>Address:</strong> ${item.address}</p>
                <p><strong>Scheduled Time:</strong> ${item.time}</p>
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Status:</strong> ${item.status}</p>
                <p><strong>Items:</strong> ${item.items}</p>
                <p><strong>Assigned Staff:</strong> ${item.staff || 'Not assigned'}</p>
                
                <div class="assign-staff">
                    <label for="assignStaff">Assign Staff:</label>
                    <select id="assignStaff">
                        <option value="">Select Staff...</option>
                        <option value="driver1">Driver 1</option>
                        <option value="driver2">Driver 2</option>
                        <option value="installer1">Installer 1</option>
                        <option value="installer2">Installer 2</option>
                    </select>
                    <button onclick="assignStaffToItem(${itemId})">Assign</button>
                </div>
                
                <div class="schedule-time">
                    <label for="scheduleTime">Schedule Time:</label>
                    <input type="time" id="scheduleTime" value="${item.time !== 'TBD' ? item.time : ''}">
                    <button onclick="setScheduleTime(${itemId})">Set Time</button>
                </div>
            </div>
        `;
        
        // Create a single modal
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'details-modal';
        detailsContainer.style = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;';
        
        const detailsContent = document.createElement('div');
        detailsContent.innerHTML = detailsHTML;
        detailsContent.className = 'details-content';
        detailsContent.style = 'background:#000; border:2px solid #bc9355; padding:20px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative; color:white;';
        
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Close';
        closeButton.className = 'cancel-button';
        closeButton.style = 'margin-top:20px;';
        closeButton.onclick = () => document.body.removeChild(detailsContainer);
        
        detailsContent.appendChild(closeButton);
        detailsContainer.appendChild(detailsContent);
        document.body.appendChild(detailsContainer);
    } else {
        console.error(`Schedule item with ID ${itemId} not found`);
        alert('Details not found for this item.');
    }
}

function assignStaffToItem(itemId) {
    const staffSelect = document.getElementById('assignStaff');
    if (!staffSelect) return;
    
    const staff = staffSelect.value;
    if (!staff) {
        alert('Please select a staff member');
        return;
    }
    
    // Load the latest data
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Find and update the item
    const itemIndex = scheduleItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        scheduleItems[itemIndex].staff = staff;
        
        // Save the updated items
        StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
        
        // Close the modal and refresh the display
        cleanupInstallDeliveryModals();
        
        filterSchedule('all');
        
        alert(`Staff member assigned: ${staff}`);
    }
}

function setScheduleTime(itemId) {
    const timeInput = document.getElementById('scheduleTime');
    if (!timeInput) return;
    
    const time = timeInput.value;
    if (!time) {
        alert('Please select a time');
        return;
    }
    
    // Load the latest data
    const scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [];
    
    // Find and update the item
    const itemIndex = scheduleItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        scheduleItems[itemIndex].time = time;
        
        // Save the updated items
        StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
        
        // Close the modal and refresh the display
        cleanupInstallDeliveryModals();
        
        filterSchedule('all');
        
        alert(`Time scheduled: ${time}`);
    }
}

function saveDeliveryNotes() {
    const orderNum = document.getElementById('deliveryOrderNum').value;
    const notes = document.getElementById('deliveryNotes').value;
    if (!orderNum) {
        alert('Please enter an order number');
        return;
    }
    console.log('Saving delivery notes for order:', orderNum, notes);
    alert('Delivery notes saved successfully');
}

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
    const photoGrid = document.querySelector('.photo-grid');
    photoGrid.innerHTML = '';
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Installation photo';
            photoGrid.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function updateRoute() {
    const routeDate = document.getElementById('routeDate')?.value;
    const staffMember = document.getElementById('staffSelect')?.value;
    if (!routeDate || !staffMember) {
        console.warn('Route date or staff member not selected');
        return;
    }
    const filteredRoutes = scheduleItems.filter(item => item.date === routeDate && (!staffMember || item.staff === staffMember));
    console.log('Filtered routes:', filteredRoutes);
    // Add route display logic here if needed
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add tab click listeners to clean up modals
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            cleanupInstallDeliveryModals();
        });
    });
    
    scheduleItems = StorageUtil.load(StorageKeys.SCHEDULE_ITEMS) || [
        { id: 1, time: '9:00 AM', type: 'install', client: 'John Doe', address: '123 Main St', items: '3 Faux Wood Blinds', status: 'pending', date: new Date().toISOString().split('T')[0] },
        { id: 2, time: '11:00 AM', type: 'delivery', client: 'Jane Smith', address: '456 Oak Ave', items: '2 Vertical Blinds', status: 'pending', date: new Date().toISOString().split('T')[0] }
    ];
    StorageUtil.save(StorageKeys.SCHEDULE_ITEMS, scheduleItems);
    filterSchedule('all');
    const datePicker = document.getElementById('routeDate');
    if (datePicker) datePicker.valueAsDate = new Date();
    document.getElementById('routeDate')?.addEventListener('change', updateRoute);
    document.getElementById('staffSelect')?.addEventListener('change', updateRoute);
});