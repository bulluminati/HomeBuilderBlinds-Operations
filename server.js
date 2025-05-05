const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Import the blind orders router
const blindOrdersRouter = require('./routes/blindOrders');

// Database paths
const measurementsDbPath = path.join(__dirname, 'data', 'shallowgrave.db');
const blindOrdersDbPath = path.join(__dirname, '../HomeBuilderBlinds-Agent-Operations/data/homebuilder_ops.db');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Add the blind orders API route
app.use('/api/blindorders', blindOrdersRouter);

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Measurements database path: ${measurementsDbPath}`);
  console.log(`Blind orders database path: ${blindOrdersDbPath}`);
});