// inventory.js - Using SQLite database storage instead of localStorage

// Global cache of inventory items
let inventoryCache = [];
let isLoadingInventory = false;

// Function to upload inventory from Excel/ODS file
function uploadInventory() {
    const fileInput = document.getElementById('inventoryUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    console.log(`Starting import of inventory file: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { 
                type: 'array',
                cellDates: true,
                cellStyles: true,
                cellNF: true
            });
            
            // Find the first sheet
            const firstSheetName = workbook.SheetNames[0];
            console.log(`Processing sheet: ${firstSheetName}`);
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with raw values to preserve formats
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: true,
                defval: '',
                header: 'A'
            });
            
            // Log the headers to help with mapping
            if (jsonData.length > 0) {
                console.log("First row keys:", Object.keys(jsonData[0]));
                console.log("First row sample:", jsonData[0]);
            }
            
            // Try to auto-detect column headers or use defaults
            const headers = detectHeaders(jsonData);
            console.log("Detected headers:", headers);
            
            // Process the data and map to our standard format
            const processedInventory = processInventoryData(jsonData, headers);

            // Save to database via API
            saveInventoryToDatabase(processedInventory);
        } catch (error) {
            console.error('Error processing inventory file:', error);
            alert('Error processing inventory file: ' + error.message);
        }
    };
    
    reader.onerror = function(error) {
        console.error('Error reading file:', error);
        alert('Error reading file: ' + error.message);
    };
    
    reader.readAsArrayBuffer(file);
}

// Helper function to detect column headers
function detectHeaders(jsonData) {
    // Default header mapping - these will be our output keys
    const defaultHeaders = {
        itemNumber: null,
        size: null,
        sqft: null,
        pricePerSqft: null,
        totalPrice: null
    };
    
    if (jsonData.length === 0) return defaultHeaders;
    
    // Get the first row to analyze
    const firstRow = jsonData[0];
    const keys = Object.keys(firstRow);
    
    // Try to match keys to our expected headers
    // First, convert all keys to lowercase for comparison
    const lowercaseMapping = {};
    keys.forEach(key => {
        const value = firstRow[key];
        const keyLower = typeof value === 'string' ? value.toLowerCase() : '';
        lowercaseMapping[keyLower] = key;
    });
    
    // Look for item number/ID column
    if (lowercaseMapping['item number'] || lowercaseMapping['itemnumber'] || lowercaseMapping['item']) {
        defaultHeaders.itemNumber = lowercaseMapping['item number'] || lowercaseMapping['itemnumber'] || lowercaseMapping['item'];
    } else if (lowercaseMapping['id'] || lowercaseMapping['code']) {
        defaultHeaders.itemNumber = lowercaseMapping['id'] || lowercaseMapping['code'];
    } else {
        // If no obvious item number column, use the first column
        defaultHeaders.itemNumber = keys[0];
    }
    
    // Look for size column
    if (lowercaseMapping['size'] || lowercaseMapping['size (inches)'] || lowercaseMapping['dimensions']) {
        defaultHeaders.size = lowercaseMapping['size'] || lowercaseMapping['size (inches)'] || lowercaseMapping['dimensions'];
    } else if (lowercaseMapping['width x length'] || lowercaseMapping['width x height']) {
        defaultHeaders.size = lowercaseMapping['width x length'] || lowercaseMapping['width x height'];
    }
    
    // Look for square footage column
    if (lowercaseMapping['sq/ft'] || lowercaseMapping['sqft'] || lowercaseMapping['square feet']) {
        defaultHeaders.sqft = lowercaseMapping['sq/ft'] || lowercaseMapping['sqft'] || lowercaseMapping['square feet'];
    }
    
    // Look for price per square foot column
    if (lowercaseMapping['price/sqft'] || lowercaseMapping['price per sqft']) {
        defaultHeaders.pricePerSqft = lowercaseMapping['price/sqft'] || lowercaseMapping['price per sqft'];
    }
    
    // Look for total price column
    if (lowercaseMapping['price'] || lowercaseMapping['total price'] || lowercaseMapping['total']) {
        defaultHeaders.totalPrice = lowercaseMapping['price'] || lowercaseMapping['total price'] || lowercaseMapping['total'];
    }
    
    return defaultHeaders;
}

// Process raw JSON data to standard inventory format
function processInventoryData(jsonData, headers) {
    // Skip header row if present
    const dataRows = isHeaderRowPresent(jsonData) ? jsonData.slice(1) : jsonData;
    
    // Convert to standard format
    return dataRows.map((row, index) => {
        // Extract values using detected headers
        let itemNumber = headers.itemNumber ? row[headers.itemNumber] : `ITEM-${index + 1}`;
        let size = headers.size ? row[headers.size] : '';
        let sqft = headers.sqft ? parseFloat(row[headers.sqft]) || 0 : 0;
        let pricePerSqft = headers.pricePerSqft ? parseFloat(row[headers.pricePerSqft]) || 0 : 0;
        let totalPrice = headers.totalPrice ? parseFloat(row[headers.totalPrice]) || 0 : 0;
        
        // Auto-calculate values if missing
        // Calculate sqft if missing but size is provided
        if (sqft === 0 && size) {
            const dimensions = extractDimensions(size);
            if (dimensions.width && dimensions.length) {
                // Square footage = width × length in feet (divide by 144 to convert from sq inches)
                sqft = (dimensions.width * dimensions.length) / 144;
            }
        }
        
        // Calculate price if missing but we have sqft and pricePerSqft
        if (totalPrice === 0 && sqft > 0 && pricePerSqft > 0) {
            totalPrice = sqft * pricePerSqft;
        }
        
        // Calculate pricePerSqft if missing but we have totalPrice and sqft
        if (pricePerSqft === 0 && totalPrice > 0 && sqft > 0) {
            pricePerSqft = totalPrice / sqft;
        }
        
        // Generate size if missing but we have sqft
        if (!size && sqft > 0) {
            // Create a roughly square shape based on sqft
            const side = Math.sqrt(sqft * 144); // convert to square inches
            const width = Math.round(side * 2) / 2; // round to nearest 0.5 inch
            const length = Math.round(side * 2) / 2;
            size = `${width} x ${length}`;
        }
        
        return {
            itemNumber: itemNumber,
            size: size,
            sqft: sqft,
            pricePerSqft: pricePerSqft,
            totalPrice: totalPrice
        };
    }).filter(item => item.size); // Filter out items without a size
}

// Helper function to check if the first row is a header row
function isHeaderRowPresent(jsonData) {
    if (jsonData.length < 2) return false;
    
    // Check if first row contains strings that might be headers
    const firstRow = jsonData[0];
    const secondRow = jsonData[1];
    let headerCount = 0;
    
    for (const key in firstRow) {
        const firstVal = firstRow[key];
        const secondVal = secondRow[key];
        
        // If first row is string and second is number, likely a header
        if (typeof firstVal === 'string' && typeof secondVal === 'number') {
            headerCount++;
        }
        
        // If first row is string and includes common header terms
        if (typeof firstVal === 'string') {
            const lowerVal = firstVal.toLowerCase();
            if (lowerVal.includes('item') || lowerVal.includes('price') || 
                lowerVal.includes('size') || lowerVal.includes('sqft')) {
                headerCount++;
            }
        }
    }
    
    // If multiple potential headers found, assume first row is headers
    return headerCount >= 2;
}

// Extract width and length from a size string like "36 x 72" or "36" x 72""
function extractDimensions(sizeStr) {
    if (!sizeStr || typeof sizeStr !== 'string') {
        return { width: 0, length: 0 };
    }
    
    // Remove any non-numeric characters except x, X, decimal points
    const cleanSize = sizeStr.replace(/[^0-9xX.\s]/g, '');
    
    // Split by x or X
    const parts = cleanSize.split(/[xX]/);
    if (parts.length < 2) {
        return { width: 0, length: 0 };
    }
    
    // Convert to numbers and trim whitespace
    const width = parseFloat(parts[0].trim());
    const length = parseFloat(parts[1].trim());
    
    return {
        width: isNaN(width) ? 0 : width,
        length: isNaN(length) ? 0 : length
    };
}

// Save inventory to database
function saveInventoryToDatabase(inventoryItems) {
    // Show loading indicator
    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        inventoryTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">Saving inventory to database...</td></tr>';
    }
    
    // Send inventory to API
    fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: inventoryItems })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data));
        }
        return response.json();
    })
    .then(data => {
        console.log('Inventory saved to database:', data);
        alert(`Inventory saved successfully! ${inventoryItems.length} items stored in database.`);
        
        // Update inventory cache
        inventoryCache = inventoryItems;
        
        // Refresh the table
        updateInventoryTable();
        
        // Also keep a copy in localStorage as fallback
        try {
            StorageUtil.save(StorageKeys.INVENTORY, inventoryItems);
        } catch (e) {
            console.warn('Failed to save inventory to localStorage:', e);
        }
    })
    .catch(error => {
        console.error('Error saving inventory to database:', error);
        alert('Error saving inventory to database: ' + (error.message || 'Unknown error'));
        
        // Try to save to localStorage as fallback
        try {
            StorageUtil.save(StorageKeys.INVENTORY, inventoryItems);
            alert('Inventory saved to local storage as fallback. This will be lost when you restart your computer.');
        } catch (e) {
            console.error('Failed to save inventory to localStorage:', e);
        }
    });
}

// Function to save manually edited inventory from table
function saveInventory() {
    // Get inventory data from the table
    const inventoryTable = document.getElementById('inventoryTable').querySelector('tbody');
    const rows = Array.from(inventoryTable.getElementsByTagName('tr'));
    
    const updatedInventory = rows.map(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 5) return null;
        
        return {
            itemNumber: cells[0].textContent,
            size: cells[1].textContent || '',
            sqft: parseFloat(cells[2].textContent) || 0,
            pricePerSqft: parseFloat(cells[3].textContent.replace('$', '')) || 0,
            totalPrice: parseFloat(cells[4].textContent.replace('$', '')) || 0
        };
    }).filter(item => item && item.size); // Filter out empty rows
    
    // Save to database
    saveInventoryToDatabase(updatedInventory);
}

// Function to export inventory to Excel/ODS file
function exportInventoryToFile() {
    // Show loading indicator
    const exportButton = document.querySelector('button[onclick="exportInventoryToFile()"]');
    if (exportButton) {
        const originalText = exportButton.textContent;
        exportButton.textContent = 'Exporting...';
        exportButton.disabled = true;
        
        // Re-enable after 5 seconds in case of error
        setTimeout(() => {
            exportButton.textContent = originalText;
            exportButton.disabled = false;
        }, 5000);
    }
    
    // Fetch the latest inventory from the database
    fetch('/api/inventory')
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => Promise.reject(data));
            }
            return response.json();
        })
        .then(data => {
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Invalid response from server');
            }
            
            const inventoryData = data.data;
            
            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(inventoryData);
            
            // Set column widths for better readability
            const columnWidths = [
                { wch: 15 }, // itemNumber
                { wch: 15 }, // size
                { wch: 10 }, // sqft
                { wch: 15 }, // pricePerSqft
                { wch: 15 }  // totalPrice
            ];
            worksheet['!cols'] = columnWidths;
            
            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
            
            // Generate filename with date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `Inventory_Backup_${dateStr}.xlsx`;
            
            // Write file
            XLSX.writeFile(workbook, filename);
            console.log(`Exported inventory to ${filename}`);
            
            // Restore button
            if (exportButton) {
                exportButton.textContent = originalText;
                exportButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error exporting inventory:', error);
            alert('Error exporting inventory: ' + (error.message || 'Unknown error'));
            
            // Try to use localStorage as fallback
            try {
                const fallbackInventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
                const worksheet = XLSX.utils.json_to_sheet(fallbackInventory);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
                XLSX.writeFile(workbook, `Inventory_Backup_Local.xlsx`);
                alert('Exported inventory from local storage as fallback. This may not be the latest data.');
            } catch (e) {
                console.error('Failed to export inventory from localStorage:', e);
            }
            
            // Restore button
            if (exportButton) {
                exportButton.textContent = originalText;
                exportButton.disabled = false;
            }
        });
}

// Import inventory from backup file
function importInventoryFromBackup() {
    const fileInput = document.getElementById('inventoryUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to import.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { 
                type: 'array',
                cellDates: true
            });
            
            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Convert to JSON with header option
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });
            
            // Map to standard format
            const standardInventory = jsonData.map(row => ({
                itemNumber: row.itemNumber || row['Item Number'] || '',
                size: row.size || row['Size (inches)'] || '',
                sqft: parseFloat(row.sqft || row['Sq/Ft'] || 0),
                pricePerSqft: parseFloat(row.pricePerSqft || row['Price/SqFt'] || 0),
                totalPrice: parseFloat(row.totalPrice || row['Total Price'] || row['Price'] || 0)
            }));
            
            // Save to database
            saveInventoryToDatabase(standardInventory);
        } catch (error) {
            console.error('Error importing inventory backup:', error);
            alert('Error importing inventory backup: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Load inventory from database
function loadInventoryFromDatabase() {
    // Skip if already loading
    if (isLoadingInventory) return;
    
    isLoadingInventory = true;
    
    // Show loading indicator
    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        inventoryTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">Loading inventory from database...</td></tr>';
    }
    
    // Fetch inventory from API
    fetch('/api/inventory')
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => Promise.reject(data));
            }
            return response.json();
        })
        .then(data => {
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Invalid response from server');
            }
            
            // Update inventory cache
            inventoryCache = data.data;
            
            // Also keep a copy in localStorage as fallback
            try {
                StorageUtil.save(StorageKeys.INVENTORY, inventoryCache);
            } catch (e) {
                console.warn('Failed to save inventory to localStorage:', e);
            }
            
            // Update the table
            updateInventoryTable();
            
            isLoadingInventory = false;
        })
        .catch(error => {
            console.error('Error loading inventory from database:', error);
            
            // Try to load from localStorage as fallback
            try {
                inventoryCache = StorageUtil.load(StorageKeys.INVENTORY) || [];
                updateInventoryTable();
                
                if (inventoryCache.length > 0) {
                    console.log(`Loaded ${inventoryCache.length} inventory items from localStorage fallback`);
                } else {
                    console.warn('No inventory found in localStorage fallback');
                }
            } catch (e) {
                console.error('Failed to load inventory from localStorage:', e);
            }
            
            isLoadingInventory = false;
        });
}

// Function to update the inventory table display
function updateInventoryTable() {
    const inventoryTable = document.getElementById('inventoryTable')?.querySelector('tbody');
    if (!inventoryTable) {
        console.warn('Inventory table not found in the DOM');
        return;
    }
    
    // If inventory cache is empty, try to load from database
    if (inventoryCache.length === 0 && !isLoadingInventory) {
        loadInventoryFromDatabase();
        return;
    }
    
    // Clear existing rows
    inventoryTable.innerHTML = '';
    
    // Log for debugging
    console.log(`Updating inventory table with ${inventoryCache.length} items`);
    
    if (inventoryCache.length === 0) {
        // Add a placeholder row if no inventory
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" class="text-center">No inventory items found. Please upload an inventory file.</td>';
        inventoryTable.appendChild(emptyRow);
        return;
    }
    
    // Add each inventory item to the table
    inventoryCache.forEach(item => {
        const row = document.createElement('tr');
        
        // Format values
        const formattedPrice = formatCurrency(item.pricePerSqft || 0);
        const formattedTotal = formatCurrency(item.totalPrice || 0);
        
        // Set cell content
        row.innerHTML = `
            <td>${item.itemNumber || ''}</td>
            <td>${item.size || ''}</td>
            <td>${item.sqft || 0}</td>
            <td>${formattedPrice}</td>
            <td>${formattedTotal}</td>
        `;
        
        inventoryTable.appendChild(row);
    });
}

// Improved findStockSize function to better match the work order requirements
function findStockSize(width, length) {
    console.log(`Finding stock size for ${width} x ${length}`);
    
    // Use inventory cache for performance
    if (inventoryCache.length === 0) {
        console.warn('Inventory cache is empty, loading from database');
        // Try to load from database synchronously if possible
        loadInventoryFromDatabase();
        // Fall back to localStorage immediately for this request
        inventoryCache = StorageUtil.load(StorageKeys.INVENTORY) || [];
    }
    
    console.log(`Searching through ${inventoryCache.length} inventory items`);
    
    // Array to store valid matches
    const validMatches = [];
    
    // Find all matching stock sizes that meet our constraints
    for (const item of inventoryCache) {
        if (!item.size || item.size === '') {
            continue;
        }
        
        // Extract dimensions from the size field
        const dimensions = extractDimensions(item.size);
        if (dimensions.width === 0 || dimensions.length === 0) {
            continue;
        }
        
        const stockWidth = dimensions.width;
        const stockLength = dimensions.length;
        
        // Check if stock size meets our constraints:
        // 1. Stock width must be at least the requested width
        // 2. Stock width cannot be more than 1.5" wider than requested (cutting constraint)
        // 3. Stock length must be at least the requested length (no length cutting limit)
        if (stockWidth >= width && 
            stockWidth <= width + 1.5 && 
            stockLength >= length) {
            
            console.log(`Valid match found: ${item.size}`);
            validMatches.push({
                item: item,
                stockWidth: stockWidth,
                stockLength: stockLength,
                widthDifference: stockWidth - width
            });
        }
    }
    
    // If no valid matches found, return null
    if (validMatches.length === 0) {
        console.log("No matching size found within width cutting constraint");
        return null;
    }
    
    // Sort valid matches by width difference (closest to requested width first)
    validMatches.sort((a, b) => a.widthDifference - b.widthDifference);
    
    // Return the best match (closest width)
    const bestMatch = validMatches[0];
    console.log(`Selected best match: ${bestMatch.item.size}, price: ${bestMatch.item.totalPrice}`);
    
    return {
        stockSize: bestMatch.item.size,
        price: bestMatch.item.totalPrice || 0
    };
}

// Format currency helper function
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Function to manually add test inventory data
function addTestInventory() {
    const testInventory = [
        {
            itemNumber: "1",
            size: "36 x 72",
            sqft: 18,
            pricePerSqft: 5.33,
            totalPrice: 95.94
        },
        {
            itemNumber: "2", 
            size: "48 x 84",
            sqft: 28,
            pricePerSqft: 5.33,
            totalPrice: 149.24
        },
        {
            itemNumber: "3",
            size: "24 x 36",
            sqft: 6,
            pricePerSqft: 5.33,
            totalPrice: 31.98
        },
        {
            itemNumber: "4",
            size: "30 x 60",
            sqft: 12.5,
            pricePerSqft: 5.33,
            totalPrice: 66.63
        },
        {
            itemNumber: "5",
            size: "42 x 78",
            sqft: 22.75,
            pricePerSqft: 5.33,
            totalPrice: 121.26
        }
    ];
    
    // Save to database
    saveInventoryToDatabase(testInventory);
}

// Function to clear all inventory
function clearInventory() {
    if (!confirm('Are you sure you want to delete ALL inventory items? This cannot be undone.')) {
        return;
    }
    
    // Show loading indicator
    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        inventoryTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">Clearing inventory from database...</td></tr>';
    }
    
    // Delete inventory from database
    fetch('/api/inventory', {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data));
        }
        return response.json();
    })
    .then(data => {
        console.log('Inventory cleared from database:', data);
        alert('All inventory items deleted successfully.');
        
        // Clear inventory cache
        inventoryCache = [];
        
        // Also clear localStorage copy
        StorageUtil.save(StorageKeys.INVENTORY, []);
        
        // Update the table
        updateInventoryTable();
    })
    .catch(error => {
        console.error('Error clearing inventory:', error);
        alert('Error clearing inventory: ' + (error.message || 'Unknown error'));
    });
}

// Initialize the module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing database-backed inventory management module");
    
    // Add clear inventory button to the interface if needed
    const buttonGroup = document.querySelector('.premium-button-group');
    if (buttonGroup && !document.getElementById('clearInventoryBtn')) {
        const clearButton = document.createElement('button');
        clearButton.id = 'clearInventoryBtn';
        clearButton.className = 'premium-button premium-danger';
        clearButton.innerText = 'Clear All Inventory';
        clearButton.onclick = clearInventory;
        buttonGroup.appendChild(clearButton);
    }
    
    // Load inventory on page load
    loadInventoryFromDatabase();
    
    // Update inventory table on tab activation
    const inventoryTab = document.getElementById('inventory');
    if (inventoryTab) {
        inventoryTab.addEventListener('click', () => {
            console.log("Inventory tab activated, refreshing table");
            loadInventoryFromDatabase();
        });
    }
});

// Export functions to global scope
window.uploadInventory = uploadInventory;
window.saveInventory = saveInventory;
window.exportInventoryToFile = exportInventoryToFile;
window.importInventoryFromBackup = importInventoryFromBackup;
window.updateInventoryTable = updateInventoryTable;
window.loadInventoryFromDatabase = loadInventoryFromDatabase;
window.findStockSize = findStockSize;
window.addTestInventory = addTestInventory;
window.clearInventory = clearInventory;