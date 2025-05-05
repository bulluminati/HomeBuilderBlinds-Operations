// inventory.js

function uploadInventory() {
    const fileInput = document.getElementById('inventoryUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });

        // Log the first row to console to see what columns exist
        if (jsonData.length > 0) {
            console.log("First row of data:", jsonData[0]);
            console.log("Available columns:", Object.keys(jsonData[0]));
        }

        // Generate sizes based on square footage if size is not available
        const inventory = jsonData.map((row, index) => {
            // First try to get size from expected columns
            let size = row['Size (inches)'] || row['Size'] || row['Dimensions'] || '';
            
            // If no size column exists, calculate a size based on SqFt
            // This creates fictional dimensions that are approximately correct
            if (!size && row['Sq/Ft']) {
                const sqft = parseFloat(row['Sq/Ft'] || 0);
                if (sqft > 0) {
                    // Calculate width and height to create a square-ish shape
                    // that equals the given square footage
                    const side = Math.sqrt(sqft * 144); // convert to square inches
                    // Round to nearest 0.5 inch
                    const width = Math.round(side * 2) / 2;
                    const length = Math.round(side * 2) / 2;
                    size = `${width} x ${length}`;
                }
            }

            return {
                itemNumber: row['Item Number'] || row['ItemNumber'] || row['Item'] || index + 1,
                size: size,
                sqft: parseFloat(row['Sq/Ft'] || row['SqFt'] || row['Square Feet'] || 0),
                pricePerSqft: parseFloat(row['Price/SqFt'] || row['PricePerSqFt'] || row['Price Per SqFt'] || 0),
                totalPrice: parseFloat(row['Price'] || row['Total Price'] || row['Total'] || 0) || 
                           (parseFloat(row['Sq/Ft'] || 0) * parseFloat(row['Price/SqFt'] || 0))
            };
        });

        StorageUtil.save(StorageKeys.INVENTORY, inventory);
        updateInventoryTable();
        alert('Inventory uploaded successfully!');
        
        // Log the processed inventory
        console.log("Processed inventory items:", inventory);
    };
    reader.readAsArrayBuffer(file);
}

function saveInventory() {
    const inventoryTable = document.getElementById('inventoryTable').querySelector('tbody');
    const rows = Array.from(inventoryTable.getElementsByTagName('tr'));
    const inventory = rows.map(row => {
        const cells = row.getElementsByTagName('td');
        return {
            itemNumber: cells[0].textContent,
            size: cells[1].textContent || '', // Handle empty size cells
            sqft: parseFloat(cells[2].textContent) || 0,
            pricePerSqft: parseFloat(cells[3].textContent.replace('$', '')) || 0,
            totalPrice: parseFloat(cells[4].textContent.replace('$', '')) || 0
        };
    });

    StorageUtil.save(StorageKeys.INVENTORY, inventory);
    alert('Inventory quantities saved successfully!');
}

function exportInventoryToFile() {
    const inventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
    const worksheet = XLSX.utils.json_to_sheet(inventory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'Inventory_Backup.xlsx');
}

function importInventoryFromBackup() {
    const fileInput = document.getElementById('inventoryUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to import.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });

        const inventory = jsonData.map(row => ({
            itemNumber: row.itemNumber || row['Item Number'] || '',
            size: row.size || row['Size (inches)'] || '',
            sqft: parseFloat(row.sqft || row['Sq/Ft'] || 0),
            pricePerSqft: parseFloat(row.pricePerSqft || row['Price/SqFt'] || 0),
            totalPrice: parseFloat(row.totalPrice || row['totalPrice'] || row['Price'] || 0)
        }));

        StorageUtil.save(StorageKeys.INVENTORY, inventory);
        updateInventoryTable();
        alert('Inventory imported successfully!');
    };
    reader.readAsArrayBuffer(file);
}

function updateInventoryTable() {
    const inventoryTable = document.getElementById('inventoryTable').querySelector('tbody');
    if (!inventoryTable) return;

    const inventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
    
    // For debugging
    console.log(`Updating inventory table with ${inventory.length} items`);
    
    inventoryTable.innerHTML = '';
    inventory.forEach(row => {
        const rowElement = createTableRow([
            row.itemNumber || '',
            row.size || '', // Make sure size isn't undefined
            row.sqft || 0,
            formatCurrency(row.pricePerSqft || 0),
            formatCurrency(row.totalPrice || 0)
        ]);
        inventoryTable.appendChild(rowElement);
    });
}

// Updated findStockSize function with proper width constraint
function findStockSize(width, length) {
    console.log(`Finding stock size for ${width} x ${length}`);
    
    // Get inventory data from storage
    const inventoryData = StorageUtil.load(StorageKeys.INVENTORY) || [];
    console.log(`Searching through ${inventoryData.length} inventory items`);
    
    // For debugging: log the first few inventory items
    if (inventoryData.length > 0) {
        console.log("First inventory item:", inventoryData[0]);
    }
    
    // Array to store valid matches
    const validMatches = [];
    
    // Find all matching stock sizes that meet our constraints
    for (const item of inventoryData) {
        if (!item.size || item.size === '') {
            console.log(`Skipping item ${item.itemNumber} - no size information`);
            continue;
        }
        
        // Try to parse the size field - accept various formats:
        // "36x72", "36 x 72", "36" x 72"", etc.
        let sizeParts = [];
        try {
            // Remove any non-numeric characters except for x, X, decimal points and spaces
            const cleanSize = item.size.replace(/[^0-9xX.\s]/g, '');
            
            // Split by x or X
            sizeParts = cleanSize.split(/[xX]/);
            
            // Convert to numbers and trim whitespace
            sizeParts = sizeParts.map(part => parseFloat(part.trim()));
            
            if (sizeParts.length < 2 || isNaN(sizeParts[0]) || isNaN(sizeParts[1])) {
                console.log(`Invalid size format for item ${item.itemNumber}: "${item.size}"`);
                continue;
            }
            
            const stockWidth = sizeParts[0];
            const stockLength = sizeParts[1];
            console.log(`Checking if ${stockWidth} x ${stockLength} can work for ${width} x ${length}`);
            
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
        } catch (e) {
            console.log(`Error parsing size "${item.size}":`, e);
            continue;
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
        price: bestMatch.item.totalPrice || bestMatch.item.price || 0
    };
}

// Initialize the inventory table when the tab loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing inventory tab");
    updateInventoryTable();
    
    // Add event handler for inventory tab clicks
    document.getElementById('inventory')?.addEventListener('click', () => {
        console.log("Inventory tab clicked, refreshing table");
        updateInventoryTable();
    });
    
    // Update all item sizes in the existing inventory if they're missing
    const updateExistingInventorySizes = () => {
        const inventory = StorageUtil.load(StorageKeys.INVENTORY) || [];
        let updated = false;
        
        inventory.forEach(item => {
            if (!item.size && item.sqft > 0) {
                const sqft = parseFloat(item.sqft);
                const side = Math.sqrt(sqft * 144);
                const width = Math.round(side * 2) / 2;
                const length = Math.round(side * 2) / 2;
                item.size = `${width} x ${length}`;
                updated = true;
            }
        });
        
        if (updated) {
            StorageUtil.save(StorageKeys.INVENTORY, inventory);
            updateInventoryTable();
            console.log("Updated missing sizes in existing inventory");
        }
    };
    
    // Call this function to update any existing inventory that might be missing sizes
    updateExistingInventorySizes();
});

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
        }
    ];
    
    StorageUtil.save(StorageKeys.INVENTORY, testInventory);
    updateInventoryTable();
    alert('Test inventory added!');
}

// Expose the test function globally
window.addTestInventory = addTestInventory;