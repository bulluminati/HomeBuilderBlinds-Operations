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