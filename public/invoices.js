// invoices.js - Invoice management functionality

// Initialize invoices array and load from backend
let invoices = [];

// Load invoices on page load
async function loadInvoices() {
    try {
        const res = await fetch('/api/invoices');
        const data = await res.json();
        if (data.success) {
            invoices = data.data;
        } else {
            invoices = [];
        }
    } catch (err) {
        console.error('Failed to load invoices:', err);
        invoices = [];
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
        const difference = 75 - installationTotal;
        subtotal += difference;
        for (let i = 1; i < rows.length - 4; i++) {
            const cells = rows[i].getElementsByTagName('td');
            if (cells.length > 0) {
                const itemType = cells[0].querySelector('select')?.value || '';
                if (itemType === 'Installation') {
                    const lineTotal = cells[4].querySelector('.line-total');
                    const quantity = parseInt(cells[2].querySelector('input').value || '0');
                    const unitPrice = parseFloat(cells[3].querySelector('input').value || '0');
                    const rowTotal = quantity * unitPrice;
                    lineTotal.textContent = formatCurrency(rowTotal + difference);
                    break;
                }
            }
        }
    }
    subtotalElement.textContent = formatCurrency(subtotal);
    const discountPercent = parseFloat(discountPercentInput.value || '0');
    const discountAmount = (subtotal * (discountPercent / 100));
    discountAmountElement.textContent = formatCurrency(discountAmount);
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825; // 8.25% tax
    taxElement.textContent = formatCurrency(taxAmount);
    const grandTotal = discountedSubtotal + taxAmount;
    grandTotalElement.textContent = formatCurrency(grandTotal);
}

// Create new invoice
function createNewInvoice() {
    document.getElementById('invoiceNumber').value = generateInvoiceNumber();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('invoiceClientName').value = '';
    document.getElementById('invoiceClientAddress').value = '';
    document.getElementById('invoiceClientPhone').value = '';
    document.getElementById('invoiceClientEmail').value = '';
    document.getElementById('invoiceDiscountPercent').value = '0';
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
    addInvoiceLineItem();
    updateInvoiceTotals();
}

// Save invoice
function saveInvoice() {
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
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (parseFloat(invoiceData.discount) / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.0825;
    invoiceData.subtotal = subtotal;
    invoiceData.discountAmount = discountAmount;
    invoiceData.taxAmount = taxAmount;
    invoiceData.total = discountedSubtotal + taxAmount;
    fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Invoice saved successfully');
            loadInvoices().then(updateInvoiceList);
        } else {
            alert('Failed to save invoice: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(err => {
        alert('Failed to save invoice: ' + err.message);
    });
}

// Update the invoice list
function updateInvoiceList() {
    const invoiceListContainer = document.getElementById('invoiceList');
    if (!invoiceListContainer) return;
    invoices.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    invoiceListContainer.innerHTML = '';
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
    document.getElementById('invoiceNumber').value = invoice.id;
    document.getElementById('invoiceDate').value = invoice.dateCreated;
    document.getElementById('invoiceDueDate').value = invoice.dateDue;
    document.getElementById('invoiceClientName').value = invoice.clientName;
    document.getElementById('invoiceClientAddress').value = invoice.clientAddress || '';
    document.getElementById('invoiceClientPhone').value = invoice.clientPhone || '';
    document.getElementById('invoiceClientEmail').value = invoice.clientEmail || '';
    document.getElementById('invoiceDiscountPercent').value = invoice.discount || '0';
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
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
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        const select = row.querySelector('select');
        if (select) {
            select.addEventListener('change', handleItemTypeChange);
        }
    });
    updateInvoiceTotals();
    document.querySelector('#invoices .premium-header').scrollIntoView({ behavior: 'smooth' });
}

// Mark invoice as paid
function markInvoiceAsPaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found');
        return;
    }
    fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', datePaid: new Date().toISOString() })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadInvoices().then(updateInvoiceList);
        } else {
            alert('Failed to mark as paid: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(err => {
        alert('Failed to mark as paid: ' + err.message);
    });
}

// Delete invoice
function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    fetch('/api/invoices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Invoice deleted successfully');
            loadInvoices().then(updateInvoiceList);
        } else {
            alert('Failed to delete invoice: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(err => {
        alert('Failed to delete invoice: ' + err.message);
    });
}

// Generate PDF invoice
function printInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found');
        return;
    }
    // Defensive defaults for all fields
    const id = invoice.id || '';
    const dateCreated = invoice.dateCreated || '';
    const dateDue = invoice.dateDue || '';
    const clientName = invoice.clientName || invoice.client_name || 'N/A';
    const clientAddress = invoice.clientAddress || invoice.client_address || 'N/A';
    const clientPhone = invoice.clientPhone || invoice.client_phone || 'N/A';
    const clientEmail = invoice.clientEmail || invoice.client_email || 'N/A';
    const discount = invoice.discount !== undefined ? invoice.discount : 0;
    const discountAmount = invoice.discountAmount !== undefined ? invoice.discountAmount : 0;
    const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : 0;
    const taxAmount = invoice.taxAmount !== undefined ? invoice.taxAmount : 0;
    const total = invoice.total !== undefined ? invoice.total : 0;
    const status = invoice.status || 'unpaid';
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(30, 61, 89);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(188, 147, 85);
    doc.setFontSize(24);
    doc.text('Home Builder Blinds', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('INVOICE', 105, 32, { align: 'center' });
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('INVOICE #: ' + id, 20, 55);
    doc.text('DATE: ' + formatDate(dateCreated), 20, 62);
    doc.text('DUE DATE: ' + formatDate(dateDue), 20, 69);
    if (status === 'paid') {
        doc.setFillColor(39, 174, 96);
        doc.rect(150, 52, 40, 15, 'F');
        doc.setTextColor(255);
        doc.setFontSize(12);
        doc.text('PAID', 170, 62, { align: 'center' });
        doc.setTextColor(0);
    }
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 85);
    doc.setFontSize(11);
    doc.text(clientName, 30, 95);
    doc.text(clientAddress, 30, 102);
    doc.text('Phone: ' + clientPhone, 30, 109);
    doc.text('Email: ' + clientEmail, 30, 116);
    let yPos = 130;
    doc.setFillColor(30, 61, 89);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    const headers = ['Item', 'Description', 'Qty', 'Price', 'Total'];
    const positions = [20, 60, 130, 150, 180];
    headers.forEach((header, i) => doc.text(header, positions[i], yPos));
    doc.setTextColor(0);
    yPos = 140;
    items.forEach(item => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        const itemType = item.itemType || item.blindType || '';
        const description = item.description || '';
        const quantity = item.quantity !== undefined ? item.quantity : '';
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : 0;
        doc.text(itemType.toString(), 20, yPos);
        doc.text(description.toString(), 60, yPos);
        doc.text(quantity.toString(), 130, yPos);
        doc.text('$' + parseFloat(unitPrice).toFixed(2), 150, yPos);
        doc.text('$' + (quantity * unitPrice).toFixed(2), 180, yPos);
        yPos += 10;
    });
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.text('Subtotal:', 140, yPos);
    doc.text('$' + subtotal.toFixed(2), 180, yPos);
    yPos += 10;
    if (parseFloat(discount) > 0) {
        doc.text(`Discount (${discount}%):`, 140, yPos);
        doc.text('-$' + discountAmount.toFixed(2), 180, yPos);
        yPos += 10;
    }
    doc.text('Tax (8.25%):', 140, yPos);
    doc.text('$' + taxAmount.toFixed(2), 180, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text('Total:', 140, yPos);
    doc.text('$' + total.toFixed(2), 180, yPos);
    yPos += 20;
    doc.setFontSize(10);
    doc.text('Payment Instructions:', 20, yPos);
    yPos += 7;
    doc.text('Please make checks payable to Home Builder Blinds', 25, yPos);
    yPos += 7;
    doc.text('For electronic payments, please contact our office', 25, yPos);
    yPos = 270;
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    doc.text('Contact: (817) 767-3874 | mike@homebuilderblinds.com', 105, yPos + 7, { align: 'center' });
    doc.setDrawColor(188, 147, 85);
    doc.setLineWidth(2);
    doc.rect(5, 5, 200, 287);
    const fileName = `Invoice_${clientName.replace(/\s+/g, '_')}_${id}.pdf`;
    doc.save(fileName);
}

// Function to update the quotes dropdown in the invoices tab
function updateQuotesDropdown() {
    const quotesDropdown = document.getElementById('quotesDropdown');
    if (!quotesDropdown) return;
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    while (quotesDropdown.options.length > 1) {
        quotesDropdown.remove(1);
    }
    savedQuotes.forEach(quote => {
        const option = document.createElement('option');
        option.value = quote.id;
        option.textContent = `${quote.clientName} - ${quote.id}`;
        quotesDropdown.appendChild(option);
    });
}

// Convert quote to invoice
function convertQuoteToInvoice(quoteId) {
    const savedQuotes = StorageUtil.load(StorageKeys.QUOTES) || [];
    const quote = savedQuotes.find(q => q.id === quoteId);
    if (!quote) {
        alert('Quote not found');
        return;
    }
    document.getElementById('invoiceNumber').value = generateInvoiceNumber();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('invoiceClientName').value = quote.clientName || '';
    document.getElementById('invoiceClientAddress').value = quote.propertyName || '';
    document.getElementById('invoiceClientPhone').value = quote.clientPhone || '';
    document.getElementById('invoiceClientEmail').value = quote.clientEmail || '';
    document.getElementById('invoiceDiscountPercent').value = quote.discount || '0';
    const tbody = document.getElementById('invoiceTable').querySelector('tbody');
    tbody.innerHTML = '';
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
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        const select = row.querySelector('select');
        if (select) {
            select.addEventListener('change', handleItemTypeChange);
        }
    });
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
        const installInputs = installRow.querySelectorAll('input');
        installInputs.forEach(input => {
            input.addEventListener('input', updateInvoiceTotals);
        });
        const installSelect = installRow.querySelector('select');
        if (installSelect) {
            installSelect.addEventListener('change', handleItemTypeChange);
        }
    }
    document.getElementById('quotesDropdown').selectedIndex = 0;
    updateInvoiceTotals();
}

// Utility: create table row from array of HTML strings
function createTableRow(cells) {
    const tr = document.createElement('tr');
    cells.forEach(cellHTML => {
        const td = document.createElement('td');
        td.innerHTML = cellHTML;
        tr.appendChild(td);
    });
    return tr;
}

// Utility: format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Utility: format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

// Initialize module

// On DOMContentLoaded, load invoices and set up UI

document.addEventListener('DOMContentLoaded', () => {
    loadInvoices().then(updateInvoiceList);
    if (document.getElementById('invoiceDate')) {
        document.getElementById('invoiceDate').valueAsDate = new Date();
    }
    if (document.getElementById('invoiceDueDate')) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('invoiceDueDate').valueAsDate = dueDate;
    }
    const discountInput = document.getElementById('invoiceDiscountPercent');
    if (discountInput) {
        discountInput.addEventListener('input', updateInvoiceTotals);
    }
    if (document.getElementById('invoiceList')) {
        updateInvoiceList();
    }
    updateQuotesDropdown();
    const newInvoiceButton = document.getElementById('newInvoiceButton');
    if (newInvoiceButton) {
        newInvoiceButton.addEventListener('click', createNewInvoice);
    }
    const saveInvoiceButton = document.getElementById('saveInvoiceButton');
    if (saveInvoiceButton) {
        saveInvoiceButton.addEventListener('click', saveInvoice);
    }
    const quotesDropdown = document.getElementById('quotesDropdown');
    if (quotesDropdown) {
        quotesDropdown.addEventListener('change', function() {
            if (this.value) {
                convertQuoteToInvoice(this.value);
            }
        });
    }
    const invoiceTable = document.getElementById('invoiceTable');
    if (invoiceTable && invoiceTable.querySelector('tbody').children.length === 0) {
        addInvoiceLineItem();
    }
});

// --- Import from Work Orders Feature ---
async function importFromWorkOrders() {
    try {
        const res = await fetch('/api/finalized-orders');
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
            alert('No finalized work orders found.');
            return;
        }
        // Prompt user to select a work order
        const selection = prompt('Select a work order by entering its number (\n' + data.data.map((order, i) => `${i + 1}: ${order.id} - ${order.client_name} (${order.property_name || ''})`).join('\n') + '\n):');
        const idx = parseInt(selection) - 1;
        if (isNaN(idx) || idx < 0 || idx >= data.data.length) {
            alert('Invalid selection.');
            return;
        }
        const order = data.data[idx];
        // Fill invoice form with work order data
        document.getElementById('invoiceNumber').value = generateInvoiceNumber();
        document.getElementById('invoiceDate').valueAsDate = new Date();
        document.getElementById('invoiceDueDate').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        document.getElementById('invoiceClientName').value = order.client_name || '';
        document.getElementById('invoiceClientAddress').value = order.property_name || '';
        document.getElementById('invoiceClientPhone').value = order.client_phone || '';
        document.getElementById('invoiceClientEmail').value = order.client_email || '';
        document.getElementById('invoiceDiscountPercent').value = '0';
        const tbody = document.getElementById('invoiceTable').querySelector('tbody');
        tbody.innerHTML = '';
        (order.items || []).forEach(item => {
            const row = createTableRow([
                `<select class="premium-select">
                    <option value="Faux Wood" ${item.blindType === 'Faux Wood' ? 'selected' : ''}>Faux Wood</option>
                    <option value="Vertical" ${item.blindType === 'Vertical' ? 'selected' : ''}>Vertical</option>
                    <option value="Installation" ${item.blindType === 'Installation' ? 'selected' : ''}>Installation</option>
                    <option value="Service Fee" ${item.blindType === 'Service Fee' ? 'selected' : ''}>Service Fee</option>
                    <option value="Removal" ${item.blindType === 'Removal' ? 'selected' : ''}>Removal of Old Blinds</option>
                    <option value="Custom" ${item.blindType === 'Custom' ? 'selected' : ''}>Custom Item</option>
                </select>`,
                `<input type="text" class="premium-input item-description" value="${item.description || (item.width && item.length ? `${item.width}\" x ${item.length}\"` : '')}" placeholder="Description">`,
                `<input type="number" class="premium-input item-quantity" placeholder="Quantity" min="1" value="${item.quantity}">`,
                `<input type="number" class="premium-input item-price" placeholder="Price" step="0.01" value="${item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'}">`,
                `<span class="line-total">$${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</span>`,
                `<button onclick="removeInvoiceLineItem(this)" class="premium-button">Remove</button>`
            ]);
            tbody.appendChild(row);
            const inputs = row.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', updateInvoiceTotals);
            });
            const select = row.querySelector('select');
            if (select) {
                select.addEventListener('change', handleItemTypeChange);
            }
        });
        updateInvoiceTotals();
    } catch (err) {
        alert('Failed to import work orders: ' + err.message);
    }
}

// Add the button to the DOM on page load
(function addImportButton() {
    document.addEventListener('DOMContentLoaded', function() {
        const btnGroup = document.querySelector('#invoices .premium-button-group');
        if (btnGroup && !document.getElementById('importWorkOrderButton')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'importWorkOrderButton';
            btn.className = 'premium-button';
            btn.textContent = 'Import from Work Orders';
            btn.onclick = importFromWorkOrders;
            btnGroup.insertBefore(btn, btnGroup.firstChild);
        }
    });
})();