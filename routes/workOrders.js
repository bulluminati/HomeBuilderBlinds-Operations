const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const workOrdersPath = path.join(__dirname, '../data/workOrders.json');
let workOrders = [];

// Load work orders from JSON file if it exists
function loadWorkOrders() {
    if (fs.existsSync(workOrdersPath)) {
        const savedWorkOrders = fs.readFileSync(workOrdersPath);
        workOrders = JSON.parse(savedWorkOrders);
    }
}
loadWorkOrders();

// Save work orders to JSON file
function saveWorkOrders() {
    fs.writeFileSync(workOrdersPath, JSON.stringify(workOrders, null, 2));
}

// Endpoint to create a new work order
router.post('/', (req, res) => {
    const { lineItems, dateCreated } = req.body;

    if (!lineItems || lineItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Work order must contain at least one line item.' });
    }

    const newWorkOrder = {
        id: Date.now().toString(),
        lineItems,
        dateCreated
    };

    workOrders.push(newWorkOrder);
    saveWorkOrders();

    res.json({ success: true, workOrder: newWorkOrder });
});

// Endpoint to retrieve all work orders
router.get('/', (req, res) => {
    res.json({ success: true, workOrders });
});

module.exports = router;

