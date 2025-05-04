// willCall.js - Fixed Version

// Make StorageKeys accessible globally if not already defined
window.StorageKeys = window.StorageKeys || {
    WILL_CALL_ORDERS: 'blinds_will_call_orders'
};

// Global will-call orders array (loaded from StorageUtil)
let willCallOrders = [];

function updateWillCallTable() {
    console.log("updateWillCallTable function called");
    
    // Load data from storage
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    console.log("Loaded will call orders:", willCallOrders);
    
    const willCallTable = document.getElementById('willCallTable')?.querySelector('tbody');
    if (!willCallTable) {
        console.error("Will Call table body not found");
        return;
    }
    
    const filterValue = document.getElementById('willCallFilter')?.value || 'all';
    const searchValue = document.getElementById('willCallSearch')?.value?.toLowerCase() || '';
    willCallTable.innerHTML = '';

    const filteredOrders = willCallOrders.filter(order => {
        const matchesFilter = filterValue === 'all' || order.status === filterValue;
        const matchesSearch = searchValue === '' || 
            order.orderId?.toLowerCase().includes(searchValue) ||
            order.client?.toLowerCase().includes(searchValue) ||
            order.items?.some(item => item.toLowerCase().includes(searchValue));
        return matchesFilter && matchesSearch;
    });

    if (filteredOrders.length === 0) {
        willCallTable.innerHTML = '<tr><td colspan="5" class="text-center">No will-call orders found</td></tr>';
        return;
    }

    filteredOrders.forEach(order => {
        const row = createTableRow([
            order.orderId,
            order.client,
            order.items.join(', ') || 'N/A',
            `<span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span>`,
            `<div class="premium-button-group" style="display: flex; gap: 8px;">
                <button onclick="editWillCallOrder('${order.orderId}')" class="premium-button premium-secondary">Edit</button>
                <button onclick="completeWillCallOrder('${order.orderId}')" class="premium-button premium-secondary">Complete</button>
                <button onclick="deleteWillCallOrder('${order.orderId}')" class="premium-button premium-cancel">Delete</button>
            </div>`
        ]);
        willCallTable.appendChild(row);
    });
}

function addWillCallOrder() {
    const orderId = prompt('Enter Order ID:');
    if (!orderId) return;
    
    const client = prompt('Enter Client Name:');
    if (!client) return;
    
    const items = prompt('Enter Items (comma-separated):')?.split(',').map(item => item.trim()) || [];
    
    const order = {
        orderId,
        client,
        items,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    willCallOrders.push(order);
    StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
    updateWillCallTable();
    alert('Will-call order added successfully!');
}

function editWillCallOrder(orderId) {
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    const order = willCallOrders.find(o => o.orderId === orderId);
    if (order) {
        const newClient = prompt('Enter new Client Name:', order.client);
        const newItems = prompt('Enter new Items (comma-separated):', order.items.join(', '))?.split(',').map(item => item.trim()) || [];
        order.client = newClient || order.client;
        order.items = newItems.length ? newItems : order.items;
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
        updateWillCallTable();
        alert('Will-call order updated successfully!');
    }
}

function completeWillCallOrder(orderId) {
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    const order = willCallOrders.find(o => o.orderId === orderId);
    if (order) {
        order.status = 'completed';
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
        updateWillCallTable();
        alert('Will-call order marked as completed!');
    }
}

function deleteWillCallOrder(orderId) {
    if (confirm(`Are you sure you want to delete will-call order ${orderId}?`)) {
        willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
        willCallOrders = willCallOrders.filter(o => o.orderId !== orderId);
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, willCallOrders);
        updateWillCallTable();
        alert('Will-call order deleted successfully!');
    }
}

function downloadWillCallList() {
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    const data = willCallOrders.map(order => ({
        'Order #': order.orderId,
        'Client': order.client,
        'Items': order.items.join(', '),
        'Status': order.status,
        'Date': formatDate(order.date)
    }));
    
    if (typeof XLSX === 'undefined') {
        console.error("XLSX library not available");
        alert('Error: Excel library not loaded. Please refresh the page and try again.');
        return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WillCallOrders');
    XLSX.writeFile(workbook, 'WillCallOrders.xlsx');
    alert('Will-call list downloaded successfully!');
}

function emailSupplier() {
    willCallOrders = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS) || [];
    const subject = 'Will Call Orders Update';
    const body = willCallOrders.map(order => `
        Order #: ${order.orderId}
        Client: ${order.client}
        Items: ${order.items.join(', ')}
        Status: ${order.status}
        Date: ${formatDate(order.date)}
    `).join('\n\n');
    const mailtoLink = `mailto:supplier@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    alert('Email to supplier initiated!');
}

// Add sample data if none exists
function initializeWillCallData() {
    const existingData = StorageUtil.load(StorageKeys.WILL_CALL_ORDERS);
    if (!existingData || existingData.length === 0) {
        const sampleData = [
            {
                orderId: "WC-1001",
                client: "John Smith",
                items: ["2x Faux Wood Blinds", "3x Vertical Blinds"],
                status: "pending",
                date: new Date().toISOString()
            },
            {
                orderId: "WC-1002",
                client: "Jane Doe",
                items: ["5x Roller Shades", "1x Custom Blind"],
                status: "completed",
                date: new Date().toISOString()
            }
        ];
        StorageUtil.save(StorageKeys.WILL_CALL_ORDERS, sampleData);
        console.log("Initialized sample will call data");
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Will Call tab script loading...');
    
    // Initialize sample data
    initializeWillCallData();
    
    // Update the table
    updateWillCallTable();
    
    // Add filters and search listeners
    const filterElement = document.getElementById('willCallFilter');
    if (filterElement) {
        filterElement.addEventListener('change', updateWillCallTable);
    } else {
        console.warn("Will Call filter element not found");
    }
    
    const searchElement = document.getElementById('willCallSearch');
    if (searchElement) {
        searchElement.addEventListener('input', updateWillCallTable);
    } else {
        console.warn("Will Call search element not found");
    }
    
    // Make functions globally available
    window.updateWillCallTable = updateWillCallTable;
    window.addWillCallOrder = addWillCallOrder;
    window.editWillCallOrder = editWillCallOrder;
    window.completeWillCallOrder = completeWillCallOrder;
    window.deleteWillCallOrder = deleteWillCallOrder;
    window.downloadWillCallList = downloadWillCallList;
    window.emailSupplier = emailSupplier;
    
    console.log('Will Call tab script loaded');
});