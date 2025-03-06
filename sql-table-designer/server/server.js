const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dbAdapter = require('./database-adapter');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database adapter with Databricks configuration
dbAdapter.initialize({
  databricks: {
    host: process.env.DATABRICKS_HOST || 'adb-123456789.1.azuredatabricks.net',
    path: process.env.DATABRICKS_PATH || '/sql/1.0/warehouses/abcdef1234567890',
    token: process.env.DATABRICKS_TOKEN || 'dapi123456789',
    catalog: process.env.DATABRICKS_CATALOG || 'main',
    schema: process.env.DATABRICKS_SCHEMA || 'default',
    cluster_id: process.env.DATABRICKS_CLUSTER_ID || ''
  }
});

// Configuration endpoint
app.post('/api/configure', async (req, res) => {
  try {
    const { config } = req.body;
    
    // Initialize adapter with new configuration
    dbAdapter.initialize({
      databricks: config
    });
    
    res.json({ message: 'Databricks configuration updated successfully' });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ 
      error: 'Failed to update configuration', 
      message: error.message 
    });
  }
});

// Get all tables endpoint (used by the table selector)
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await dbAdapter.getTables();
    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables', 
      message: error.message 
    });
  }
});

// Get table structure endpoint (used by the data grid)
app.get('/api/tables/:id/structure', async (req, res) => {
  try {
    const tableId = req.params.id;
    const structure = await dbAdapter.getTableStructure(tableId);
    res.json(structure);
  } catch (error) {
    console.error('Error fetching table structure:', error);
    res.status(500).json({ 
      error: 'Failed to fetch table structure',
      message: error.message 
    });
  }
});

// Get table data endpoint (used by the data grid)
app.get('/api/tables/:id/data', async (req, res) => {
  try {
    const tableId = req.params.id;
    const data = await dbAdapter.getTableData(tableId);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch table data',
      message: error.message 
    });
  }
});

// Create a new table endpoint
app.post('/api/create-table', async (req, res) => {
  try {
    const { sql: sqlStatement } = req.body;
    
    if (!sqlStatement) {
      return res.status(400).json({ message: 'SQL statement is required' });
    }
    
    await dbAdapter.createTable(sqlStatement);
    
    // Return success response
    res.status(201).json({ 
      message: 'Table created successfully',
      sql: sqlStatement 
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ 
      message: 'Failed to create table', 
      error: error.message 
    });
  }
});

// Insert a new row endpoint (used by the data grid)
app.post('/api/tables/:id/data', async (req, res) => {
  try {
    const tableId = req.params.id;
    const rowData = req.body;
    
    await dbAdapter.insertRow(tableId, rowData);
    
    res.json({ success: true, message: 'Row inserted successfully' });
  } catch (error) {
    console.error('Error inserting row:', error);
    res.status(500).json({ 
      error: 'Failed to insert row',
      message: error.message 
    });
  }
});

// Update a row endpoint (used by the data grid)
app.put('/api/tables/:id/data/:rowId', async (req, res) => {
  try {
    const tableId = req.params.id;
    const rowId = req.params.rowId;
    const rowData = req.body;
    const pkColumn = req.query.pkColumn; // Get the primary key column name from query
    
    await dbAdapter.updateRow(tableId, rowId, rowData, pkColumn);
    
    res.json({ success: true, message: 'Row updated successfully' });
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ 
      error: 'Failed to update row',
      message: error.message 
    });
  }
});

// Delete a row endpoint (used by the data grid)
app.delete('/api/tables/:id/data/:rowId', async (req, res) => {
  try {
    const tableId = req.params.id;
    const rowId = req.params.rowId;
    const pkColumn = req.query.pkColumn; // Get from query parameter
    
    await dbAdapter.deleteRow(tableId, rowId, pkColumn);
    
    res.json({ success: true, message: 'Row deleted successfully' });
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).json({ 
      error: 'Failed to delete row',
      message: error.message 
    });
  }
});

// Database metadata endpoint
app.get('/api/database-metadata', async (req, res) => {
  try {
    const metadata = await dbAdapter.getDatabaseMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching database metadata:', error);
    res.status(500).json({ 
      message: 'Failed to fetch database metadata', 
      error: error.message 
    });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server configured to use Databricks database');
});