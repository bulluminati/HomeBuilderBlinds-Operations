// clientManagement.js - Client profile management

// Storage key for client profiles
const CLIENT_PROFILES_KEY = 'CLIENT_PROFILES';

// Client profile structure
/*
{
  id: string,          // Unique identifier
  name: string,        // Client name
  email: string,       // Email address
  phone: string,       // Phone number
  type: string,        // 'residential' or 'commercial'
  serviceType: string, // 'installation' or 'delivery'
  measurementType: string, // 'window' or 'blind'
  propertyName: string, // Property or company name
  notes: string,       // Additional notes
  defaultDiscount: number, // Default discount percentage
}
*/

// Initialize client management
function initializeClientManagement() {
  // Add client management features to dashboard
  const dashboardTab = document.getElementById('home');
  if (dashboardTab) {
    addClientManagementToDashboard(dashboardTab);
  }
  
  // Initialize client list in client portal
  loadClientList();
  
  // Add event listeners
  document.getElementById('clientAccountForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    createClientAccount();
  });
}

// Add client management section to dashboard
function addClientManagementToDashboard(dashboardTab) {
  // Create client management section if it doesn't exist
  if (!document.getElementById('clientManagementSection')) {
    const section = document.createElement('div');
    section.id = 'clientManagementSection';
    section.className = 'business-section premium-metrics';
    section.innerHTML = `
      <h3 class="premium-subheader">Client Management</h3>
      <div class="premium-table-responsive">
        <table id="clientManagementTable" class="premium-table">
          <thead>
            <tr>
              <th class="premium-th">Client Name</th>
              <th class="premium-th">Email</th>
              <th class="premium-th">Phone</th>
              <th class="premium-th">Type</th>
              <th class="premium-th">Service</th>
              <th class="premium-th">Measurement</th>
              <th class="premium-th">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="premium-button-group">
        <button onclick="openAddClientModal()" class="premium-button">Add Client</button>
      </div>
    `;
    
    dashboardTab.appendChild(section);
    
    // Create modal for adding/editing clients
    createClientModal();
    
    // Load client list
    loadClientManagementTable();
  }
}

// Create modal for adding/editing clients
function createClientModal() {
  // Check if modal already exists
  if (document.getElementById('clientModal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'clientModal';
  modal.className = 'premium-modal';
  
  modal.innerHTML = `
    <div class="premium-modal-content">
      <span class="premium-close-modal" onclick="closeClientModal()">×</span>
      <h2 class="premium-subheader" id="clientModalTitle">Add New Client</h2>
      <form id="clientModalForm">
        <input type="hidden" id="clientId">
        <div class="premium-form-grid">
          <div class="premium-input-group">
            <label>Client Name:</label>
            <input type="text" id="clientModalName" required class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Email:</label>
            <input type="email" id="clientModalEmail" required class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Phone:</label>
            <input type="tel" id="clientModalPhone" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Property/Company Name:</label>
            <input type="text" id="clientModalProperty" class="premium-input">
          </div>
          <div class="premium-input-group">
            <label>Client Type:</label>
            <select id="clientModalType" class="premium-select">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div class="premium-input-group">
            <label>Default Service:</label>
            <select id="clientModalService" class="premium-select">
              <option value="installation">Installation</option>
              <option value="delivery">Delivery Only</option>
            </select>
          </div>
          <div class="premium-input-group">
            <label>Measurement Type:</label>
            <select id="clientModalMeasurement" class="premium-select">
              <option value="window">Window</option>
              <option value="blind">Blind</option>
            </select>
          </div>
          <div class="premium-input-group">
            <label>Default Discount (%):</label>
            <input type="number" id="clientModalDiscount" min="0" max="100" value="0" class="premium-input">
          </div>
          <div class="premium-input-group full-width">
            <label>Notes:</label>
            <textarea id="clientModalNotes" class="premium-input"></textarea>
          </div>
        </div>
        <div class="premium-button-group">
          <button type="submit" class="premium-button premium-primary">Save Client</button>
          <button type="button" onclick="closeClientModal()" class="premium-button premium-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listener for form submission
  document.getElementById('clientModalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveClientFromModal();
  });
  
  // Add event listener for client type change
  document.getElementById('clientModalType').addEventListener('change', function() {
    updateModalFieldsForClientType(this.value);
  });
}

// Update modal fields based on client type
function updateModalFieldsForClientType(clientType) {
  const serviceSelect = document.getElementById('clientModalService');
  const measurementSelect = document.getElementById('clientModalMeasurement');
  
  if (clientType === 'residential') {
    // Default settings for residential
    serviceSelect.value = 'installation';
    measurementSelect.value = 'window';
  } else if (clientType === 'commercial') {
    // Default settings for commercial
    serviceSelect.value = 'delivery';
    measurementSelect.value = 'blind';
  }
}

// Open modal for adding a new client
function openAddClientModal() {
  const modal = document.getElementById('clientModal');
  const form = document.getElementById('clientModalForm');
  
  // Clear form
  form.reset();
  document.getElementById('clientId').value = '';
  document.getElementById('clientModalTitle').textContent = 'Add New Client';
  
  // Set default values
  document.getElementById('clientModalType').value = 'residential';
  updateModalFieldsForClientType('residential');
  
  // Show modal
  modal.style.display = 'block';
}

// Open modal for editing an existing client
async function openEditClientModal(clientId) {
  let clients;
  try {
    clients = await getClientProfiles();
  } catch (error) {
    console.error('Error loading client profiles:', error);
    clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
  
  const client = clients.find(c => c.id === clientId);
  
  if (!client) return;
  
  const modal = document.getElementById('clientModal');
  document.getElementById('clientModalTitle').textContent = 'Edit Client';
  
  // Fill form with client data
  document.getElementById('clientId').value = client.id;
  document.getElementById('clientModalName').value = client.name || '';
  document.getElementById('clientModalEmail').value = client.email || '';
  document.getElementById('clientModalPhone').value = client.phone || '';
  document.getElementById('clientModalProperty').value = client.propertyName || '';
  document.getElementById('clientModalType').value = client.type || 'residential';
  document.getElementById('clientModalService').value = client.serviceType || 'installation';
  document.getElementById('clientModalMeasurement').value = client.measurementType || 'window';
  document.getElementById('clientModalDiscount').value = client.defaultDiscount || 0;
  document.getElementById('clientModalNotes').value = client.notes || '';
  
  // Show modal
  modal.style.display = 'block';
}

// Close client modal
function closeClientModal() {
  const modal = document.getElementById('clientModal');
  modal.style.display = 'none';
}

// Save client from modal form
async function saveClientFromModal() {
  const clientId = document.getElementById('clientId').value;
  const isNewClient = !clientId;
  
  const client = {
    id: isNewClient ? 'client_' + Date.now() : clientId,
    name: document.getElementById('clientModalName').value,
    email: document.getElementById('clientModalEmail').value,
    phone: document.getElementById('clientModalPhone').value,
    propertyName: document.getElementById('clientModalProperty').value,
    type: document.getElementById('clientModalType').value,
    serviceType: document.getElementById('clientModalService').value,
    measurementType: document.getElementById('clientModalMeasurement').value,
    defaultDiscount: parseFloat(document.getElementById('clientModalDiscount').value) || 0,
    notes: document.getElementById('clientModalNotes').value
  };
  
  // Save client
  await saveClientProfile(client);
  
  // Close modal
  closeClientModal();
  
  // Update tables
  loadClientManagementTable();
  loadClientList();
}

// Save client profile using the API
async function saveClientProfile(client) {
  try {
    // For existing clients (with ID)
    if (client.id && !client.id.startsWith('client_')) {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      return await response.json();
    } 
    // For new clients
    else {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      return await response.json();
    }
  } catch (error) {
    console.error('Error saving client:', error);
    // Fallback to localStorage if API fails
    const clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
    const existingIndex = clients.findIndex(c => c.id === client.id);
    if (existingIndex >= 0) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }
    StorageUtil.save(CLIENT_PROFILES_KEY, clients);
    return client;
  }
}

// Get all client profiles
async function getClientProfiles() {
  try {
    const response = await fetch('/api/clients');
    const clients = await response.json();
    // Also save to localStorage as backup
    StorageUtil.save(CLIENT_PROFILES_KEY, clients);
    return clients;
  } catch (error) {
    console.error('Error loading clients from API:', error);
    // Fallback to localStorage
    return StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
}

// Delete client profile
async function deleteClientProfile(clientId) {
  if (!confirm('Are you sure you want to delete this client?')) return;
  
  try {
    await fetch(`/api/clients/${clientId}`, {
      method: 'DELETE'
    });
    
    // Update tables
    loadClientManagementTable();
    loadClientList();
  } catch (error) {
    console.error('Error deleting client:', error);
    // Fallback to localStorage
    let clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
    clients = clients.filter(client => client.id !== clientId);
    StorageUtil.save(CLIENT_PROFILES_KEY, clients);
    
    // Update tables
    loadClientManagementTable();
    loadClientList();
  }
}

// Load client management table
async function loadClientManagementTable() {
  const table = document.getElementById('clientManagementTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  let clients;
  try {
    clients = await getClientProfiles();
  } catch (error) {
    console.error('Error loading client profiles:', error);
    clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
  
  if (clients.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" class="premium-td text-center">No clients found. Add a client to get started.</td>';
    tbody.appendChild(row);
    return;
  }
  
  clients.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="premium-td">${client.name || '-'}</td>
      <td class="premium-td">${client.email || '-'}</td>
      <td class="premium-td">${client.phone || '-'}</td>
      <td class="premium-td">${client.type === 'commercial' ? 'Commercial' : 'Residential'}</td>
      <td class="premium-td">${client.serviceType === 'delivery' ? 'Delivery Only' : 'Installation'}</td>
      <td class="premium-td">${client.measurementType === 'blind' ? 'Blind' : 'Window'}</td>
      <td class="premium-td">
        <button onclick="openEditClientModal('${client.id}')" class="premium-button premium-small">Edit</button>
        <button onclick="deleteClientProfile('${client.id}')" class="premium-button premium-small premium-cancel">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Load client list in client portal
async function loadClientList() {
  const clientList = document.getElementById('clientAccountList');
  if (!clientList) return;
  
  clientList.innerHTML = '';
  
  let clients;
  try {
    clients = await getClientProfiles();
  } catch (error) {
    console.error('Error loading client profiles:', error);
    clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
  
  if (clients.length === 0) {
    clientList.innerHTML = '<p>No clients found. Add a client to get started.</p>';
    return;
  }
  
  const list = document.createElement('div');
  list.className = 'premium-account-list';
  
  clients.forEach(client => {
    const item = document.createElement('div');
    item.className = 'premium-account-item';
    item.innerHTML = `
      <div class="premium-account-info">
        <h4>${client.name}</h4>
        <p>${client.email} | ${client.phone || 'No phone'}</p>
        <p>${client.type === 'commercial' ? 'Commercial' : 'Residential'} | 
           ${client.serviceType === 'delivery' ? 'Delivery Only' : 'Installation'} | 
           ${client.measurementType === 'blind' ? 'Blind Measurements' : 'Window Measurements'}</p>
      </div>
      <div class="premium-account-actions">
        <button onclick="openEditClientModal('${client.id}')" class="premium-button premium-small">Edit</button>
        <button onclick="deleteClientProfile('${client.id}')" class="premium-button premium-small premium-cancel">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
  
  clientList.appendChild(list);
}

// Fill work order form with client data
async function fillWorkOrderFormWithClient(clientId) {
  let clients;
  try {
    clients = await getClientProfiles();
  } catch (error) {
    console.error('Error loading client profiles:', error);
    clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
  
  const client = clients.find(c => c.id === clientId);
  
  if (!client) return;
  
  // Set form values
  document.getElementById('clientName').value = client.name || '';
  document.getElementById('propertyName').value = client.propertyName || '';
  document.getElementById('clientPhone').value = client.phone || '';
  document.getElementById('clientEmail').value = client.email || '';
  
  // Set client type
  const clientTypeSelect = document.getElementById('clientType');
  if (clientTypeSelect) {
    clientTypeSelect.value = client.type || 'residential';
  }
  
  // Set service type
  const serviceTypeSelect = document.getElementById('serviceType');
  if (serviceTypeSelect) {
    serviceTypeSelect.value = client.serviceType || 'installation';
  }
  
  // Set measurement type
  const measurementTypeSelect = document.getElementById('measurementType');
  if (measurementTypeSelect) {
    measurementTypeSelect.value = client.measurementType || 'window';
  }
  
  // Set discount
  const discountInput = document.getElementById('discountPercent');
  if (discountInput && client.defaultDiscount) {
    discountInput.value = client.defaultDiscount;
  }
  
  // Refresh totals
  if (typeof updateTotals === 'function') {
    updateTotals();
  }
}

// Add client select to work order form
async function addClientSelectToWorkOrderForm() {
  const workOrderForm = document.getElementById('workOrderForm');
  if (!workOrderForm) return;
  
  // Create client select container
  const container = document.createElement('div');
  container.className = 'premium-select-client-container';
  container.style.marginBottom = '20px';
  
  // Get client profiles
  let clients;
  try {
    clients = await getClientProfiles();
  } catch (error) {
    console.error('Error loading client profiles:', error);
    clients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
  }
  
  // Create client select
  const selectHTML = `
    <label for="clientSelect">Select Client:</label>
    <select id="clientSelect" class="premium-select">
      <option value="">-- Select Client --</option>
      ${clients.map(client => 
        `<option value="${client.id}">${client.name} (${client.type === 'commercial' ? 'Commercial' : 'Residential'})</option>`
      ).join('')}
    </select>
  `;
  
  container.innerHTML = selectHTML;
  
  // Insert before the first form element
  const firstElement = workOrderForm.querySelector('.premium-form-grid');
  workOrderForm.insertBefore(container, firstElement);
  
  // Add event listener
  document.getElementById('clientSelect').addEventListener('change', function() {
    if (this.value) {
      fillWorkOrderFormWithClient(this.value);
    }
  });
}

// Create client account (from client portal)
async function createClientAccount() {
  const name = document.getElementById('clientAccountName').value;
  const email = document.getElementById('clientAccountEmail').value;
  const phone = document.getElementById('clientAccountPhone').value;
  
  if (!name || !email) {
    alert('Client name and email are required.');
    return;
  }
  
  const client = {
    id: 'client_' + Date.now(),
    name: name,
    email: email,
    phone: phone,
    type: 'residential', // Default
    serviceType: 'installation', // Default
    measurementType: 'window', // Default
    defaultDiscount: 0,
    notes: ''
  };
  
  // Save client
  try {
    await saveClientProfile(client);
    
    // Clear form
    document.getElementById('clientAccountForm').reset();
    
    // Update client lists
    loadClientList();
    loadClientManagementTable();
    
    // Show confirmation
    alert('Client account created successfully.');
  } catch (error) {
    console.error('Error creating client account:', error);
    alert('Error creating client account. Please try again.');
  }
}

// Sync clients from local storage to database when online
async function syncClientsToDatabase() {
  try {
    // First try to load from API
    const response = await fetch('/api/clients');
    if (!response.ok) throw new Error('API unreachable');
    
    const apiClients = await response.json();
    const localClients = StorageUtil.load(CLIENT_PROFILES_KEY) || [];
    
    // If we have clients in localStorage that don't exist in API, push them
    if (localClients.length > 0) {
      for (const localClient of localClients) {
        // Check if this client exists in API by matching email
        const existsInApi = apiClients.some(c => 
          c.email && localClient.email && 
          c.email.toLowerCase() === localClient.email.toLowerCase()
        );
        
        if (!existsInApi) {
          console.log('Syncing local client to database:', localClient.name);
          await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localClient)
          });
        }
      }
    }
    
    // Update localStorage with API data
    StorageUtil.save(CLIENT_PROFILES_KEY, apiClients);
    console.log('Client data synchronized with database');
    
  } catch (error) {
    console.warn('Failed to sync clients with database, using localStorage:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Try to sync clients with the database
  syncClientsToDatabase().then(() => {
    // Initialize client management after sync
    initializeClientManagement();
    
    // Refresh client lists after sync
    loadClientManagementTable();
    loadClientList();
    
    // Add client select to work order form after sync
    setTimeout(() => {
      addClientSelectToWorkOrderForm();
    }, 500);
  });
});

// Make functions globally available
window.openAddClientModal = openAddClientModal;
window.openEditClientModal = openEditClientModal;
window.closeClientModal = closeClientModal;
window.saveClientFromModal = saveClientFromModal;
window.deleteClientProfile = deleteClientProfile;
window.createClientAccount = createClientAccount;
window.getClientProfileByEmail = getClientProfileByEmail;
window.fillWorkOrderFormWithClient = fillWorkOrderFormWithClient;