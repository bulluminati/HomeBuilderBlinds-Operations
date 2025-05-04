// invoices.js - Invoice management functionality

// Initialize invoices array and load from storage
let invoices = [];
const INVOICE_STORAGE_KEY = 'blinds_invoices';

// Load invoices on page load
function loadInvoices() {
    const savedInvoices = StorageUtil.load(INVOICE_STORAGE_KEY);
    if (savedInvoices) {
        invoices = savedInvoices;
    }
}

// Generate invoice number with format INV-XXXXXX (where X is a digit)
function generateInvoiceNumber() {
    return 'INV-' + Date.now().toString().slice(-6);
}

// Add line item to the invoice
function addInvoiceLineItem() {
    const invoiceTable = document.getElementById('invoiceTable').querySelector('tbody');
    const row = createTableRow([
        `<select class="premium-select">
            <option value="Faux Wood">Faux Wood</option>
            <option value="Vertical">Vertical</option>
            <option value="Installation">Installation ($15/window)</option>
            <option value="Removal">Removal ($5/window)</option>
            <option value="Service Fee">Service Fee</option>
            <option value="Custom">Custom Item</option>
        </select>`,
        `<input type="text" class="premium-input item-description" placeholder="Description">`,
        `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="1">`,
        `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01">`,
        `<span class="line-total">$0.00</span>`,
        `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
    ]);
    invoiceTable.appendChild(row);

    // Add event listeners to the new inputs
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', updateInvoiceTotals);
    });

    // Add change event listener to the select
    const select = row.querySelector('select');
    if (select) {
        select.addEventListener('change', handleItemTypeChange);
    }

    updateInvoiceTotals();
}

// Handle item type change
function handleItemTypeChange(event) {
    const row = event.target.closest('tr');
    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');
    
    // Pre-fill description and price based on selection
    const itemType = event.target.value;
    switch(itemType) {
        case 'Installation':
            descriptionInput.value = 'Blind Installation Service ($15/window)';
            priceInput.value = '15.00';
            
            // Set recommendation note (min charge $75) if it exists
            const recommendedElement = row.querySelector('.recommended-size');
            if (recommendedElement) {
                recommendedElement.textContent = 'Min. charge $75.00';
            }
            break;
        case 'Removal':
            descriptionInput.value = 'Removal of Old Blinds ($5/window)';
            priceInput.value = '5.00';
            break;
        case 'Service Fee':
            descriptionInput.value = 'Service Fee';
            priceInput.value = '50.00';
            break;
        default:
            // Clear for custom items or products
            if (descriptionInput.value === 'Blind Installation Service ($15/window)' || 
                descriptionInput.value === 'Service Fee' || 
                descriptionInput.value === 'Removal of Old Blinds ($5/window)') {
                descriptionInput.value = '';
                priceInput.value = '';
            }
    }
    
    updateInvoiceTotals();
}

// Remove line item from the invoice
function removeInvoiceLineItem(button) {
    const row = button.closest('tr');
    row.parentNode.removeChild(row);
    updateInvoiceTotals();
}

// Update invoice totals
// Update invoice totals
function updateInvoiceTotals() {
    const invoiceTable = document.getElementById('invoiceTable');
    const rows = invoiceTable.getElementsByTagName('tr');
    const subtotalElement = document.getElementById('invoiceSubtotal');
    const discountPercentInput = document.getElementById('invoiceDiscountPercent');
    const discountAmountElement = document.getElementById('invoiceDiscountAmount');
    const taxElement = document.getElementById('invoiceTaxAmount');
    const grandTotalElement = document.getElementById('invoiceGrandTotal');
    
    // Calculate subtotal
    let subtotal = 0;
    let installationTotal = 0;
    let hasInstallation = false;
    
    for (let i = 1; i < rows.length - 4; i++) {
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > 0) {
            const itemType = cells[0].querySelector('select')?.value || '';
            const quantity = parseInt(cells[2].querySelector('input').value || '0');
            const unitPrice = parseFloat(cells[3].querySelector('input').value || '0');
            let total = quantity * unitPrice;
            
            // Track installation service for minimum charge
            if (itemType === 'Installation') {
                hasInstallation = true;
                installationTotal += total;
            }
            
            cells[4].querySelector('.line-total').textContent = formatCurrency(total);
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
                const itemType = cells[0].querySelector('select')?.value || '';
                if (itemType === 'Installation') {
                    // Find the first installation row and set it to the minimum
                    const lineTotal = cells[4].querySelector('.line-total');
                    const quantity = parseInt(cells[2].querySelector('input').value || '0');
                    const unitPrice = parseFloat(cells[3].querySelector('input').value || '0');
                    const rowTotal = quantity * unitPrice;
                    
                    // Add the difference to the first installation row
                    lineTotal.textContent = formatCurrency(rowTotal + difference);
                    break; // Only update one row
                }
            }
        }
    }
    
    subtotalElement.textContent = formatCurrency(subtotal);
    
    // Calculate discount
    const discountPercent = parseFloat(discountPercentInput.value || '0');
    const discountAmount = (subtotal * (discountPercent / 100));
    discountAmountElement.textContent = formatCurrency(discountAmount);
    
    // Calculate tax (Euless, TX = 8.25%)
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825; // 8.25% tax
    taxElement.textContent = formatCurrency(taxAmount);
    
    // Calculate grand total
    const grandTotal = discountedSubtotal + taxAmount;
    grandTotalElement.textContent = formatCurrency(grandTotal);
}

// Create new invoice
function createNewInvoice() {
    // Clear form
    document.getElementById('invoiceNumber').value = generateInvoiceNumber();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Due in 30 days
    document.getElementById('invoiceClientName').value = '';
    document.getElementById('invoiceClientAddress').value = '';
    document.getElementById('invoiceClientPhone').value = '';
    document.getElementById('invoiceClientEmail').value = '';
    document.getElementById('invoiceDiscountPercent').value = '0';
    
    // Clear line items
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Add one empty line item by default
    addInvoiceLineItem();
    
    // Update totals
    updateInvoiceTotals();
}

// Convert work order to invoice
function convertWorkOrderToInvoice(workOrderId) {
    const savedPickSheets = StorageUtil.load(StorageKeys.PICK_SHEETS) || [];
    const workOrder = savedPickSheets.find(order => order.id === workOrderId);
    
    if (!workOrder) {
        alert('Work order not found');
        return;
    }
    
    // Fill in client info
    document.getElementById('invoiceNumber').value = generateInvoiceNumber();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Due in 30 days
    document.getElementById('invoiceClientName').value = workOrder.clientName || '';
    document.getElementById('invoiceClientAddress').value = workOrder.propertyName || '';
    document.getElementById('invoiceClientPhone').value = workOrder.clientPhone || '';
    document.getElementById('invoiceClientEmail').value = workOrder.clientEmail || '';
    document.getElementById('invoiceDiscountPercent').value = '0';
    
    // Clear line items
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Add work order items to invoice
    workOrder.items.forEach(item => {
        const row = createTableRow([
            `<select class="premium-select">
                <option value="${item.blindType}" selected>${item.blindType}</option>
                <option value="Installation">Installation</option>
                <option value="Service Fee">Service Fee</option>
                <option value="Removal">Removal of Old Blinds</option>
                <option value="Custom">Custom Item</option>
            </select>`,
            `<input type="text" class="premium-input item-description" value="${item.width}\" x ${item.length}\"" placeholder="Description">`,
            `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="${item.quantity}">`,
            `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="${item.unitPrice.toFixed(2)}">`,
            `<span class="line-total">$${(item.quantity * item.unitPrice).toFixed(2)}</span>`,
            `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
        ]);
        
        tbody.appendChild(row);
        
        // Add event listeners to inputs
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        
        // Add change event listener to the select
        const select = row.querySelector('select');
        if (select) {
            select.addEventListener('change', handleItemTypeChange);
        }
    });
    
    // Add a separate line item for installation by default
    const installRow = createTableRow([
        `<select class="premium-select">
            <option value="Installation" selected>Installation</option>
            <option value="Faux Wood">Faux Wood</option>
            <option value="Vertical">Vertical</option>
            <option value="Service Fee">Service Fee</option>
            <option value="Removal">Removal of Old Blinds</option>
            <option value="Custom">Custom Item</option>
        </select>`,
        `<input type="text" class="premium-input item-description" value="Blind Installation Service" placeholder="Description">`,
        `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="1">`,
        `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="75.00">`,
        `<span class="line-total">$75.00</span>`,
        `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
    ]);
    
    tbody.appendChild(installRow);
    
    // Add event listeners to inputs for installation row
    const installInputs = installRow.querySelectorAll('input');
    installInputs.forEach(input => {
        input.addEventListener('input', updateInvoiceTotals);
    });
    
    // Add event listener to installation select
    const installSelect = installRow.querySelector('select');
    if (installSelect) {
        installSelect.addEventListener('change', handleItemTypeChange);
    }
    
    // Switch to invoices tab and update totals
    const invoicesButton = document.querySelector('.nav-button[data-tab="invoices"]');
    if (invoicesButton) {
        invoicesButton.click();
    }
    
    updateInvoiceTotals();
}

// Save invoice
function saveInvoice() {
    // Get invoice data
    const invoiceData = {
        id: document.getElementById('invoiceNumber').value || generateInvoiceNumber(),
        dateCreated: document.getElementById('invoiceDate').value,
        dateDue: document.getElementById('invoiceDueDate').value,
        clientName: document.getElementById('invoiceClientName').value,
        clientAddress: document.getElementById('invoiceClientAddress').value,
        clientPhone: document.getElementById('invoiceClientPhone').value,
        clientEmail: document.getElementById('invoiceClientEmail').value,
        discount: document.getElementById('invoiceDiscountPercent').value || '0',
        items: [],
        status: 'unpaid',
        dateUpdated: new Date().toISOString()
    };
    
    if (!invoiceData.clientName) {
        alert('Please enter a client name before saving the invoice');
        return;
    }
    
    // Get line items
    const rows = Array.from(document.getElementById('invoiceTable').querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const cells = row.cells;
        if (cells.length > 0) {
            const itemType = cells[0].querySelector('select')?.value || '';
            const description = cells[1].querySelector('input')?.value || '';
            const quantity = cells[2].querySelector('input')?.value || '0';
            const unitPrice = cells[3].querySelector('input')?.value || '0';
            
            if (itemType && description) {
                const item = { 
                    itemType,
                    description, 
                    quantity,
                    unitPrice: parseFloat(unitPrice)
                };
                invoiceData.items.push(item);
            }
        }
    });
    
    if (invoiceData.items.length === 0) {
        alert('Please add at least one item to the invoice');
        return;
    }
    
    // Calculate totals
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (parseFloat(invoiceData.discount) / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825; // 8.25% tax
    
    invoiceData.subtotal = subtotal;
    invoiceData.discountAmount = discountAmount;
    invoiceData.taxAmount = taxAmount;
    invoiceData.total = discountedSubtotal + taxAmount;
    
    // Check if this is a new invoice or updating an existing one
    const existingIndex = invoices.findIndex(inv => inv.id === invoiceData.id);
    
    if (existingIndex >= 0) {
        // Update existing invoice
        invoices[existingIndex] = invoiceData;
    } else {
        // Add new invoice
        invoices.push(invoiceData);
    }
    
    // Save to storage
    StorageUtil.save(INVOICE_STORAGE_KEY, invoices);
    
    // Update invoice list
    updateInvoiceList();
    
    alert('Invoice saved successfully');
}

// Update the invoice list
function updateInvoiceList() {
    const invoiceListContainer = document.getElementById('invoiceList');
    if (!invoiceListContainer) return;
    
    // Sort invoices by date (newest first)
    invoices.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    
    // Clear list
    invoiceListContainer.innerHTML = '';
    
    // Create list of invoices
    invoices.forEach(invoice => {
        const invoiceCard = document.createElement('div');
        invoiceCard.className = 'premium-card';
        invoiceCard.innerHTML = `
            <div class="premium-card-header">
                <h3>${invoice.clientName}</h3>
                <span class="invoice-status ${invoice.status}">${invoice.status.toUpperCase()}</span>
            </div>
            <div class="premium-card-body">
                <p><strong>Invoice #:</strong> ${invoice.id}</p>
                <p><strong>Date:</strong> ${formatDate(invoice.dateCreated)}</p>
                <p><strong>Amount:</strong> ${formatCurrency(invoice.total)}</p>
            </div>
            <div class="premium-card-footer">
                <button onclick="editInvoice('${invoice.id}')" class="premium-button">Edit</button>
                <button onclick="printInvoice('${invoice.id}')" class="premium-button">Print</button>
                <button onclick="markInvoiceAsPaid('${invoice.id}')" class="premium-button ${invoice.status === 'paid' ? 'hidden' : ''}">Mark as Paid</button>
                <button onclick="deleteInvoice('${invoice.id}')" class="premium-button premium-danger">Delete</button>
            </div>
        `;
        
        invoiceListContainer.appendChild(invoiceCard);
    });
}

// Edit an existing invoice
function editInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
        alert('Invoice not found');
        return;
    }
    
    // Fill in invoice details
    document.getElementById('invoiceNumber').value = invoice.id;
    document.getElementById('invoiceDate').value = invoice.dateCreated;
    document.getElementById('invoiceDueDate').value = invoice.dateDue;
    document.getElementById('invoiceClientName').value = invoice.clientName;
    document.getElementById('invoiceClientAddress').value = invoice.clientAddress || '';
    document.getElementById('invoiceClientPhone').value = invoice.clientPhone || '';
    document.getElementById('invoiceClientEmail').value = invoice.clientEmail || '';
    document.getElementById('invoiceDiscountPercent').value = invoice.discount || '0';
    
    // Clear invoice table
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Add invoice items
    invoice.items.forEach(item => {
        const row = createTableRow([
            `<select class="premium-select">
                <option value="Faux Wood" ${item.itemType === 'Faux Wood' ? 'selected' : ''}>Faux Wood</option>
                <option value="Vertical" ${item.itemType === 'Vertical' ? 'selected' : ''}>Vertical</option>
                <option value="Installation" ${item.itemType === 'Installation' ? 'selected' : ''}>Installation</option>
                <option value="Service Fee" ${item.itemType === 'Service Fee' ? 'selected' : ''}>Service Fee</option>
                <option value="Removal" ${item.itemType === 'Removal' ? 'selected' : ''}>Removal of Old Blinds</option>
                <option value="Custom" ${item.itemType === 'Custom' ? 'selected' : ''}>Custom Item</option>
            </select>`,
            `<input type="text" class="premium-input item-description" value="${item.description}" placeholder="Description">`,
            `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="${item.quantity}">`,
            `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="${item.unitPrice.toFixed(2)}">`,
            `<span class="line-total">$${(item.quantity * item.unitPrice).toFixed(2)}</span>`,
            `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
        ]);
        
        tbody.appendChild(row);
        
        // Add event listeners
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        
        const select = row.querySelector('select');
        if (select) {
            select.addEventListener('change', handleItemTypeChange);
        }
    });
    
    // Update totals
    updateInvoiceTotals();
    
    // Scroll to the invoice form
    document.querySelector('#invoices .premium-header').scrollIntoView({ behavior: 'smooth' });
}

// Mark invoice as paid
function markInvoiceAsPaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
        alert('Invoice not found');
        return;
    }
    
    invoice.status = 'paid';
    invoice.datePaid = new Date().toISOString();
    
    // Save to storage
    StorageUtil.save(INVOICE_STORAGE_KEY, invoices);
    
    // Update the list
    updateInvoiceList();
}

// Delete invoice
function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    
    if (index === -1) {
        alert('Invoice not found');
        return;
    }
    
    invoices.splice(index, 1);
    
    // Save to storage
    StorageUtil.save(INVOICE_STORAGE_KEY, invoices);
    
    // Update the list
    updateInvoiceList();
}

// Generate PDF invoice
function printInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
        alert('Invoice not found');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header styling
    doc.setFillColor(30, 61, 89);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(188, 147, 85);
    doc.setFontSize(24);
    doc.text('Home Builder Blinds', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('INVOICE', 105, 32, { align: 'center' });
    
    // Invoice details
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('INVOICE #: ' + invoice.id, 20, 55);
    doc.text('DATE: ' + formatDate(invoice.dateCreated), 20, 62);
    doc.text('DUE DATE: ' + formatDate(invoice.dateDue), 20, 69);
    
    if (invoice.status === 'paid') {
        doc.setFillColor(39, 174, 96);
        doc.rect(150, 52, 40, 15, 'F');
        doc.setTextColor(255);
        doc.setFontSize(12);
        doc.text('PAID', 170, 62, { align: 'center' });
        doc.setTextColor(0);
    }
    
    // Client information
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 85);
    doc.setFontSize(11);
    doc.text(invoice.clientName, 30, 95);
    doc.text(invoice.clientAddress, 30, 102);
    doc.text('Phone: ' + (invoice.clientPhone || 'N/A'), 30, 109);
    doc.text('Email: ' + (invoice.clientEmail || 'N/A'), 30, 116);
    
    // Invoice items table
    let yPos = 130;
    
    // Table header
    doc.setFillColor(30, 61, 89);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    const headers = ['Item', 'Description', 'Qty', 'Price', 'Total'];
    const positions = [20, 60, 130, 150, 180];
    headers.forEach((header, i) => doc.text(header, positions[i], yPos));
    
    // Table rows
    doc.setTextColor(0);
    yPos = 140;
    
    invoice.items.forEach(item => {
        // Check if we need a new page
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.text(item.itemType, 20, yPos);
        doc.text(item.description, 60, yPos);
        doc.text(item.quantity.toString(), 130, yPos);
        doc.text('$' + parseFloat(item.unitPrice).toFixed(2), 150, yPos);
        doc.text('$' + (item.quantity * item.unitPrice).toFixed(2), 180, yPos);
        
        yPos += 10;
    });
    
    // Add totals
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.text('Subtotal:', 140, yPos);
    doc.text('$' + invoice.subtotal.toFixed(2), 180, yPos);
    yPos += 10;
    
    if (parseFloat(invoice.discount) > 0) {
        doc.text(`Discount (${invoice.discount}%):`, 140, yPos);
        doc.text('-$' + invoice.discountAmount.toFixed(2), 180, yPos);
        yPos += 10;
    }
    
    doc.text('Tax (8.25%):', 140, yPos);
    doc.text('$' + invoice.taxAmount.toFixed(2), 180, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text('Total:', 140, yPos);
    doc.text('$' + invoice.total.toFixed(2), 180, yPos);
    
    // Payment instructions
    yPos += 20;
    doc.setFontSize(10);
    doc.text('Payment Instructions:', 20, yPos);
    yPos += 7;
    doc.text('Please make checks payable to Home Builder Blinds', 25, yPos);
    yPos += 7;
    doc.text('For electronic payments, please contact our office', 25, yPos);
    
    // Footer
    yPos = 270;
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    doc.text('Contact: (817) 767-3874 | mike@homebuilderblinds.com', 105, yPos + 7, { align: 'center' });
    
    // Border
    doc.setDrawColor(188, 147, 85);
    doc.setLineWidth(2);
    doc.rect(5, 5, 200, 287);
    
    // Save the PDF
    const fileName = `Invoice_${invoice.clientName.replace(/\s+/g, '_')}_${invoice.id}.pdf`;
    doc.save(fileName);
}

// Initialize module
document.addEventListener('DOMContentLoaded', () => {
    // Load existing invoices
    loadInvoices();
    
    // Set default values for new invoices
    if (document.getElementById('invoiceDate')) {
        document.getElementById('invoiceDate').valueAsDate = new Date();
    }
    
    if (document.getElementById('invoiceDueDate')) {
        // Set due date to 30 days from now by default
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('invoiceDueDate').valueAsDate = dueDate;
    }
    
    // Add event listener for discount input
    const discountInput = document.getElementById('invoiceDiscountPercent');
    if (discountInput) {
        discountInput.addEventListener('input', updateInvoiceTotals);
    }
    
    // Initialize invoice list if element exists
    if (document.getElementById('invoiceList')) {
        updateInvoiceList();
    }
    
    // Load quotes into the quotes dropdown
    updateQuotesDropdown();
    
    // Create new invoice button
    const newInvoiceButton = document.getElementById('newInvoiceButton');
    if (newInvoiceButton) {
        newInvoiceButton.addEventListener('click', createNewInvoice);
    }
    
    // Save invoice button
    const saveInvoiceButton = document.getElementById('saveInvoiceButton');
    if (saveInvoiceButton) {
        saveInvoiceButton.addEventListener('click', saveInvoice);
    }
    
    // Quote selection dropdown
    const quotesDropdown = document.getElementById('quotesDropdown');
    if (quotesDropdown) {
        quotesDropdown.addEventListener('change', function() {
            if (this.value) {
                convertQuoteToInvoice(this.value);
            }
        });
    }
    
    // If no invoice items, add one empty row
    const invoiceTable = document.getElementById('invoiceTable');
    if (invoiceTable && invoiceTable.querySelector('tbody').children.length === 0) {
        addInvoiceLineItem();
    }
});

// Function to update the quotes dropdown in the invoices tab
function updateQuotesDropdown() {
    const quotesDropdown = document.getElementById('quotesDropdown');
    if (!quotesDropdown) return;
    
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    
    // Clear existing options except the first one
    while (quotesDropdown.options.length > 1) {
        quotesDropdown.remove(1);
    }
    
    // Add quotes to dropdown
    savedQuotes.forEach(quote => {
        const option = document.createElement('option');
        option.value = quote.id;
        option.textContent = `${quote.clientName} - ${quote.id}`;
        quotesDropdown.appendChild(option);
    });
}

// Convert quote to invoice
function convertQuoteToInvoice(quoteId) {
    // Load saved quotes
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    const quote = savedQuotes.find(q => q.id === quoteId);
    
    if (!quote) {
        alert('Quote not found');
        return;
    }
    
    // Fill in client info
    document.getElementById('invoiceNumber').value = generateInvoiceNumber();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Due in 30 days
    document.getElementById('invoiceClientName').value = quote.clientName || '';
    document.getElementById('invoiceClientAddress').value = quote.propertyName || '';
    document.getElementById('invoiceClientPhone').value = quote.clientPhone || '';
    document.getElementById('invoiceClientEmail').value = quote.clientEmail || '';
    document.getElementById('invoiceDiscountPercent').value = quote.discount || '0';
    
    // Clear line items
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Add quote items to invoice
    quote.items.forEach(item => {
        const row = createTableRow([
            `<select class="premium-select">
                <option value="${item.blindType}" selected>${item.blindType}</option>
                <option value="Installation">Installation</option>
                <option value="Service Fee">Service Fee</option>
                <option value="Removal">Removal of Old Blinds</option>
                <option value="Custom">Custom Item</option>
            </select>`,
            `<input type="text" class="premium-input item-description" value="${item.width}\" x ${item.length}\"" placeholder="Description">`,
            `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="${item.quantity}">`,
            `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="${item.unitPrice.toFixed(2)}">`,
            `<span class="line-total">${(item.quantity * item.unitPrice).toFixed(2)}</span>`,
            `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
        ]);
        
        tbody.appendChild(row);
        
        // Add event listeners to inputs
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        
        // Add change event listener to the select
        const select = row.querySelector('select');
        if (select) {
            select.addEventListener('change', handleItemTypeChange);
        }
    });
    
    // If the service type is "install", add an installation line item
    if (quote.serviceType === 'install') {
        const installRow = createTableRow([
            `<select class="premium-select">
                <option value="Installation" selected>Installation</option>
                <option value="Faux Wood">Faux Wood</option>
                <option value="Vertical">Vertical</option>
                <option value="Service Fee">Service Fee</option>
                <option value="Removal">Removal of Old Blinds</option>
                <option value="Custom">Custom Item</option>
            </select>`,
            `<input type="text" class="premium-input item-description" value="Blind Installation Service" placeholder="Description">`,
            `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="1">`,
            `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="75.00">`,
            `<span class="line-total">$75.00</span>`,
            `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
        ]);
        
        tbody.appendChild(installRow);
        
        // Add event listeners to inputs for installation row
        const installInputs = installRow.querySelectorAll('input');
        installInputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        
        // Add event listener to installation select
        const installSelect = installRow.querySelector('select');
        if (installSelect) {
            installSelect.addEventListener('change', handleItemTypeChange);
        }
    }
    
    // Reset the dropdown
    document.getElementById('quotesDropdown').selectedIndex = 0;
    
    // Update totals
    updateInvoiceTotals();
}

// Add global window functions
window.addInvoiceLineItem = addInvoiceLineItem;
window.removeInvoiceLineItem = removeInvoiceLineItem;
window.updateInvoiceTotals = updateInvoiceTotals;
window.handleItemTypeChange = handleItemTypeChange;
window.saveInvoice = saveInvoice;
window.createNewInvoice = createNewInvoice;
window.editInvoice = editInvoice;
window.markInvoiceAsPaid = markInvoiceAsPaid;
window.deleteInvoice = deleteInvoice;
window.printInvoice = printInvoice;
window.convertWorkOrderToInvoice = convertWorkOrderToInvoice;
window.convertQuoteToInvoice = convertQuoteToInvoice;
window.updateQuotesDropdown = updateQuotesDropdown;