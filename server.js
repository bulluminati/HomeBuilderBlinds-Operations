const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// Import the blind orders router
const blindOrdersRouter = require('./routes/blindOrders');

// Database paths
const measurementsDbPath = path.join(__dirname, 'data', 'shallowgrave.db');
const blindOrdersDbPath = '/home/michael-gumfory/Desktop/HomeBuilderBlinds-Agent-Operations/data/homebuilder_ops.db';

// Log the database paths to verify
console.log("Measurements database path:", measurementsDbPath);
console.log("Measurements database exists:", fs.existsSync(measurementsDbPath));
console.log("Blind orders database path:", blindOrdersDbPath);
console.log("Blind orders database exists:", fs.existsSync(blindOrdersDbPath));

// Add this to your server.js initialization code

const initSuppliersTable = () => {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to suppliers database:', err.message);
      return;
    }
    console.log('Connected to the blinds orders SQLite database for suppliers initialization');
    
    // First check if the table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers'", (err, row) => {
      if (err) {
        console.error('Error checking if suppliers table exists:', err.message);
        db.close();
        return;
      }
      
      if (row) {
        // Table exists, check if it has all required columns
        db.all("PRAGMA table_info(suppliers)", (err, columns) => {
          if (err) {
            console.error('Error getting suppliers table columns:', err.message);
            db.close();
            return;
          }
          
          // Convert columns to column names for easier checking
          const columnNames = columns.map(col => col.name);
          console.log('Existing suppliers table columns:', columnNames.join(', '));
          
          // Define required columns
          const requiredColumns = [
            'id', 'name', 'email', 'contact_person', 'phone', 
            'product_types', 'lead_time', 'default_terms', 'notes', 
            'created_at', 'updated_at'
          ];
          
          // Find missing columns
          const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
          
          if (missingColumns.length > 0) {
            console.log('Missing columns in suppliers table:', missingColumns.join(', '));
            
            // Add each missing column
            let pendingAlters = missingColumns.length;
            
            missingColumns.forEach(column => {
              let dataType = 'TEXT';
              if (column === 'id') dataType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
              if (column === 'lead_time') dataType = 'INTEGER';
              if (column === 'created_at' || column === 'updated_at') {
                dataType = 'TEXT DEFAULT CURRENT_TIMESTAMP';
              }
              
              db.run(`ALTER TABLE suppliers ADD COLUMN ${column} ${dataType}`, (err) => {
                pendingAlters--;
                
                if (err) {
                  console.error(`Error adding ${column} column:`, err.message);
                } else {
                  console.log(`Added ${column} column to suppliers table`);
                }
                
                // Close db when all operations complete
                if (pendingAlters === 0) {
                  console.log('Suppliers table updated with all required columns');
                  db.close();
                }
              });
            });
          } else {
            console.log('Suppliers table has all required columns');
            db.close();
          }
        });
      } else {
        // Table doesn't exist, create it
        console.log('Suppliers table does not exist, creating it...');
        
        db.run(`CREATE TABLE suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE,
          contact_person TEXT,
          phone TEXT,
          product_types TEXT,
          lead_time INTEGER,
          default_terms TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('Error creating suppliers table:', err.message);
          } else {
            console.log('Suppliers table created successfully');
          }
          db.close();
        });
      }
    });
  });
};
// Call this function in your initialization code
try {
  initSuppliersTable();
} catch (err) {
  console.error('Failed to initialize suppliers table:', err.message);
}

// Initialize the database and create the tables if they don't exist
const initDatabase = () => {
  const db = new sqlite3.Database(measurementsDbPath, (err) => {
    if (err) {
      console.error('Error connecting to measurements database:', err.message);
      return;
    }
    console.log('Connected to the measurements SQLite database at:', measurementsDbPath);
    
    // Create blinds_measurements table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS blinds_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_address TEXT,
      customer_phone TEXT,
      customer_city TEXT,
      customer_state TEXT,
      customer_zip TEXT,
      measurement_date TEXT,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating measurements table:', err.message);
      } else {
        console.log('Blinds measurements table ready');
      }
    });
  });
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
  });
};

// Try to initialize database, but continue even if it fails
try {
  initDatabase();
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  console.log('Continuing with limited functionality (localStorage only)');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Add the blind orders API route
app.use('/api/blindorders', blindOrdersRouter);

// Finalized Orders Endpoints
app.post('/api/finalized-orders', (req, res) => {
  const order = req.body;
  
  // Validate required fields
  if (!order.clientName) {
      return res.status(400).json({
          success: false,
          message: 'Client name is required'
      });
  }
  
  // Connect to database
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
      if (err) {
          return res.status(500).json({
              success: false,
              message: 'Database connection error',
              error: err.message
          });
      }
      
      // Serialize order items to JSON string
      const orderData = JSON.stringify(order.items);
      
      // Calculate total amount if needed
      const totalAmount = order.items.reduce((sum, item) => {
          return sum + (parseFloat(item.unitPrice) * parseFloat(item.quantity));
      }, 0);
      
      // Insert into finalized_orders table
      db.run(`
          INSERT INTO finalized_orders (
              id, client_name, client_phone, client_email, property_name,
              client_type, service_type, date_created, order_data,
              status, total_amount, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
          order.id,
          order.clientName,
          order.clientPhone,
          order.clientEmail,
          order.propertyName,
          order.clientType,
          order.serviceType,
          order.dateCreated,
          orderData,
          order.status,
          totalAmount
      ], function(err) {
          db.close();
          
          if (err) {
              console.error('Failed to save finalized order:', err);
              return res.status(500).json({
                  success: false,
                  message: 'Failed to save order',
                  error: err.message
              });
          }
          
          res.status(201).json({
              success: true,
              message: 'Order saved successfully',
              id: order.id
          });
      });
  });
});

// Add endpoint to move order to delivery schedule
app.post('/api/delivery-schedule', (req, res) => {
  const { orderId, scheduledDate, scheduledTime, notes } = req.body;
  
  // Find the order in finalized_orders and move it to delivery_schedule
  // [implementation details]
});

// Get finalized orders
app.get('/api/finalized-orders', (req, res) => {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    db.all('SELECT * FROM finalized_orders ORDER BY date_created DESC', [], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
      // Parse order_data JSON
      rows.forEach(row => { row.items = JSON.parse(row.order_data || '[]'); });
      res.status(200).json({ success: true, data: rows });
    });
  });
});

// Get delivery schedule
app.get('/api/delivery-schedule', (req, res) => {
  // [implementation to retrieve delivery schedule]
});

// Add these inventory API endpoints to your server.js file

// Initialize the inventory table if needed
function initInventoryTable() {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database for inventory table initialization:', err.message);
      return;
    }
    
    console.log('Connected to SQLite database for inventory table initialization');
    
    // Check if the table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
      if (err) {
        console.error('Error checking if inventory table exists:', err.message);
        db.close();
        return;
      }
      
      if (!row) {
        // Create the inventory table if it doesn't exist
        db.run(`CREATE TABLE inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_number TEXT,
          size TEXT,
          sqft REAL,
          price_per_sqft REAL,
          total_price REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('Error creating inventory table:', err.message);
          } else {
            console.log('Inventory table created successfully');
          }
          db.close();
        });
      } else {
        console.log('Inventory table already exists');
        db.close();
      }
    });
  });
}

// Call this during server initialization
initInventoryTable();

// GET all inventory items
app.get('/api/inventory', (req, res) => {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: err.message
      });
    }
    
    db.all('SELECT * FROM inventory ORDER BY item_number', [], (err, rows) => {
      db.close();
      
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error fetching inventory',
          error: err.message
        });
      }
      
      // Map database field names to client-side field names for compatibility
      const inventory = rows.map(row => ({
        itemNumber: row.item_number || '',
        size: row.size || '',
        sqft: row.sqft || 0,
        pricePerSqft: row.price_per_sqft || 0,
        totalPrice: row.total_price || 0
      }));
      
      res.status(200).json({
        success: true,
        data: inventory
      });
    });
  });
});

// POST bulk inventory update (replaces all inventory)
app.post('/api/inventory/bulk', (req, res) => {
  const inventoryItems = req.body.items;
  
  if (!Array.isArray(inventoryItems)) {
    return res.status(400).json({
      success: false,
      message: 'Expected an array of inventory items'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      return res.status(500).json({
        success: false, 
        message: 'Database connection error',
        error: err.message
      });
    }
    
    // Begin transaction for faster bulk insert
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        db.close();
        return res.status(500).json({
          success: false,
          message: 'Error starting transaction',
          error: err.message
        });
      }
      
      // Delete all existing inventory
      db.run('DELETE FROM inventory', (err) => {
        if (err) {
          // Roll back transaction if delete fails
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({
            success: false,
            message: 'Error clearing existing inventory',
            error: err.message
          });
        }
        
        // Prepare statement for bulk insert
        const stmt = db.prepare(`
          INSERT INTO inventory 
          (item_number, size, sqft, price_per_sqft, total_price)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        // Insert each inventory item
        let hasError = false;
        inventoryItems.forEach(item => {
          try {
            stmt.run(
              item.itemNumber || '',
              item.size || '',
              item.sqft || 0,
              item.pricePerSqft || 0,
              item.totalPrice || 0
            );
          } catch (insertErr) {
            console.error('Error inserting inventory item:', insertErr);
            hasError = true;
          }
        });
        
        // Finalize the statement
        stmt.finalize();
        
        if (hasError) {
          // Roll back if there were any errors
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({
            success: false,
            message: 'Error inserting inventory items'
          });
        }
        
        // Commit the transaction
        db.run('COMMIT', (err) => {
          db.close();
          
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Error committing transaction',
              error: err.message
            });
          }
          
          res.status(200).json({
            success: true,
            message: `Successfully updated inventory with ${inventoryItems.length} items`
          });
        });
      });
    });
  });
});

// POST a single inventory item
app.post('/api/inventory', (req, res) => {
  const item = req.body;
  
  // Validate required fields
  if (!item.size) {
    return res.status(400).json({
      success: false,
      message: 'Size is required for inventory items'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: err.message
      });
    }
    
    db.run(`
      INSERT INTO inventory 
      (item_number, size, sqft, price_per_sqft, total_price)
      VALUES (?, ?, ?, ?, ?)
    `, [
      item.itemNumber || '',
      item.size || '',
      item.sqft || 0,
      item.pricePerSqft || 0,
      item.totalPrice || 0
    ], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error adding inventory item',
          error: err.message
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Inventory item added successfully',
        id: this.lastID
      });
    });
  });
});

// DELETE all inventory
app.delete('/api/inventory', (req, res) => {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: err.message
      });
    }
    
    db.run('DELETE FROM inventory', function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error clearing inventory',
          error: err.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'All inventory items deleted successfully',
        count: this.changes
      });
    });
  });
});

// Add these endpoints to your server.js file

// POST new will call order
app.post('/api/will-call-orders', (req, res) => {
  const order = req.body;
  
  // Validate required fields
  if (!order.client_name || !order.lead_time) {
      return res.status(400).json({
          success: false,
          message: 'Client name and lead time are required'
      });
  }
  
  // Validate lead time (must be 2 or 5)
  if (order.lead_time !== 2 && order.lead_time !== 5) {
      return res.status(400).json({
          success: false,
          message: 'Lead time must be either 2 or 5 days'
      });
  }
  
  // Connect to database
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
      if (err) {
          return res.status(500).json({
              success: false,
              message: 'Database connection error',
              error: err.message
          });
      }
      
      // Check if table exists, create it if not
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='will_call_orders'", (err, row) => {
          if (err) {
              db.close();
              return res.status(500).json({
                  success: false,
                  message: 'Error checking table existence',
                  error: err.message
              });
          }
          
          if (!row) {
              // Create table if it doesn't exist
              db.run(`CREATE TABLE will_call_orders (
                  id TEXT PRIMARY KEY,
                  order_id TEXT,
                  client_name TEXT,
                  client_phone TEXT,
                  client_email TEXT,
                  property_name TEXT,
                  client_type TEXT,
                  lead_time INTEGER CHECK (lead_time IN (2, 5)),
                  order_date TEXT,
                  expected_date TEXT,
                  order_data TEXT,
                  status TEXT DEFAULT 'pending',
                  notes TEXT,
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP
              )`, (err) => {
                  if (err) {
                      db.close();
                      return res.status(500).json({
                          success: false,
                          message: 'Error creating will_call_orders table',
                          error: err.message
                      });
                  }
                  
                  // Table created, now insert the order
                  insertWillCallOrder();
              });
          } else {
              // Table exists, proceed with insertion
              insertWillCallOrder();
          }
      });
      
      // Function to insert the will call order
      function insertWillCallOrder() {
          db.run(`
              INSERT INTO will_call_orders (
                  id, order_id, client_name, client_phone, client_email, 
                  property_name, client_type, lead_time, order_date, 
                  expected_date, order_data, status, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
              order.id,
              order.order_id,
              order.client_name,
              order.client_phone || '',
              order.client_email || '',
              order.property_name || '',
              order.client_type || 'residential',
              order.lead_time,
              order.order_date,
              order.expected_date,
              order.order_data,
              order.status || 'pending',
              order.notes || ''
          ], function(err) {
              db.close();
              
              if (err) {
                  return res.status(500).json({
                      success: false,
                      message: 'Failed to save will call order',
                      error: err.message
                  });
              }
              
              res.status(201).json({
                  success: true,
                  message: 'Will call order saved successfully',
                  id: order.id
              });
          });
      }
  });
});

// GET will call orders
app.get('/api/will-call-orders', (req, res) => {
  // Connect to database
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
      if (err) {
          return res.status(500).json({
              success: false,
              message: 'Database connection error',
              error: err.message
          });
      }
      
      // Query the will call orders
      const status = req.query.status;
      let query = `SELECT * FROM will_call_orders`;
      
      if (status) {
          query += ` WHERE status = ?`;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const params = status ? [status] : [];
      
      db.all(query, params, (err, rows) => {
          db.close();
          
          if (err) {
              return res.status(500).json({
                  success: false,
                  message: 'Error fetching will call orders',
                  error: err.message
              });
          }
          
          // Parse order data for each order
          const orders = rows.map(row => {
              try {
                  const parsedData = JSON.parse(row.order_data);
                  return {
                      ...row,
                      items: parsedData
                  };
              } catch (e) {
                  console.error(`Error parsing order data for ID ${row.id}:`, e);
                  return {
                      ...row,
                      items: [],
                      error: 'Error parsing order data'
                  };
              }
          });
          
          res.status(200).json({
              success: true,
              data: orders
          });
      });
  });
});

// Update will call order status
app.put('/api/will-call-orders/:id', (req, res) => {
  const orderId = req.params.id;
  const { status, notes } = req.body;
  
  // Connect to database
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
      if (err) {
          return res.status(500).json({
              success: false,
              message: 'Database connection error',
              error: err.message
          });
      }
      
      // Update the order status
      db.run(
          'UPDATE will_call_orders SET status = ?, notes = ? WHERE id = ?',
          [status, notes || '', orderId],
          function(err) {
              db.close();
              
              if (err) {
                  return res.status(500).json({
                      success: false,
                      message: 'Error updating will call order',
                      error: err.message
                  });
              }
              
              if (this.changes === 0) {
                  return res.status(404).json({
                      success: false,
                      message: 'Will call order not found'
                  });
              }
              
              res.status(200).json({
                  success: true,
                  message: 'Will call order updated successfully'
              });
          }
      );
  });
});

// API endpoint to save measurement data
app.post('/api/measurements', (req, res) => {
  try {
    const measurementData = req.body;
    const customerInfo = measurementData.customerInfo || {};
    
    // Validate required fields
    if (!customerInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }
    
    // Check if database is accessible
    if (!fs.existsSync(measurementsDbPath)) {
      return res.status(503).json({
        success: false,
        message: 'Database not accessible',
        error: 'Database file not found'
      });
    }
    
    // JSON stringify the entire data object for storage
    const dataJSON = JSON.stringify(measurementData);
    
    // Connect to database
    const db = new sqlite3.Database(measurementsDbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Error connecting to database',
          error: err.message
        });
      }
      
      // Check if a measurement for this customer already exists
      db.get(
        'SELECT id FROM blinds_measurements WHERE customer_name = ? AND customer_address = ?',
        [customerInfo.name, customerInfo.address || ''],
        (err, row) => {
          if (err) {
            console.error('Error checking for existing measurement:', err);
            db.close();
            return res.status(500).json({ 
              success: false, 
              message: 'Error checking for existing measurement',
              error: err.message
            });
          }
          
          if (row) {
            // Update existing measurement
            db.run(
              `UPDATE blinds_measurements 
               SET customer_phone = ?, customer_city = ?, customer_state = ?, 
                   customer_zip = ?, measurement_date = ?, data = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [
                customerInfo.phone || '',
                customerInfo.city || '',
                customerInfo.state || '',
                customerInfo.zip || '',
                customerInfo.date || '',
                dataJSON,
                row.id
              ],
              function(err) {
                db.close();
                
                if (err) {
                  console.error('Error updating measurement:', err);
                  return res.status(500).json({ 
                    success: false, 
                    message: 'Error updating measurement data',
                    error: err.message
                  });
                }
                
                console.log(`Updated measurement for ${customerInfo.name}`);
                
                res.status(200).json({
                  success: true,
                  message: 'Measurement data updated successfully',
                  id: row.id
                });
              }
            );
          } else {
            // Insert new measurement
            db.run(
              `INSERT INTO blinds_measurements (
                customer_name, customer_address, customer_phone, 
                customer_city, customer_state, customer_zip,
                measurement_date, data
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                customerInfo.name,
                customerInfo.address || '',
                customerInfo.phone || '',
                customerInfo.city || '',
                customerInfo.state || '',
                customerInfo.zip || '',
                customerInfo.date || '',
                dataJSON
              ],
              function(err) {
                db.close();
                
                if (err) {
                  console.error('Error inserting measurement:', err);
                  return res.status(500).json({ 
                    success: false, 
                    message: 'Error saving measurement data',
                    error: err.message
                  });
                }
                
                console.log(`Added new measurement for ${customerInfo.name} with ID ${this.lastID}`);
                
                res.status(201).json({
                  success: true,
                  message: 'Measurement data saved successfully',
                  id: this.lastID
                });
              }
            );
          }
        }
      );
    });
  } catch (error) {
    console.error('Error processing measurement data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing measurement data',
      error: error.message
    });
  }
});

// API endpoint to get all measurements
app.get('/api/measurements', (req, res) => {
  // Check if database is accessible
  if (!fs.existsSync(measurementsDbPath)) {
    return res.status(503).json({
      success: false,
      message: 'Database not accessible',
      error: 'Database file not found'
    });
  }
  
  const db = new sqlite3.Database(measurementsDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.all(
      `SELECT 
        id, customer_name, customer_address, customer_phone,
        customer_city, customer_state, customer_zip,
        measurement_date, data, created_at, updated_at
      FROM blinds_measurements
      ORDER BY updated_at DESC`,
      [],
      (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error fetching measurements:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error fetching measurements',
            error: err.message
          });
        }
        
        // Parse the JSON data for each measurement
        const measurements = rows.map(row => {
          try {
            const parsedData = JSON.parse(row.data);
            return {
              id: row.id,
              customerInfo: {
                name: row.customer_name,
                address: row.customer_address,
                phone: row.customer_phone,
                city: row.customer_city,
                state: row.customer_state,
                zip: row.customer_zip,
                date: row.measurement_date
              },
              ...parsedData,
              savedToCloud: row.updated_at
            };
          } catch (e) {
            console.error(`Error parsing data for measurement ID ${row.id}:`, e);
            return {
              id: row.id,
              customerInfo: {
                name: row.customer_name,
                address: row.customer_address,
                phone: row.customer_phone,
                city: row.customer_city,
                state: row.customer_state,
                zip: row.customer_zip,
                date: row.measurement_date
              },
              error: 'Error parsing measurement data',
              savedToCloud: row.updated_at
            };
          }
        });
        
        res.status(200).json({ 
          success: true, 
          data: measurements
        });
      }
    );
  });
});

// API endpoint to get a specific measurement
app.get('/api/measurements/:id', (req, res) => {
  const measurementId = req.params.id;
  
  // Check if database is accessible
  if (!fs.existsSync(measurementsDbPath)) {
    return res.status(503).json({
      success: false,
      message: 'Database not accessible',
      error: 'Database file not found'
    });
  }
  
  const db = new sqlite3.Database(measurementsDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.get(
      `SELECT 
        id, customer_name, customer_address, customer_phone,
        customer_city, customer_state, customer_zip,
        measurement_date, data, created_at, updated_at
      FROM blinds_measurements
      WHERE id = ?`,
      [measurementId],
      (err, row) => {
        db.close();
        
        if (err) {
          console.error('Error fetching measurement:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error fetching measurement',
            error: err.message
          });
        }
        
        if (!row) {
          return res.status(404).json({
            success: false,
            message: 'Measurement not found'
          });
        }
        
        // Parse the JSON data
        try {
          const parsedData = JSON.parse(row.data);
          const measurement = {
            id: row.id,
            customerInfo: {
              name: row.customer_name,
              address: row.customer_address,
              phone: row.customer_phone,
              city: row.customer_city,
              state: row.customer_state,
              zip: row.customer_zip,
              date: row.measurement_date
            },
            ...parsedData,
            savedToCloud: row.updated_at
          };
          
          res.status(200).json({ 
            success: true, 
            data: measurement
          });
        } catch (e) {
          console.error(`Error parsing data for measurement ID ${row.id}:`, e);
          res.status(500).json({
            success: false,
            message: 'Error parsing measurement data',
            error: e.message
          });
        }
      }
    );
  });
});

// API endpoint to delete a measurement
app.delete('/api/measurements/:id', (req, res) => {
  const measurementId = req.params.id;
  
  // Check if database is accessible
  if (!fs.existsSync(measurementsDbPath)) {
    return res.status(503).json({
      success: false,
      message: 'Database not accessible',
      error: 'Database file not found'
    });
  }
  
  const db = new sqlite3.Database(measurementsDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.run(
      'DELETE FROM blinds_measurements WHERE id = ?',
      [measurementId],
      function(err) {
        db.close();
        
        if (err) {
          console.error('Error deleting measurement:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error deleting measurement',
            error: err.message
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'Measurement not found'
          });
        }
        
        res.status(200).json({ 
          success: true, 
          message: 'Measurement deleted successfully'
        });
      }
    );
  });
});
// SUPPLIER MANAGEMENT API ENDPOINTS
// GET all suppliers
app.get('/api/suppliers', (req, res) => {
  // Check if database is accessible
  if (!fs.existsSync(blindOrdersDbPath)) {
    return res.status(503).json({
      success: false,
      message: 'Database not accessible',
      error: 'Database file not found'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.all(
      `SELECT 
        id, name, email, contact_person, phone, product_types, 
        lead_time, default_terms, notes, created_at, updated_at
      FROM suppliers
      ORDER BY name ASC`,
      [],
      (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error fetching suppliers:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error fetching suppliers',
            error: err.message
          });
        }
        
        res.status(200).json({
          success: true,
          data: rows
        });
      }
    );
  });
});

// POST new supplier
app.post('/api/suppliers', (req, res) => {
  const { 
    name, 
    email, 
    contact_person,
    phone, 
    product_types,
    lead_time,
    default_terms,
    notes
  } = req.body;
  
  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Supplier name and email are required'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    // Check if a supplier with this email already exists
    db.get('SELECT id FROM suppliers WHERE email = ?', [email], (err, row) => {
      if (err) {
        db.close();
        console.error('Error checking for existing supplier:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error checking for existing supplier',
          error: err.message
        });
      }
      
      // If supplier exists, update instead of insert
      if (row) {
        const sql = `
          UPDATE suppliers 
          SET name = ?, contact_person = ?, phone = ?,
              product_types = ?, lead_time = ?, default_terms = ?,
              notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(sql, [
          name,
          contact_person || '',
          phone || '',
          product_types || '',
          lead_time || 0,
          default_terms || '',
          notes || '',
          row.id
        ], function(err) {
          db.close();
          
          if (err) {
            console.error('Error updating supplier:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error updating supplier',
              error: err.message
            });
          }
          
          res.status(200).json({
            success: true,
            message: 'Supplier updated successfully',
            id: row.id
          });
        });
      } else {
        // Insert new supplier
        const sql = `
          INSERT INTO suppliers (
            name, email, contact_person, phone, 
            product_types, lead_time, default_terms, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [
          name,
          email,
          contact_person || '',
          phone || '',
          product_types || '',
          lead_time || 0,
          default_terms || '',
          notes || ''
        ], function(err) {
          db.close();
          
          if (err) {
            console.error('Error creating supplier:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error creating supplier',
              error: err.message
            });
          }
          
          res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            id: this.lastID
          });
        });
      }
    });
  });
});
// CLIENT MANAGEMENT API ENDPOINTS
// GET all clients
app.get('/api/clients', (req, res) => {
  // Check if database is accessible
  if (!fs.existsSync(blindOrdersDbPath)) {
    return res.status(503).json({
      success: false,
      message: 'Database not accessible',
      error: 'Database file not found'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.all(
      `SELECT 
        id, name, email, phone, address, company, type, 
        service_type, measurement_type, default_discount, notes,
        created_at, updated_at
      FROM clients
      ORDER BY name ASC`,
      [],
      (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error fetching clients:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error fetching clients',
            error: err.message
          });
        }
        
        // Map database field names to client manager field names for compatibility
        const clients = rows.map(row => ({
          id: row.id.toString(),
          name: row.name || '',
          email: row.email || '',
          phone: row.phone || '',
          propertyName: row.company || '',
          type: row.type || 'residential',
          serviceType: row.service_type || 'installation',
          measurementType: row.measurement_type || 'window',
          defaultDiscount: row.default_discount || 0,
          notes: row.notes || '',
          address: row.address || '',
          created_at: row.created_at,
          updated_at: row.updated_at
        }));
        
        res.status(200).json(clients);
      }
    );
  });
});

// GET client by ID
app.get('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.get('SELECT * FROM clients WHERE id = ?', [clientId], (err, row) => {
      db.close();
      
      if (err) {
        console.error('Error fetching client:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching client',
          error: err.message
        });
      }
      
      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Map database field names to client manager field names for compatibility
      const client = {
        id: row.id.toString(),
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        propertyName: row.company || '',
        type: row.type || 'residential',
        serviceType: row.service_type || 'installation',
        measurementType: row.measurement_type || 'window',
        defaultDiscount: row.default_discount || 0,
        notes: row.notes || '',
        address: row.address || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      res.status(200).json(client);
    });
  });
});

// POST new client
app.post('/api/clients', (req, res) => {
  const { 
    name, 
    email, 
    phone, 
    propertyName, 
    type, 
    serviceType, 
    measurementType, 
    defaultDiscount, 
    notes,
    address 
  } = req.body;
  
  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Client name and email are required'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    // Check if a client with this email already exists
    db.get('SELECT id FROM clients WHERE email = ?', [email], (err, row) => {
      if (err) {
        db.close();
        console.error('Error checking for existing client:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error checking for existing client',
          error: err.message
        });
      }
      
      // If client exists, update instead of insert
      if (row) {
        const sql = `
          UPDATE clients 
          SET name = ?, phone = ?, address = ?, company = ?,
              type = ?, service_type = ?, measurement_type = ?, 
              default_discount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(sql, [
          name,
          phone || '',
          address || '',
          propertyName || '',
          type || 'residential',
          serviceType || 'installation',
          measurementType || 'window',
          defaultDiscount || 0,
          notes || '',
          row.id
        ], function(err) {
          db.close();
          
          if (err) {
            console.error('Error updating client:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error updating client',
              error: err.message
            });
          }
          
          res.status(200).json({
            success: true,
            message: 'Client updated successfully',
            id: row.id,
            ...req.body
          });
        });
      } else {
        // Insert new client
        const sql = `
          INSERT INTO clients (
            name, phone, address, email, company, 
            type, service_type, measurement_type, default_discount, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [
          name,
          phone || '',
          address || '',
          email,
          propertyName || '',
          type || 'residential',
          serviceType || 'installation',
          measurementType || 'window',
          defaultDiscount || 0,
          notes || ''
        ], function(err) {
          db.close();
          
          if (err) {
            console.error('Error creating client:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error creating client',
              error: err.message
            });
          }
          
          res.status(201).json({
            success: true,
            message: 'Client created successfully',
            id: this.lastID,
            ...req.body
          });
        });
      }
    });
  });
});

// PUT update client
app.put('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  const { 
    name, 
    email, 
    phone, 
    propertyName, 
    type, 
    serviceType, 
    measurementType, 
    defaultDiscount, 
    notes,
    address 
  } = req.body;
  
  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Client name and email are required'
    });
  }
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    const sql = `
      UPDATE clients 
      SET name = ?, phone = ?, address = ?, email = ?, company = ?,
          type = ?, service_type = ?, measurement_type = ?, 
          default_discount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(sql, [
      name,
      phone || '',
      address || '',
      email,
      propertyName || '',
      type || 'residential',
      serviceType || 'installation',
      measurementType || 'window',
      defaultDiscount || 0,
      notes || '',
      clientId
    ], function(err) {
      db.close();
      
      if (err) {
        console.error('Error updating client:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating client',
          error: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Client updated successfully',
        id: clientId,
        ...req.body
      });
    });
  });
});

// DELETE client
app.delete('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.run('DELETE FROM clients WHERE id = ?', [clientId], function(err) {
      db.close();
      
      if (err) {
        console.error('Error deleting client:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error deleting client',
          error: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Client deleted successfully'
      });
    });
  });
});

// GET clients by email
app.get('/api/clients/email/:email', (req, res) => {
  const email = req.params.email;
  
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Error connecting to database',
        error: err.message
      });
    }
    
    db.get('SELECT * FROM clients WHERE email = ?', [email], (err, row) => {
      db.close();
      
      if (err) {
        console.error('Error fetching client by email:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching client by email',
          error: err.message
        });
      }
      
      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Map database field names to client manager field names for compatibility
      const client = {
        id: row.id.toString(),
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        propertyName: row.company || '',
        type: row.type || 'residential',
        serviceType: row.service_type || 'installation',
        measurementType: row.measurement_type || 'window',
        defaultDiscount: row.default_discount || 0,
        notes: row.notes || '',
        address: row.address || '',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      res.status(200).json(client);
    });
  });
});

// POST new invoice
app.post('/api/invoices', (req, res) => {
  const invoice = req.body;
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    db.run(`
      INSERT INTO invoices (
        id, work_order_id, client_name, client_email, client_phone, client_address, items,
        discount, subtotal, discount_amount, tax_amount, total, status, date_created, date_due, date_paid, date_sent, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      invoice.id,
      invoice.workOrderId || '',
      invoice.clientName,
      invoice.clientEmail,
      invoice.clientPhone,
      invoice.clientAddress,
      JSON.stringify(invoice.items),
      invoice.discount,
      invoice.subtotal,
      invoice.discountAmount,
      invoice.taxAmount,
      invoice.total,
      invoice.status || 'draft',
      invoice.dateCreated,
      invoice.dateDue,
      invoice.datePaid || null,
      invoice.dateSent || null
    ], function(err) {
      db.close();
      if (err) return res.status(500).json({ success: false, message: 'Failed to save invoice', error: err.message });
      res.status(201).json({ success: true, message: 'Invoice saved', id: invoice.id });
    });
  });
});

// GET all invoices
app.get('/api/invoices', (req, res) => {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    db.all('SELECT * FROM invoices ORDER BY date_created DESC', [], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: err.message });
      // Parse items JSON
      rows.forEach(row => { row.items = JSON.parse(row.items || '[]'); });
      res.status(200).json({ success: true, data: rows });
    });
  });
});

// PUT update invoice status (sent/paid)
app.put('/api/invoices/:id/status', (req, res) => {
  const { status, datePaid, dateSent } = req.body;
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    let updateFields = 'status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status, req.params.id];
    if (status === 'paid') {
      updateFields += ', date_paid = ?';
      params = [status, datePaid || new Date().toISOString(), req.params.id];
    } else if (status === 'sent') {
      updateFields += ', date_sent = ?';
      params = [status, dateSent || new Date().toISOString(), req.params.id];
    }
    db.run(`UPDATE invoices SET ${updateFields} WHERE id = ?`, params, function(err) {
      db.close();
      if (err) return res.status(500).json({ success: false, message: 'Failed to update invoice', error: err.message });
      res.status(200).json({ success: true, message: 'Invoice updated' });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: err.message 
  });
});

// Catch-all route for SPA (must be last!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Measurements database path: ${measurementsDbPath}`);
  console.log(`Blind orders database path: ${blindOrdersDbPath}`);
});

function initInvoicesTable() {
  const db = new sqlite3.Database(blindOrdersDbPath, (err) => {
    if (err) {
      console.error('Error connecting to database for invoices table initialization:', err.message);
      return;
    }
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      work_order_id TEXT,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      client_address TEXT,
      items TEXT,
      discount REAL,
      subtotal REAL,
      discount_amount REAL,
      tax_amount REAL,
      total REAL,
      status TEXT DEFAULT 'draft',
      date_created TEXT,
      date_due TEXT,
      date_paid TEXT,
      date_sent TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating invoices table:', err.message);
      } else {
        console.log('Invoices table created or already exists');
      }
      db.close();
    });
  });
}
initInvoicesTable();