// clientPortal.js
function createClientAccount() {
    const name = document.getElementById('clientAccountName').value;
    const email = document.getElementById('clientAccountEmail').value;
    const phone = document.getElementById('clientAccountPhone').value;
    const client = { id: Date.now(), name, email, phone, orders: [] };
    clientAccounts.push(client);
    updateClientAccountList();
    alert('Client account created successfully!');
}

function updateClientAccountList() {
    const clientAccountList = document.getElementById('clientAccountList');
    clientAccountList.innerHTML = '';
    clientAccounts.forEach(client => {
        const clientDiv = document.createElement('div');
        clientDiv.innerHTML = `
            <h4>${client.name}</h4>
            <p>Email: ${client.email}</p>
            <p>Phone: ${client.phone}</p>
            <button onclick="viewClientOrders(${client.id})">View Orders</button>
        `;
        clientAccountList.appendChild(clientDiv);
    });
}

function viewClientOrders(clientId) {
    const client = clientAccounts.find(c => c.id === clientId);
    if (client) alert(`Orders for ${client.name}: ${client.orders.length}`);
}

function checkAvailability() {
    const clientWidth = parseFloat(document.getElementById('clientWidth').value);
    const clientLength = parseFloat(document.getElementById('clientLength').value);
    const clientQuantity = parseInt(document.getElementById('clientQuantity').value, 10);
    const availabilityResult = document.getElementById('availabilityResult');
    if (isNaN(clientWidth) || isNaN(clientLength) || isNaN(clientQuantity)) {
        availabilityResult.innerHTML = '<p style="color: red;">Please enter valid dimensions and quantity.</p>';
        return;
    }
    const match = findStockSize(clientWidth, clientLength); // From inventory.js
    if (match) {
        availabilityResult.innerHTML = `
            <p style="color: green;">Available: ${clientQuantity} units at ${formatCurrency(match.price)} each.</p>
            <p>Stock size to be used: ${match.stockSize}</p>
        `;
    } else {
        availabilityResult.innerHTML = '<p style="color: red;">No matching size available.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Client Portal tab loaded');
});
