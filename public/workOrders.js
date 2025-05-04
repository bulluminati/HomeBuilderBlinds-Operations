// workOrders.js
function addLineItem() {
    const workOrderTable = document.getElementById('workOrderTable').querySelector('tbody');
    const row = createTableRow([
        `<select><option value="Faux Wood">Faux Wood</option>
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
            // For width/length inputs, trigger size check
            if (input.placeholder === "Width (in)" || input.placeholder === "Length (in)") {
                const row = input.closest('tr');
                checkSizeAndUpdatePrice(row);
            }
            // For all inputs, update totals
            updateTotals();
        });
    });
    
    // Add change event listener to the select
    const select = row.querySelector('select');
    if (select) {
        select.addEventListener('change', () => {
            const row = select.closest('tr');
            
            // If Installation is selected, set unit price to $15
            if (select.value === 'Installation') {
                const unitPriceElement = row.querySelector('.unit-price');
                unitPriceElement.textContent = '$15.00';
                
                // Clear width/length fields if any
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                // Set recommendation note
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = 'Min. charge $75.00';
                }
            }
            // If Removal is selected, set unit price to $5
            else if (select.value === 'Removal') {
                const unitPriceElement = row.querySelector('.unit-price');
                unitPriceElement.textContent = '$5.00';
                
                // Clear width/length fields if any
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                // Clear recommendation note
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = '-';
                }
            }
            else {
                // For other blind types, check size and update price
                checkSizeAndUpdatePrice(row);
            }
            
            // Update totals
            updateTotals();
        });
    }
    
    updateTotals();
}

function updateTotals() {
    const workOrderTable = document.getElementById('workOrderTable');
    const rows = workOrderTable.getElementsByTagName('tr');
    const discountInput = document.getElementById('discountPercent');
    const subtotalElement = document.getElementById('subtotal');
    const discountAmountElement = document.getElementById('discountAmount');
    const taxElement = document.getElementById('taxAmount'); // Make sure this element exists in HTML
    const grandTotalElement = document.getElementById('grandTotal');
    
    let subtotal = 0;
    let installationTotal = 0;
    let hasInstallation = false;
    
    for (let i = 1; i < rows.length - 4; i++) { // Adjusted for the extra tax row
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > 0) {
            const blindType = cells[0].querySelector('select')?.value || '';
            const quantity = parseInt(cells[3].querySelector('input')?.value || '0');
            const unitPrice = parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0;
            let total = quantity * unitPrice;
            
            // Track installation service for minimum charge
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
        // Calculate the difference to add to subtotal
        const difference = 75 - installationTotal;
        subtotal += difference;
        
        // Update line totals for installation rows
        for (let i = 1; i < rows.length - 4; i++) {
            const cells = rows[i].getElementsByTagName('td');
            if (cells.length > 0) {
                const blindType = cells[0].querySelector('select')?.value || '';
                if (blindType === 'Installation') {
                    // Find the first installation row and set it to the minimum
                    const lineTotal = cells[7].querySelector('.line-total');
                    const quantity = parseInt(cells[3].querySelector('input')?.value || '0');
                    const unitPrice = parseFloat(cells[6].querySelector('.unit-price').textContent.replace('$', '')) || 0;
                    const rowTotal = quantity * unitPrice;
                    
                    // Add the difference to the first installation row
                    lineTotal.textContent = formatCurrency(rowTotal + difference);
                    break; // Only update one row
                }
            }
        }
    }
    
    subtotalElement.textContent = formatCurrency(subtotal);
    const discountPercent = parseFloat(discountInput.value || '0');
    const discountAmount = (subtotal * (discountPercent / 100));
    discountAmountElement.textContent = formatCurrency(discountAmount);
    
    // Changed to 8.25% tax for Euless, TX
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825; // 8.25% tax
    if (taxElement) {
        taxElement.textContent = formatCurrency(taxAmount);
    }
    
    const grandTotal = discountedSubtotal + taxAmount;
    grandTotalElement.textContent = formatCurrency(grandTotal);
}

function addLineItem() {
    const workOrderTable = document.getElementById('workOrderTable').querySelector('tbody');
    const row = createTableRow([
        `<select><option value="Faux Wood">Faux Wood</option>
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
            // For width/length inputs, trigger size check
            if (input.placeholder === "Width (in)" || input.placeholder === "Length (in)") {
                const row = input.closest('tr');
                checkSizeAndUpdatePrice(row);
            }
            // For all inputs, update totals
            updateTotals();
        });
    });
    
    // Add change event listener to the select
    const select = row.querySelector('select');
    if (select) {
        select.addEventListener('change', () => {
            const row = select.closest('tr');
            
            // If Installation is selected, set unit price to $15
            if (select.value === 'Installation') {
                const unitPriceElement = row.querySelector('.unit-price');
                unitPriceElement.textContent = '$15.00';
                
                // Clear width/length fields if any
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                // Set recommendation note
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = 'Min. charge $75.00';
                }
            }
            // If Removal is selected, set unit price to $5
            else if (select.value === 'Removal') {
                const unitPriceElement = row.querySelector('.unit-price');
                unitPriceElement.textContent = '$5.00';
                
                // Clear width/length fields if any
                const widthInput = row.querySelector('input[placeholder="Width (in)"]');
                const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
                if (widthInput) widthInput.value = '';
                if (lengthInput) lengthInput.value = '';
                
                // Clear recommendation note
                const recommendedSizeElement = row.querySelector('.recommended-size');
                if (recommendedSizeElement) {
                    recommendedSizeElement.textContent = '-';
                }
            }
            else {
                // For other blind types, check size and update price
                checkSizeAndUpdatePrice(row);
            }
            
            // Update totals
            updateTotals();
        });
    }
    
    updateTotals();
}

// New helper function to check size and update price
function checkSizeAndUpdatePrice(row) {
    const widthInput = row.querySelector('input[placeholder="Width (in)"]');
    const lengthInput = row.querySelector('input[placeholder="Length (in)"]');
    const width = parseFloat(widthInput?.value);
    const length = parseFloat(lengthInput?.value);
    
    // Get the status and recommended size elements
    const stockStatusElement = row.querySelector('.stock-status');
    const recommendedSizeElement = row.querySelector('.recommended-size');
    const unitPriceElement = row.querySelector('.unit-price');
    const lineTotalElement = row.querySelector('.line-total');
    const quantityInput = row.querySelector('.quantity-input');
    
    if (width && length) {
        // Make sure these elements exist before trying to update them
        if (stockStatusElement && recommendedSizeElement && unitPriceElement) {
            const match = findStockSize(width, length); // Function from inventory.js
            if (match) {
                stockStatusElement.textContent = 'Available';
                stockStatusElement.style.color = 'green';
                recommendedSizeElement.textContent = `Pull size: ${match.stockSize}`;
                unitPriceElement.textContent = formatCurrency(match.price);
                
                // Update line total if quantity exists
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

function removeLineItem(button) {
    const row = button.closest('tr');
    row.parentNode.removeChild(row);
    updateTotals();
}

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
    
    for (let i = 1; i < rows.length - 4; i++) { // Adjusted for the extra tax row
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
    const tax = discountedSubtotal * 0.0825; // Changed to 8.25% tax
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
    
    doc.text('Tax (8.25%):', 140, yPos); // Changed from 8.5% to 8.25%
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

function acceptQuote() {
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
    if (workOrderData.serviceType === 'install' && document.getElementById('includeInstallation') && document.getElementById('includeInstallation').checked) {
        workOrderData.items.push({
            blindType: 'Installation',
            description: 'Blind Installation Service',
            quantity: '1',
            unitPrice: 75.00
        });
    }
    
    // Add removal service if needed
    if (document.getElementById('includeRemoval') && document.getElementById('includeRemoval').checked) {
        workOrderData.items.push({
            blindType: 'Removal',
            description: 'Removal of Old Blinds',
            unitPrice: 35.00,
            quantity: '1'
        });
    }
    
    if (workOrderData.items.length === 0) {
        alert('Please add at least one item to the work order');
        return;
    }
    
    const savedPickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    savedPickSheets.push(workOrderData);
    StorageUtil.save(StorageKeys.PICK_SHEETS, savedPickSheets);
    
    if (document.getElementById('pickSheet').classList.contains('active')) {
        updatePickSheet(); // Defined in pickSheet.js
    }
    
    document.getElementById('workOrderForm').reset();
    document.getElementById('workOrderTable').querySelector('tbody').innerHTML = '';
    alert('Work order sent to warehouse successfully!');
}

// Save/Load quote functionality
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
            `<span class="unit-price">$${item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}</span>`,
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

document.addEventListener('DOMContentLoaded', () => {
    // Basic event listeners
    const quantityListener = function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
            updateTotals();
        }
    };
    
    document.getElementById('workOrderTable')?.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
            if (e.target.placeholder === "Width (in)" || e.target.placeholder === "Length (in)") {
                const row = e.target.closest('tr');
                checkSizeAndUpdatePrice(row);
            }
            
            // Update totals whenever any input changes
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