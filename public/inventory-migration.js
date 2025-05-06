// inventory-migration.js - Helper to migrate from localStorage to database

// This script should be added to your index.html after the core.js and before inventory.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Attempt to migrate inventory data when page loads
    migrateInventoryToDatabase();
});

// Function to migrate localStorage inventory to database
function migrateInventoryToDatabase() {
    console.log("Checking for inventory data to migrate to database...");
    
    // First, check if we have inventory in localStorage
    const localInventory = StorageUtil.load(StorageKeys.INVENTORY);
    
    if (!localInventory || !Array.isArray(localInventory) || localInventory.length === 0) {
        console.log("No inventory found in localStorage to migrate");
        return;
    }
    
    console.log(`Found ${localInventory.length} inventory items in localStorage to migrate`);
    
    // Check if we already migrated by looking for a flag
    const migrationCompleted = localStorage.getItem('inventory_migration_completed');
    if (migrationCompleted === 'true') {
        console.log("Inventory migration was already completed previously");
        return;
    }
    
    // Show migration status to user
    const statusElement = document.createElement('div');
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '10px';
    statusElement.style.right = '10px';
    statusElement.style.background = '#1e3d59';
    statusElement.style.color = 'white';
    statusElement.style.padding = '10px';
    statusElement.style.borderRadius = '5px';
    statusElement.style.zIndex = '9999';
    statusElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    statusElement.textContent = `Migrating ${localInventory.length} inventory items to database...`;
    document.body.appendChild(statusElement);
    
    // Send inventory to database
    fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: localInventory })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data));
        }
        return response.json();
    })
    .then(data => {
        console.log("Inventory migration successful:", data);
        
        // Set migration completed flag
        localStorage.setItem('inventory_migration_completed', 'true');
        
        // Update status element
        statusElement.style.background = '#4CAF50';
        statusElement.textContent = 'Inventory successfully migrated to database!';
        
        // Remove status element after 5 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transition = 'opacity 1s';
            setTimeout(() => statusElement.remove(), 1000);
        }, 5000);
        
        // Refresh inventory table if it's visible
        if (document.getElementById('inventory').classList.contains('active')) {
            if (typeof loadInventoryFromDatabase === 'function') {
                loadInventoryFromDatabase();
            }
        }
    })
    .catch(error => {
        console.error("Inventory migration failed:", error);
        
        // Update status element to show error
        statusElement.style.background = '#F44336';
        statusElement.textContent = 'Inventory migration failed. Will try again next time.';
        
        // Remove status element after 8 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transition = 'opacity 1s';
            setTimeout(() => statusElement.remove(), 1000);
        }, 8000);
    });
}