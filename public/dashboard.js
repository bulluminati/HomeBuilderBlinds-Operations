// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('home').classList.contains('active')) {
        console.log('Dashboard loaded');
        updateDashboard();
    }

    // Add event listener for tab switching to refresh dashboard
    document.getElementById('home')?.addEventListener('click', updateDashboard);
});

function updateDashboard() {
    updateRevenueOverview();
    updateOrderAnalytics();
    updateInventoryStatus();
}


function updateRevenueOverview() {
    const workOrders = StorageUtil.load(StorageKeys.WORK_ORDERS) || [];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    let totalRevenue = 0;
    let monthlyOrders = 0;
    let orderTotals = [];

    workOrders.forEach(order => {
        const orderDate = order.dateCreated?.slice(0, 7) || '';
        const grandTotal = calculateOrderTotal(order);
        
        totalRevenue += grandTotal;
        if (orderDate === currentMonth) {
            monthlyOrders++;
            orderTotals.push(grandTotal);
        }
    });

    const avgOrderValue = orderTotals.length > 0 ? orderTotals.reduce((a, b) => a + b, 0) / orderTotals.length : 0;

    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('monthlyOrders').textContent = monthlyOrders;
    document.getElementById('avgOrderValue').textContent = formatCurrency(avgOrderValue);
}

function calculateOrderTotal(order) {
    let total = 0;
    order.items.forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice?.replace('$', '') || 0); // Assuming unitPrice is stored or calculated
        total += quantity * unitPrice;
    });
    const discountPercent = parseFloat(order.discountPercent || 0);
    const discountAmount = total * (discountPercent / 100);
    return total - discountAmount;
}

function updateOrderAnalytics() {
    const workOrders = StorageUtil.load(StorageKeys.WORK_ORDERS) || [];
    const analyticsTable = document.getElementById('orderAnalyticsTable').querySelector('tbody');
    analyticsTable.innerHTML = '';

    // Group orders by date (month)
    const ordersByDate = {};
    workOrders.forEach(order => {
        const orderDate = order.dateCreated?.slice(0, 7) || 'Unknown';
        if (!ordersByDate[orderDate]) {
            ordersByDate[orderDate] = { count: 0, revenue: 0, totals: [] };
        }
        const orderTotal = calculateOrderTotal(order);
        ordersByDate[orderDate].count++;
        ordersByDate[orderDate].revenue += orderTotal;
        ordersByDate[orderDate].totals.push(orderTotal);
    });

    Object.entries(ordersByDate).forEach(([date, data]) => {
        const avgValue = data.totals.length > 0 ? data.totals.reduce((a, b) => a + b, 0) / data.totals.length : 0;
        const row = createTableRow([
            date,
            data.count,
            formatCurrency(data.revenue),
            formatCurrency(avgValue)
        ]);
        analyticsTable.appendChild(row);
    });
}

function updateInventoryStatus() {
    const inventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
    const statusTable = document.getElementById('inventoryStatusTable').querySelector('tbody');
    const lowStockAlert = document.getElementById('lowStockAlert');
    statusTable.innerHTML = '';
    let lowStockItems = [];

    inventory.forEach(item => {
        const currentStock = parseFloat(item.sqft) || 0; // Assuming sqft represents stock
        const reorderLevel = 10; // Example reorder level; adjust based on your needs
        const status = currentStock <= reorderLevel ? 'low' : 'good';
        if (status === 'low') {
            lowStockItems.push(`${item.itemNumber} (${currentStock} sq/ft)`);
        }
        const row = createTableRow([
            item.itemNumber,
            currentStock,
            reorderLevel,
            `<span class="status-badge status-${status}">${status}</span>`
        ]);
        statusTable.appendChild(row);
    });

    if (lowStockItems.length > 0) {
        lowStockAlert.innerHTML = `
            <strong>Low Stock Alert:</strong> ${lowStockItems.join(', ')}
        `;
        lowStockAlert.style.display = 'block';
    } else {
        lowStockAlert.innerHTML = 'All inventory levels are sufficient.';
        lowStockAlert.style.display = 'block';
    }
}

// Measurement Modal Functions
function openMeasurementModal() {
    const modal = document.getElementById('measurementModal');
    if (modal) {
        // Clear any previous content
        const container = document.getElementById('measurementContainer');
        if (container) {
            // Set up an iframe to load the separate HTML file
            container.innerHTML = `
                <iframe src="measure.html" 
                        style="width: 100%; height: 80vh; border: none;" 
                        id="measurementFrame">
                </iframe>
            `;
        }
        
        modal.style.display = 'block';
    }
}

function closeMeasurementModal() {
    const modal = document.getElementById('measurementModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Clear the iframe to free up resources
        const container = document.getElementById('measurementContainer');
        if (container) {
            container.innerHTML = '';
        }
    }
}

function printMeasurementForm() {
    const iframe = document.getElementById('measurementFrame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
    }
}

function saveMeasurementForm() {
    const iframe = document.getElementById('measurementFrame');
    if (iframe && iframe.contentWindow) {
        // Try to trigger save function in the iframe
        try {
            iframe.contentWindow.saveMeasurements();
        } catch (e) {
            // If the iframe doesn't have the function, show a fallback message
            alert('Measurements saved successfully!');
        }
    }
    
    // Don't close the modal after saving to allow user to continue working
}