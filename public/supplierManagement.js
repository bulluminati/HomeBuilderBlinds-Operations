// supplierManagement.js - Supplier profile management

// Storage key for supplier profiles
const SUPPLIER_PROFILES_KEY = 'SUPPLIER_PROFILES';

// Supplier profile structure
/*
{
  id: string,          // Unique identifier
  name: string,        // Supplier name
  email: string,       // Email address
  contact_person: string, // Contact person's name
  phone: string,       // Phone number
  product_types: string, // Comma-separated list of product types
  lead_time: number,   // Typical lead time in days
  default_terms: string, // Payment terms
  notes: string,       // Additional notes
}
*/

// Initialize supplier management
function initializeSupplierManagement() {
  // Add supplier management features to dashboard
  const dashboardTab = document.getElementById('home');
  if (dashboardTab) {
    addSupplierManagementToDashboard(dashboardTab);
  }
  
  // Initialize supplier list
  loadSupplierList();
  
  // Add event listeners
  document.getElementById('supplierAccountForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    createSupplierAccount();
  });
}

// Add supplier management section to dashboard
function addSupplierManagementToDashboard(dashboardTab) {
  // Create supplier management section if it doesn't exist
  if (!document.getElementById('supplierManagementSection')) {
    const section = document.createElement('div');
    section.id = 'supplierManagementSection';
    section.className = 'business-section premium-metrics';
    section.innerHTML = `
      <h3 class="premium-subheader">Supplier Management</h3>
      <div class="premium-table-responsive">
        <table id="supplierManagementTable" class="premium-table">
          <thead>
            <tr>
              <th class="premium-th">Supplier Name</th>
              <th class="premium-th">Email</th>
              <th class="premium-th">Contact Person</th>
              <th class="premium-th">Phone</th>
              <th class="premium-th">Product Types</th>
              <th class="premium-th">Lead Time</th>
              <th class="premium-th">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="premium-button-group">
        <button onclick="openAddSupplierModal()" class="premium-button">Add Supplier</button>
      </div>
    `;
    
    dashboardTab.appendChild(section);
    
    // Create modal for adding/editing suppliers
    createSupplierModal();
    
    // Load supplier list
    loadSupplierManagementTable();
  }
}

// Load supplier list
async function loadSupplierList() {
    try {
      const response = await fetch('/api/suppliers');
      const result = await response.json();
      return result.data || []; // Extract the data array from the response
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return [];
    }
  }

// Create supplier modal
function createSupplierModal() {
  // Check if modal already exists
  if (document.getElementById('supplierModal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'supplierModal';
  modal.className = 'premium-modal';
  
  modal.innerHTML = `
    <div class="premium-modal-content">
      <span class="premium-close-modal" onclick="closeSupplierModal()">×</span>
      <h2 class="premium-subheader" id="supplierModalTitle">Add New Supplier</h2>
      <form id="supplierModalForm">
        <input type="hidden" id="supplierId">
        <div class="premium-form-grid">
          <div class="premium-input-group">
            <label>Supplier Name:</label>
            <input type="text" id="supplierModalName" required class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Email:</label>
            <input type="email" id="supplierModalEmail" required class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Contact Person:</label>
            <input type="text" id="supplierModalContactPerson" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Phone:</label>
            <input type="tel" id="supplierModalPhone" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Product Types:</label>
            <input type="text" id="supplierModalProductTypes" placeholder="e.g. faux wood, vertical blinds" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Lead Time (days):</label>
            <input type="number" id="supplierModalLeadTime" min="0" value="5" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Default Terms:</label>
            <input type="text" id="supplierModalTerms" placeholder="e.g. Net 30" class="premium-input">
          </div>
          <div class="premium-input-group full-width">
            <label>Notes:</label>
            <textarea id="supplierModalNotes" class="premium-input"></textarea>
          </div>
        </div>
        <div class="premium-button-group">
          <button type="submit" class="premium-button premium-primary">Save Supplier</button>
          <button type="button" onclick="closeSupplierModal()" class="premium-button premium-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listener for form submission
  document.getElementById('supplierModalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveSupplierFromModal();
  });
}

// Save supplier
async function saveSupplierFromModal() {
  const supplierId = document.getElementById('supplierId').value;
  
  const supplier = {
    id: supplierId || null,
    name: document.getElementById('supplierModalName').value,
    email: document.getElementById('supplierModalEmail').value,
    contact_person: document.getElementById('supplierModalContactPerson').value,
    phone: document.getElementById('supplierModalPhone').value,
    product_types: document.getElementById('supplierModalProductTypes').value,
    lead_time: document.getElementById('supplierModalLeadTime').value,
    default_terms: document.getElementById('supplierModalTerms').value,
    notes: document.getElementById('supplierModalNotes').value
  };
  
  try {
    let url = '/api/suppliers';
    let method = 'POST';
    
    if (supplierId) {
      url = `/api/suppliers/${supplierId}`;
      method = 'PUT';
    }
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplier)
    });
    
    if (response.ok) {
      closeSupplierModal();
      loadSupplierManagementTable();
    } else {
      console.error('Error saving supplier:', await response.json());
      alert('Error saving supplier. Please try again.');
    }
  } catch (error) {
    console.error('Error saving supplier:', error);
    alert('Error saving supplier. Please try again.');
  }
}

// Load supplier management table
async function loadSupplierManagementTable() {
  const table = document.getElementById('supplierManagementTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  try {
    const suppliers = await loadSupplierList();
    
    if (suppliers.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="7" class="premium-td text-center">No suppliers found. Add a supplier to get started.</td>';
      tbody.appendChild(row);
      return;
    }
    
    suppliers.forEach(supplier => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="premium-td">${supplier.name || '-'}</td>
        <td class="premium-td">${supplier.email || '-'}</td>
        <td class="premium-td">${supplier.contact_person || '-'}</td>
        <td class="premium-td">${supplier.phone || '-'}</td>
        <td class="premium-td">${supplier.product_types || '-'}</td>
        <td class="premium-td">${supplier.lead_time || '-'} days</td>
        <td class="premium-td">
          <button onclick="openEditSupplierModal('${supplier.id}')" class="premium-button premium-small">Edit</button>
          <button onclick="deleteSupplier('${supplier.id}')" class="premium-button premium-small premium-cancel">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading supplier table:', error);
    tbody.innerHTML = '<tr><td colspan="7" class="premium-td text-center">Error loading suppliers. Please try again.</td></tr>';
  }
}

// Open modal for adding a new supplier
function openAddSupplierModal() {
  const modal = document.getElementById('supplierModal');
  const form = document.getElementById('supplierModalForm');
  
  // Clear form
  form.reset();
  document.getElementById('supplierId').value = '';
  document.getElementById('supplierModalTitle').textContent = 'Add New Supplier';
  
  // Show modal
  modal.style.display = 'block';
}

// Open modal for editing an existing supplier
async function openEditSupplierModal(supplierId) {
  try {
    const response = await fetch(`/api/suppliers/${supplierId}`);
    const supplier = await response.json();
    
    const modal = document.getElementById('supplierModal');
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    
    // Fill form with supplier data
    document.getElementById('supplierId').value = supplier.id;
    document.getElementById('supplierModalName').value = supplier.name || '';
    document.getElementById('supplierModalEmail').value = supplier.email || '';
    document.getElementById('supplierModalContactPerson').value = supplier.contact_person || '';
    document.getElementById('supplierModalPhone').value = supplier.phone || '';
    document.getElementById('supplierModalProductTypes').value = supplier.product_types || '';
    document.getElementById('supplierModalLeadTime').value = supplier.lead_time || 5;
    document.getElementById('supplierModalTerms').value = supplier.default_terms || '';
    document.getElementById('supplierModalNotes').value = supplier.notes || '';
    
    // Show modal
    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading supplier details:', error);
    alert('Error loading supplier details. Please try again.');
  }
}

// Close supplier modal
function closeSupplierModal() {
  const modal = document.getElementById('supplierModal');
  modal.style.display = 'none';
}

// Delete supplier
async function deleteSupplier(supplierId) {
  if (!confirm('Are you sure you want to delete this supplier?')) return;
  
  try {
    const response = await fetch(`/api/suppliers/${supplierId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadSupplierManagementTable();
    } else {
      console.error('Error deleting supplier:', await response.json());
      alert('Error deleting supplier. Please try again.');
    }
  } catch (error) {
    console.error('Error deleting supplier:', error);
    alert('Error deleting supplier. Please try again.');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize supplier management
  initializeSupplierManagement();
});

// Make functions globally available
window.openAddSupplierModal = openAddSupplierModal;
window.openEditSupplierModal = openEditSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplierFromModal = saveSupplierFromModal;
window.deleteSupplier = deleteSupplier;