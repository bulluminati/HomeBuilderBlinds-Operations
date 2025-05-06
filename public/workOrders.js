// workOrders.js - Complete Implementation

// Function to add a new line item to the work order
function addLineItem() {
    const workOrderTable = document.getElementById('workOrderTable').querySelector('tbody');
    const row = createTableRow([
        `<select>
            <option value="Faux Wood">Faux Wood</option>
            <option value="Vertical">Vertical</option>
            <option value="Installation">Installation ($15/window)</option>
            <option value="Removal">Removal ($5/window)</option>
        </select>`,
        `<input type="number" placeholder="Width (in)" step="0.125">`,
        `<input type="number" placeholder="Length (in)" step="0.125">`,
        `<input type="number" placeholder="Quantity" min="1" value="1" class="quantity-input">`,
        `<span class="stock-status">-</span>`,
        `<span class="recommended-size">-</span>`,
        `<span class="unit-price">$0.00</span>`,
        `<span class="line-total">$0.00</span>`,
        `<button onclick="removeLineItem(this)">Remove</button>`
    ]);
    workOrderTable.appendChild(row);
    
    // Add event listeners to the new inputs
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.placeholder === "Width (in)" || input.placeholder === "Length (in)") {
                const row = input.closest('tr');
                checkSizeAndUpdatePrice(row);
            }
            updateTotals();
        });
    });
    
    // Add change event listener to the select
    const select = row.querySelector('select');
    if (select) {
        select.addEventListener('change', () => {
            const row = select.closest('tr');
            const unitPriceElement = row.querySelector('.unit-price');
            
            if (select.value === 'Installation') {
                unitPriceElement.textContent = '$15.00';
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = 'Min. charge $75.00';
                }
            }
            else if (select.value === 'Removal') {
                unitPriceElement.textContent = '$5.00';
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = '-';
                }
            }
            else {
                checkSizeAndUpdatePrice(row);
            }
            
            updateTotals();
        });
    }
    
    updateTotals();
    return row; // Critical for programmatic use
}

// Function to update all totals
function updateTotals() {
    const workOrderTable = document.getElementById('workOrderTable');
    const rows = workOrderTable.getElementsByTagName('tr');
    const discountInput = document.getElementById('discountPercent');
    const subtotalElement = document.getElementById('subtotal');
    const discountAmountElement = document.getElementById('discountAmount');
    const taxElement = document.getElementById('taxAmount');
    const grandTotalElement = document.getElementById('grandTotal');
    
    let subtotal = 0;
    let installationTotal = 0;
    let hasInstallation = false;
    
    for (let i = 1; i < rows.length - 4; i++) {
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > 0) {
            const blindType = cells[0].querySelector('select')?.value || '';
            const quantity = parseInt(cells[3].querySelector('input')?.value || '0');
            const unitPrice = parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0;
            let total = quantity * unitPrice;
            
            if (blindType === 'Installation') {
                hasInstallation = true;
                installationTotal += total;
            }
            
            cells[7].querySelector('.line-total').textContent = formatCurrency(total);
            subtotal += total;
        }
    }
    
    // Apply minimum $75 installation charge if needed
    if (hasInstallation && installationTotal < 75) {
        const difference = 75 - installationTotal;
        subtotal += difference;
        
        for (let i = 1; i < rows.length - 4; i++) {
            const cells = rows[i].getElementsByTagName('td');
            if (cells.length > 0) {
                const blindType = cells[0].querySelector('select')?.value || '';
                if (blindType === 'Installation') {
                    const lineTotal = cells[7].querySelector('.line-total');
                    const quantity = parseInt(cells[3].querySelector('input')?.value || '0');
                    const unitPrice = parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0;
                    const rowTotal = quantity * unitPrice;
                    
                    lineTotal.textContent = formatCurrency(rowTotal + difference);
                    break;
                }
            }
        }
    }
    
    subtotalElement.textContent = formatCurrency(subtotal);
    const discountPercent = parseFloat(discountInput.value || '0');
    const discountAmount = (subtotal * (discountPercent / 100));
    discountAmountElement.textContent = formatCurrency(discountAmount);
    
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825; // 8.25% tax
    if (taxElement) {
        taxElement.textContent = formatCurrency(taxAmount);
    }
    
    const grandTotal = discountedSubtotal + taxAmount;
    grandTotalElement.textContent = formatCurrency(grandTotal);
}

// Function to check stock size and update price
function checkSizeAndUpdatePrice(row) {
    const widthInput = row.querySelector('input[placeholder="Width (in)"]');
    const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
    const width = parseFloat(widthInput?.value);
    const length = parseFloat(lengthInput?.value);
    
    const stockStatusElement = row.querySelector('.stock-status');
    const recommendedSizeElement = row.querySelector('.recommended-size');
    const unitPriceElement = row.querySelector('.unit-price');
    const lineTotalElement = row.querySelector('.line-total');
    const quantityInput = row.querySelector('.quantity-input');
    
    if (width && length) {
        if (stockStatusElement && recommendedSizeElement && unitPriceElement) {
            // Find appropriate stock size with constraints:
            // 1. Can only cut up to 1.5" off width
            // 2. Can cut any amount off length
            const match = findStockSize(width, length);
            
            if (match) {
                stockStatusElement.textContent = 'Available';
                stockStatusElement.style.color = 'green';
                recommendedSizeElement.textContent = `Pull size: ${match.stockSize}`;
                unitPriceElement.textContent = formatCurrency(match.price);
                
                if (quantityInput && lineTotalElement) {
                    const quantity = parseInt(quantityInput.value || '1');
                    const total = quantity * match.price;
                    lineTotalElement.textContent = formatCurrency(total);
                }
            } else {
                stockStatusElement.textContent = 'No matching size';
                stockStatusElement.style.color = 'red';
                recommendedSizeElement.textContent = '-';
                unitPriceElement.textContent = '$0.00';
                if (lineTotalElement) {
                    lineTotalElement.textContent = '$0.00';
                }
            }
        }
    }
}

// This is a placeholder for the findStockSize function that should be in inventory.js
// This function should implement the logic described above
function findStockSize(requestedWidth, requestedLength) {
    // This should be implemented in inventory.js with the following logic:
    // 1. Find all stock items where:
    //    - Stock width is within 1.5" of requested width (stock_width >= requested_width && stock_width <= requested_width + 1.5)
    //    - Stock length is >= requested length
    // 2. Sort by width (ascending) to get the closest match
    // 3. Return the first match that satisfies both constraints
    
    // For now, this is just calling the existing function from inventory.js
    return window.findStockSize(requestedWidth, requestedLength);
}

// Function to remove a line item
function removeLineItem(button) {
    const row = button.closest('tr');
    row.parentNode.removeChild(row);
    updateTotals();
}

// Auto-fill function that loads orders from blind orders API
async function autoFillFromBlindOrders() {
    console.log('=== Starting to auto-fill from blind orders ===');
    
    try {
        const res = await fetch('/api/blindorders');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const orders = await res.json();
        console.log('Received orders:', orders);
        
        // Find the most recent order to process
        if (orders.length === 0) {
            displayAutoCompleteStatus('No orders found');
            return;
        }
        
        // Get the most recent order
        const mostRecentOrder = orders[0];
        const fromEmail = mostRecentOrder.from_address.toLowerCase();
        
        // Determine if this is residential or commercial based on sender
        const isResidential = fromEmail.includes('mike@homebuilderblinds.com');
        const isCommercial = fromEmail.includes('roxanne.mitchell@uaginc.com') || 
                            fromEmail.includes('erica@myforestparkapartments.com') ||
                            fromEmail.includes('erica cook');
        
        if (!isResidential && !isCommercial) {
            displayAutoCompleteStatus('Unknown sender - cannot determine order type');
            return;
        }
        
        // Clear existing form first
        document.getElementById('workOrderForm').reset();
        const tbody = document.querySelector('#workOrderTable tbody');
        tbody.innerHTML = '';
        
        // Set client type and service type based on sender
        const clientTypeSelect = document.getElementById('clientType');
        const serviceTypeSelect = document.getElementById('serviceType');
        
        if (isResidential) {
            // Residential settings
            clientTypeSelect.value = 'residential';
            serviceTypeSelect.value = 'installation';
            
            // For residential, extract client info from the order content
            // This would need parsing logic based on your email format
            document.getElementById('clientName').value = mostRecentOrder.client_name || '';
            document.getElementById('clientPhone').value = mostRecentOrder.client_phone || '';
            document.getElementById('clientEmail').value = mostRecentOrder.client_email || '';
            
        } else if (isCommercial) {
            // Commercial settings
            clientTypeSelect.value = 'commercial';
            serviceTypeSelect.value = 'delivery'; // Changed from 'delivery only' to match dropdown
            
            // Set client information based on the sender
            if (fromEmail.includes('roxanne')) {
                document.getElementById('clientName').value = 'Roxanne Mitchell';
                document.getElementById('propertyName').value = 'United Apartment Group';
                document.getElementById('clientPhone').value = ''; // Add if known
                document.getElementById('clientEmail').value = 'roxanne.mitchell@uaginc.com';
            } else if (fromEmail.includes('erica')) {
                document.getElementById('clientName').value = 'Erica Cook';
                document.getElementById('propertyName').value = 'Forest Park Apartments';
                document.getElementById('clientPhone').value = '817-442-3344';
                document.getElementById('clientEmail').value = 'erica@myforestparkapartments.com';
            }
        }
        
        // Process all orders for this client
        let clientOrders = orders.filter(order => 
            order.from_address.toLowerCase().includes(fromEmail)
        );
        
        console.log(`Found ${clientOrders.length} orders for ${fromEmail}`);
        
        // Add each order as a line item
        clientOrders.forEach((order, index) => {
            console.log(`Adding order ${index + 1}:`, order);
            
            const row = addLineItem();
            
            // Parse and set size
            const sizeParts = order.size.replace(/["']/g, '').toLowerCase().split('x');
            if (sizeParts.length === 2) {
                let [width, length] = sizeParts;
                width = parseFloat(width);
                length = parseFloat(length);
                
                // Apply deduction for residential orders
                if (isResidential) {
                    width = width - 0.5; // Deduct 1/2 inch for residential
                }
                
                row.querySelector('input[placeholder="Width (in)"]').value = width;
                row.querySelector('input[placeholder="Length (in)"]').value = length;
            }
            
            // Set blind type - default to what's in the order or Faux Wood
            const typeSelect = row.querySelector('select');
            if (typeSelect) {
                // If order specifies vertical, set it, otherwise default to Faux Wood
                if (order.type && order.type.toLowerCase().includes('vertical')) {
                    typeSelect.value = 'Vertical';
                } else {
                    typeSelect.value = 'Faux Wood';
                }
            }
            
            // Set quantity
            const quantityInput = row.querySelector('.quantity-input');
            if (quantityInput) {
                quantityInput.value = order.quantity || 1;
            }
            
            // Trigger price check and update
            checkSizeAndUpdatePrice(row);
        });
        
        // Update totals after all items are added
        updateTotals();
        
        // Display status
        const senderName = isResidential ? 'residential order' : 
                          (fromEmail.includes('roxanne') ? 'Roxanne Mitchell' : 'Erica Cook');
        displayAutoCompleteStatus(`Successfully loaded ${clientOrders.length} orders for ${senderName}`);
        
    } catch (error) {
        console.error('Error in autoFillFromBlindOrders:', error);
        displayAutoCompleteStatus('Error loading orders: ' + error.message);
    }
}

// Function to display auto-complete status
function displayAutoCompleteStatus(message) {
    let statusDiv = document.getElementById('autoCompleteStatus');
    
    if (!statusDiv) {
        // Create status div if it doesn't exist
        const workOrdersTab = document.getElementById('workOrders');
        statusDiv = document.createElement('div');
        statusDiv.id = 'autoCompleteStatus';
        statusDiv.className = 'auto-complete-status';
        statusDiv.style.marginTop = '10px';
        statusDiv.style.padding = '10px';
        statusDiv.style.backgroundColor = '#f0f8ff';
        statusDiv.style.border = '1px solid #0366d6';
        statusDiv.style.borderRadius = '4px';
        statusDiv.style.display = 'none';
        
        // Insert after the form
        const form = workOrdersTab.querySelector('form');
        form.parentNode.insertBefore(statusDiv, form.nextSibling);
    }
    
    statusDiv.textContent = `Auto-Completed Orders: ${message}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Create estimate function
function createEstimate() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const clientName = document.getElementById('clientName').value;
    const propertyName = document.getElementById('propertyName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const currentDate = new Date().toLocaleDateString();
    const quoteNumber = 'QTE-' + Date.now().toString().slice(-6);
    
    doc.setFillColor(30, 61, 89);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(188, 147, 85);
    doc.setFontSize(24);
    doc.text('Home Builder Blinds', 105, 20, { align: 'center' });
    doc.setTextColor(188, 147, 85);
    doc.setFontSize(16);
    doc.text('Quote', 105, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Date: ' + currentDate, 20, 15);
    doc.text('Quote #: ' + quoteNumber, 20, 22);
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Client Information:', 20, 55);
    doc.setFontSize(11);
    doc.text('Name: ' + clientName, 30, 65);
    doc.text('Property: ' + propertyName, 30, 75);
    doc.text('Phone: ' + clientPhone, 30, 85);
    doc.text('Email: ' + clientEmail, 30, 95);
    
    let yPos = 120;
    doc.setFillColor(30, 61, 89);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    const headers = ['Item', 'Dimensions', 'Qty', 'Unit Price', 'Total'];
    const positions = [20, 80, 120, 140, 170];
    headers.forEach((header, i) => doc.text(header, positions[i], yPos));
    
    const workOrderTable = document.getElementById('workOrderTable');
    const rows = workOrderTable.getElementsByTagName('tr');
    doc.setTextColor(0);
    yPos = 130;
    let subtotal = 0;
    
    for (let i = 1; i < rows.length - 4; i++) {
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > 0) {
            const blindType = cells[0].querySelector('select')?.value || '';
            const width = cells[1].querySelector('input')?.value || '';
            const length = cells[2].querySelector('input')?.value || '';
            const quantity = cells[3].querySelector('input')?.value || '0';
            const unitPrice = parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0;
            const total = quantity * unitPrice;
            subtotal += total;
            
            doc.text(blindType, 20, yPos);
            doc.text(`${width}" x ${length}"`, 80, yPos);
            doc.text(quantity.toString(), 120, yPos);
            doc.text('$' + unitPrice.toFixed(2), 140, yPos);
            doc.text('$' + total.toFixed(2), 170, yPos);
            yPos += 10;
        }
    }
    
    // Check if additional services are included
    if (document.getElementById('includeInstallation') && document.getElementById('includeInstallation').checked) {
        const installPrice = 75.00;
        doc.text('Installation', 20, yPos);
        doc.text('Service', 80, yPos);
        doc.text('1', 120, yPos);
        doc.text('$' + installPrice.toFixed(2), 140, yPos);
        doc.text('$' + installPrice.toFixed(2), 170, yPos);
        subtotal += installPrice;
        yPos += 10;
    }
    
    if (document.getElementById('includeRemoval') && document.getElementById('includeRemoval').checked) {
        const removalPrice = 35.00;
        doc.text('Removal', 20, yPos);
        doc.text('Old Blinds', 80, yPos);
        doc.text('1', 120, yPos);
        doc.text('$' + removalPrice.toFixed(2), 140, yPos);
        doc.text('$' + removalPrice.toFixed(2), 170, yPos);
        subtotal += removalPrice;
        yPos += 10;
    }
    
    const discountPercent = parseFloat(document.getElementById('discountPercent').value || '0');
    const discountAmount = subtotal * (discountPercent / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const tax = discountedSubtotal * 0.0825; // 8.25% tax
    const total = discountedSubtotal + tax;
    
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.text('Subtotal:', 140, yPos);
    doc.text('$' + subtotal.toFixed(2), 170, yPos);
    yPos += 10;
    
    if (discountPercent > 0) {
        doc.text(`Discount (${discountPercent}%)`, 140, yPos);
        doc.text('-$' + discountAmount.toFixed(2), 170, yPos);
        yPos += 10;
    }
    
    doc.text('Tax (8.25%):', 140, yPos);
    doc.text('$' + tax.toFixed(2), 170, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text('Total:', 140, yPos);
    doc.text('$' + total.toFixed(2), 170, yPos);
    
    yPos = 270;
    doc.setFontSize(10);
    doc.text('Thank you for choosing Home Builder Blinds!', 105, yPos, { align: 'center' });
    doc.text('This quote is valid for 30 days from the date above.', 105, yPos + 5, { align: 'center' });
    doc.text('Contact: (817) 767-3874 | mike@homebuilderblinds.com', 105, yPos + 10, { align: 'center' });
    
    doc.setDrawColor(188, 147, 85);
    doc.setLineWidth(2);
    doc.rect(5, 5, 200, 287);
    
    const fileName = `Quote_${clientName.replace(/\s+/g, '_')}_${quoteNumber}.pdf`;
    doc.save(fileName);
}
// Add this function to your workOrders.js file

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
    
    // Add installation/removal services if needed (same as in acceptQuote)
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

// Initialize at DOM load
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Make functions globally accessible
    window.sendToWillCall = sendToWillCall;
    window.showWillCallDialog = showWillCallDialog;
    window.closeWillCallDialog = closeWillCallDialog;
    window.confirmWillCallOrder = confirmWillCallOrder;
});

// Accept quote function
function acceptQuote() {
    // Create the work order data object with basic information
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
    
    // Add installation service if needed
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
    
    // Add removal service if needed
    if (document.getElementById('includeRemoval') && 
        document.getElementById('includeRemoval').checked) {
      workOrderData.items.push({
        blindType: 'Removal',
        description: 'Removal of Old Blinds',
        unitPrice: 35.00,
        quantity: '1'
      });
    }
    
    // Validate that there's at least one item
    if (workOrderData.items.length === 0) {
      alert('Please add at least one item to the work order');
      return;
    }
    
    // Save to finalized_orders table via API if available
    if (typeof fetch !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '') {
      // If we have a server API available, use it
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
          resetFormAndNotifySuccess();
        } else {
          // Fall back to local storage if API fails
          saveToLocalStorage(workOrderData);
          resetFormAndNotifySuccess();
          console.warn('API save failed, used local storage fallback:', data.message);
        }
      })
      .catch(error => {
        // Fall back to local storage if API is unavailable
        console.error('Error saving work order to API:', error);
        saveToLocalStorage(workOrderData);
        resetFormAndNotifySuccess();
      });
    } else {
      // If no API is available, use local storage
      saveToLocalStorage(workOrderData);
      resetFormAndNotifySuccess();
    }
    
    // Helper function to save to localStorage
    function saveToLocalStorage(data) {
      const savedPickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
      savedPickSheets.push(data);
      StorageUtil.save(StorageKeys.PICK_SHEETS, savedPickSheets);
      
      // Also save to finalized orders if that storage exists
      const finalizedOrders = StorageUtil.load(StorageKeys.FINALIZED_ORDERS) || [];
      finalizedOrders.push(data);
      StorageUtil.save(StorageKeys.FINALIZED_ORDERS, finalizedOrders);
    }
    
    // Helper function to reset form and show success message
    function resetFormAndNotifySuccess() {
      // Reset the form
      document.getElementById('workOrderForm').reset();
      document.getElementById('workOrderTable').querySelector('tbody').innerHTML = '';
      
      // Update pick sheet if needed
      if (document.getElementById('pickSheet')?.classList.contains('active')) {
        if (typeof updatePickSheet === 'function') {
          updatePickSheet();
        }
      }
      
      // Show success message
      alert('Work order sent to warehouse successfully!');
    }
  }

// Save quote function
function saveQuote() {
    const clientName = document.getElementById('clientName').value;
    if (!clientName) {
        alert('Please enter a client name before saving the quote');
        return;
    }
    
    const quoteData = {
        id: 'Q-' + Date.now().toString().slice(-6),
        dateCreated: new Date().toISOString(),
        clientName: clientName,
        propertyName: document.getElementById('propertyName').value,
        clientPhone: document.getElementById('clientPhone').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientType: document.getElementById('clientType')?.value || 'residential',
        serviceType: document.getElementById('serviceType')?.value || 'install',
        items: [],
        discount: document.getElementById('discountPercent').value || '0'
    };
    
    const rows = Array.from(document.getElementById('workOrderTable').querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const cells = row.cells;
        if (cells.length > 0) {
            const blindType = cells[0].querySelector('select')?.value || '';
            const width = cells[1].querySelector('input')?.value || '';
            const length = cells[2].querySelector('input')?.value || '';
            const quantity = cells[3].querySelector('input')?.value || '0';
            
            if (blindType && width && length) {
                const item = { 
                    blindType, 
                    width, 
                    length, 
                    quantity,
                    unitPrice: parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0
                };
                quoteData.items.push(item);
            }
        }
    });
    
    // Add installation service if needed
    if (quoteData.serviceType === 'install' && document.getElementById('includeInstallation') && document.getElementById('includeInstallation').checked) {
        quoteData.items.push({
            blindType: 'Installation',
            description: 'Blind Installation Service',
            quantity: '1',
            unitPrice: 75.00
        });
    }
    
    // Add removal service if needed
    if (document.getElementById('includeRemoval') && document.getElementById('includeRemoval').checked) {
        quoteData.items.push({
            blindType: 'Removal',
            description: 'Removal of Old Blinds',
            unitPrice: 35.00,
            quantity: '1'
        });
    }
    
    if (quoteData.items.length === 0) {
        alert('Please add at least one item to the quote');
        return;
    }
    
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    savedQuotes.push(quoteData);
    StorageUtil.save(StorageKeys.QUOTES, savedQuotes);
    
    // Update the quote dropdown
    updateQuoteDropdown();
    
    // Also update invoice quotes dropdown if it exists (for sync between tabs)
    if (typeof updateQuotesDropdown === 'function') {
        updateQuotesDropdown();
    }
    
    alert('Quote saved successfully!');
}

// Delete quote function
function deleteQuote() {
    const quoteSelect = document.getElementById('loadQuote');
    const selectedQuoteId = quoteSelect.value;
    
    if (!selectedQuoteId) {
        alert('Please select a quote to delete');
        return;
    }
    
    if (confirm('Are you sure you want to delete this quote?')) {
        const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
        const updatedQuotes = savedQuotes.filter(quote => quote.id !== selectedQuoteId);
        StorageUtil.save(StorageKeys.QUOTES, updatedQuotes);
        
        // Update the quote dropdown
        updateQuoteDropdown();
        
        // Also update invoice quotes dropdown if it exists
        if (typeof updateQuotesDropdown === 'function') {
            updateQuotesDropdown();
        }
        
        alert('Quote deleted successfully');
    }
}

// Update quote dropdown function
function updateQuoteDropdown() {
    const quoteSelect = document.getElementById('loadQuote');
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    
    // Clear existing options except the first one
    while (quoteSelect.options.length > 1) {
        quoteSelect.remove(1);
    }
    
    // Add quotes to dropdown
    savedQuotes.forEach(quote => {
        const option = document.createElement('option');
        option.value = quote.id;
        option.textContent = `${quote.clientName} - ${quote.id}`;
        quoteSelect.appendChild(option);
    });
}

// Load quote function
function loadQuote() {
    const quoteSelect = document.getElementById('loadQuote');
    const selectedQuoteId = quoteSelect.value;
    
    if (!selectedQuoteId) return;
    
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    const selectedQuote = savedQuotes.find(quote => quote.id === selectedQuoteId);
    
    if (!selectedQuote) {
        alert('Could not find the selected quote');
        return;
    }
    
    // Confirm before loading and replacing current data
    if (document.getElementById('workOrderTable').querySelector('tbody').children.length > 0) {
        if (!confirm('Loading this quote will replace your current work order data. Continue?')) {
            return;
        }
    }
    
    // Clear existing form data
    document.getElementById('workOrderTable').querySelector('tbody').innerHTML = '';
    
    // Fill in client information
    document.getElementById('clientName').value = selectedQuote.clientName || '';
    document.getElementById('propertyName').value = selectedQuote.propertyName || '';
    document.getElementById('clientPhone').value = selectedQuote.clientPhone || '';
    document.getElementById('clientEmail').value = selectedQuote.clientEmail || '';
    document.getElementById('discountPercent').value = selectedQuote.discount || '0';
    
    // Also load the client type and service type if available
    if (document.getElementById('clientType')) {
        document.getElementById('clientType').value = selectedQuote.clientType || 'residential';
    }
    if (document.getElementById('serviceType')) {
        document.getElementById('serviceType').value = selectedQuote.serviceType || 'install';
    }
    
    // Reset additional services checkboxes
    if (document.getElementById('includeInstallation')) {
        document.getElementById('includeInstallation').checked = false;
    }
    if (document.getElementById('includeRemoval')) {
        document.getElementById('includeRemoval').checked = false;
    }
    
    // Add line items
    selectedQuote.items.forEach(item => {
        // Check if this is a special service item
        if (item.blindType === 'Installation') {
            if (document.getElementById('includeInstallation')) {
                document.getElementById('includeInstallation').checked = true;
            }
            return; // Skip adding as a line item
        }
        
        if (item.blindType === 'Removal') {
            if (document.getElementById('includeRemoval')) {
                document.getElementById('includeRemoval').checked = true;
            }
            return; // Skip adding as a line item
        }
        
        const row = createTableRow([
            `<select><option value="Faux Wood" ${item.blindType === 'Faux Wood' ? 'selected' : ''}>Faux Wood</option><option value="Vertical" ${item.blindType === 'Vertical' ? 'selected' : ''}>Vertical</option></select>`,
            `<input type="number" placeholder="Width (in)" step="0.125" value="${item.width}">`,
            `<input type="number" placeholder="Length (in)" step="0.125" value="${item.length}">`,
            `<input type="number" placeholder="Quantity" min="1" value="${item.quantity}" class="quantity-input">`,
            `<span class="stock-status">-</span>`,
            `<span class="recommended-size">-</span>`,
            `<span class="unit-price">${item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}</span>`,
            `<span class="line-total">$0.00</span>`,
            `<button onclick="removeLineItem(this)">Remove</button>`
        ]);
        
        document.getElementById('workOrderTable').querySelector('tbody').appendChild(row);
        
        // Trigger the stock check for this row
        const currentRow = document.getElementById('workOrderTable').querySelector('tbody').lastElementChild;
        checkSizeAndUpdatePrice(currentRow);
    });
    
    // Update all totals
    updateTotals();
    
    alert('Quote loaded successfully');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Basic event listeners
    document.getElementById('workOrderTable')?.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
            if (e.target.placeholder === "Width (in)" || e.target.placeholder === "Length (in)") {
                const row = e.target.closest('tr');
                checkSizeAndUpdatePrice(row);
            }
            updateTotals();
        }
    });
    
    // Add event listener for the discount input
    const discountInput = document.getElementById('discountPercent');
    if (discountInput) {
        discountInput.addEventListener('input', updateTotals);
    }
    
    // Add event listeners for service checkboxes if they exist
    const installationCheckbox = document.getElementById('includeInstallation');
    if (installationCheckbox) {
        installationCheckbox.addEventListener('change', updateTotals);
    }
    
    const removalCheckbox = document.getElementById('includeRemoval');
    if (removalCheckbox) {
        removalCheckbox.addEventListener('change', updateTotals);
    }
    
    // Set up quote dropdown
    updateQuoteDropdown();
    
    // Add change event listener to the quote dropdown
    const quoteSelect = document.getElementById('loadQuote');
    if (quoteSelect) {
        quoteSelect.addEventListener('change', function() {
            if (this.value) {
                loadQuote();
            }
        });
    }
    
    // Add import from email button to work orders tab
    const workOrdersTab = document.getElementById('workOrders');
    if (workOrdersTab) {
        const buttonGroup = workOrdersTab.querySelector('.premium-button-group');
        if (buttonGroup) {
            const importButton = document.createElement('button');
            importButton.type = 'button';
            importButton.className = 'premium-button';
            importButton.style.backgroundColor = '#0366d6';
            importButton.style.color = 'white';
            importButton.innerHTML = '📧 Import Orders from Email';
            importButton.onclick = autoFillFromBlindOrders;
            
            // Insert at the beginning of the button group
            buttonGroup.insertBefore(importButton, buttonGroup.firstChild);
        }
    }
    
    // Add tax row to the table footer if it doesn't exist
    const tableFooter = document.querySelector('#workOrderTable tfoot');
    if (tableFooter) {
        const rows = tableFooter.getElementsByTagName('tr');
        let taxRowExists = false;
        
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].querySelector('td').textContent.includes('Tax')) {
                // Update tax text if it exists
                const taxCell = rows[i].querySelector('td');
                if (taxCell && taxCell.textContent.includes('8.5%')) {
                    taxCell.innerHTML = '<strong>Tax (8.25%):</strong>';
                }
                taxRowExists = true;
                break;
            }
        }
        
        if (!taxRowExists) {
            // Insert tax row before grand total
            const taxRow = document.createElement('tr');
            taxRow.innerHTML = `
                <td colspan="7" align="right"><strong>Tax (8.25%):</strong></td>
                <td id="taxAmount" class="premium-td">$0.00</td>
                <td></td>
            `;
            
            // Find the grand total row
            const grandTotalRow = Array.from(rows).find(row => 
                row.querySelector('td').textContent.includes('Grand Total')
            );
            
            if (grandTotalRow) {
                tableFooter.insertBefore(taxRow, grandTotalRow);
            } else {
                tableFooter.appendChild(taxRow);
            }
        }
    }
    
    // Initial update
    updateTotals();
});

// Make functions globally available for testing
window.addLineItem = addLineItem;
window.updateTotals = updateTotals;
window.checkSizeAndUpdatePrice = checkSizeAndUpdatePrice;
window.removeLineItem = removeLineItem;
window.autoFillFromBlindOrders = autoFillFromBlindOrders;
window.createEstimate = createEstimate;
window.acceptQuote = acceptQuote;
window.saveQuote = saveQuote;
window.deleteQuote = deleteQuote;
window.updateQuoteDropdown = updateQuoteDropdown;
window.loadQuote = loadQuote;