// core.js

// Global Variables
let clientAccounts = [];
let workOrders = [];
let scheduleItems = [];

// Storage Configuration
const StorageKeys = {
    INVENTORY: 'blinds_inventory',
    CLIENT_ACCOUNTS: 'blinds_client_accounts',
    WORK_ORDERS: 'blinds_work_orders',
    QUOTES: 'blinds_quotes',          // For saved quotes
    PICK_SHEETS: 'blinds_pick_sheets',
    SCHEDULE_ITEMS: 'blinds_schedule',
    WILL_CALL: 'blinds_will_call'     // Added this if needed
  };

const StorageUtil = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    },
    load: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }
};

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function createTableRow(cells) {
    const row = document.createElement('tr');
    cells.forEach(cell => {
        const td = document.createElement('td');
        td.innerHTML = cell;
        row.appendChild(td);
    });
    return row;
}

function getStatusBadge(status) {
    const badgeClasses = {
        'Pending': 'status-badge pending',
        'In Progress': 'status-badge in-progress',
        'Complete': 'status-badge complete',
        'Will Call': 'status-badge willcall',
        'CNC': 'status-badge cnc',
        'Dock': 'status-badge dock',
        'Cancelled': 'status-badge cancelled'
    };
    return `<span class="${badgeClasses[status] || 'status-badge pending'}">${status}</span>`;
}

// Navigation Functions
function toggleNav() {
    const sideNav = document.querySelector('.side-nav');
    sideNav.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
    activateInitialTab();
    setupTabSwitching();
});

// Activate Home tab initially
function activateInitialTab() {
    const homeTab = document.getElementById('home');
    const homeButton = document.querySelector('.nav-button[data-tab="home"]');

    if (homeTab) homeTab.classList.add('active');
    if (homeButton) homeButton.classList.add('active');
}

// Setup tab click switching
function setupTabSwitching() {
    const navButtons = document.querySelectorAll('.nav-button');
    const tabs = document.querySelectorAll('.tab-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            const targetTab = document.getElementById(tabName);

            if (!targetTab) return; // Safety: if no matching tab, do nothing

            // Deactivate all
            tabs.forEach(tab => tab.classList.remove('active'));
            navButtons.forEach(btn => btn.classList.remove('active'));

            // Activate selected
            targetTab.classList.add('active');
            button.classList.add('active');
        });
    });
}


// Core Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load saved inventory (used by multiple tabs)
    const savedInventory = StorageUtil.load(StorageKeys.INVENTORY);
    if (savedInventory && document.getElementById('inventoryTable')) {
        const inventoryTable = document.getElementById('inventoryTable').querySelector('tbody');
        inventoryTable.innerHTML = '';
        savedInventory.forEach(row => {
            const rowElement = createTableRow([
                row.itemNumber,
                row.size,
                row.sqft,
                row.pricePerSqft ? `$${row.pricePerSqft}` : '',
                `$${row.totalPrice}`
            ]);
            inventoryTable.appendChild(rowElement);
        });
    }

    // Close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
        const sideNav = document.querySelector('.side-nav');
        const menuButton = document.querySelector('.menu-button');
        if (window.innerWidth <= 768 && !sideNav.contains(e.target) && !menuButton.contains(e.target)) {
            sideNav.classList.remove('active');
        }
    });

    // Prevent zoom on mobile inputs
    document.addEventListener('gesturestart', e => e.preventDefault());
    
    // Force default tab to be active - ADDED CODE
    const defaultTab = document.getElementById('home');
    if (defaultTab) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        defaultTab.classList.add('active');
        defaultTab.classList.add('premium-tab');
        
        // Also activate the corresponding nav button
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-button[data-tab="home"]').classList.add('active');
    }
    
    // Set home tab as active by default (kept for compatibility)
    const homeButton = document.querySelector('.nav-button[data-tab="home"]');
    if (homeButton) {
        homeButton.click();
    }
});

// Add to core.js
function refreshCuttingOrders() {
    console.log("Global refresh cutting orders called");
    if (window.updateCuttingOrders) {
        window.updateCuttingOrders();
    } else {
        console.error("updateCuttingOrders is not available globally");
    }
}

// Expose globals to window for tab files
window.clientAccounts = clientAccounts;
window.workOrders = workOrders;
window.scheduleItems = scheduleItems;
window.StorageUtil = StorageUtil;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.createTableRow = createTableRow;
window.getStatusBadge = getStatusBadge;