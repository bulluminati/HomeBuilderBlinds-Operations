const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Correct path to the homebuilder_ops.db in the Operations folder
const dbPath = path.join(__dirname, '../../HomeBuilderBlinds-Agent-Operations/data/homebuilder_ops.db');
console.log('=== Blind Orders Router Initialized ===');
console.log('Database path:', dbPath);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
} else {
  console.log('✅ Database file exists at:', dbPath);
}

// Create a new database connection for each request
const getDb = () => {
  console.log('Creating new database connection...');
  return new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Failed to connect to blind orders DB:", err.message);
    } else {
      console.log("✅ Connected to homebuilder_ops.db for blind orders");
    }
  });
};

// Return all blind orders (with optional filtering)
router.get('/', (req, res) => {
  console.log('=== GET /api/blindorders ===');
  console.log('Query params:', req.query);
  
  const db = getDb();
  
  // Optional filtering by client name
  const clientFilter = req.query.client;
  let query = 'SELECT * FROM blind_orders';
  let params = [];
  
  if (clientFilter) {
    query += ' WHERE LOWER(from_address) LIKE ?';
    params.push(`%${clientFilter.toLowerCase()}%`);
    console.log('Filtering by client:', clientFilter);
  }
  
  query += ' ORDER BY created_at DESC';
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Error fetching blind orders:', err);
      console.error('Error details:', err.message);
      db.close();
      res.status(500).json({
        error: err.message,
        message: 'Failed to fetch blind orders'
      });
      return;
    }
    
    console.log(`✅ Found ${rows.length} blind orders`);
    if (rows.length > 0) {
      console.log('First order sample:', JSON.stringify(rows[0], null, 2));
      console.log('Order IDs:', rows.map(r => r.id).join(', '));
    }
    
    db.close(() => {
      console.log('Database connection closed');
    });
    
    res.json(rows);
  });
});

// Get blind orders for a specific client
router.get('/client/:clientName', (req, res) => {
  const clientName = req.params.clientName;
  console.log(`=== GET /api/blindorders/client/${clientName} ===`);
  
  const db = getDb();
  
  const query = `SELECT * FROM blind_orders WHERE LOWER(from_address) LIKE ? OR LOWER(client_name) LIKE ?`;
  const params = [`%${clientName.toLowerCase()}%`, `%${clientName.toLowerCase()}%`];
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Error fetching client blind orders:', err);
      db.close();
      res.status(500).json({
        error: err.message,
        message: 'Failed to fetch client orders'
      });
      return;
    }
    
    console.log(`✅ Found ${rows.length} orders for client: ${clientName}`);
    
    db.close(() => {
      console.log('Database connection closed');
    });
    
    res.json(rows);
  });
});

// Get blind orders by ID
router.get('/:id', (req, res) => {
  const orderId = req.params.id;
  console.log(`=== GET /api/blindorders/${orderId} ===`);
  
  const db = getDb();
  
  const query = `SELECT * FROM blind_orders WHERE id = ?`;
  const params = [orderId];
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  db.get(query, params, (err, row) => {
    if (err) {
      console.error('❌ Error fetching blind order:', err);
      db.close();
      res.status(500).json({
        error: err.message,
        message: 'Failed to fetch blind order'
      });
      return;
    }
    
    if (!row) {
      console.log(`⚠️ No blind order found with ID: ${orderId}`);
      db.close();
      res.status(404).json({
        message: 'Blind order not found'
      });
      return;
    }
    
    console.log(`✅ Found order with ID: ${orderId}`);
    console.log('Order details:', JSON.stringify(row, null, 2));
    
    db.close(() => {
      console.log('Database connection closed');
    });
    
    res.json(row);
  });
});

// Get stats for blind orders
router.get('/stats/summary', (req, res) => {
  console.log('=== GET /api/blindorders/stats/summary ===');
  
  const db = getDb();
  
  const query = `SELECT 
    COUNT(*) as total_orders,
    COUNT(DISTINCT client_name) as unique_clients,
    SUM(quantity) as total_quantity
  FROM blind_orders`;
  
  console.log('Executing query:', query);
  
  db.get(query, [], (err, row) => {
    if (err) {
      console.error('❌ Error fetching blind order stats:', err);
      db.close();
      res.status(500).json({
        error: err.message,
        message: 'Failed to fetch stats'
      });
      return;
    }
    
    console.log('✅ Stats fetched successfully:');
    console.log('Total orders:', row.total_orders);
    console.log('Unique clients:', row.unique_clients);
    console.log('Total quantity:', row.total_quantity);
    
    db.close(() => {
      console.log('Database connection closed');
    });
    
    res.json(row);
  });
});

console.log('=== Blind Orders Router Configured ===');

module.exports = router;