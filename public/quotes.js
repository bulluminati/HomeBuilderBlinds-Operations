// quotes.js - Quote Management Functionality

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

// Make functions globally available
window.saveQuote = saveQuote;
window.deleteQuote = deleteQuote;
window.updateQuoteDropdown = updateQuoteDropdown;
window.loadQuote = loadQuote;
window.createEstimate = createEstimate; 