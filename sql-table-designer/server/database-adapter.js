// databricks-adapter.js
const { DBSQLClient } = require('@databricks/sql');

// Configuration object that will be set during initialization
let dbConfig = {
  databricks: {
    host: '',
    path: '',
    token: '',
    catalog: '',
    schema: 'default',
    cluster_id: ''
  }
};

// Connection pool
let databricksClient = null;

/**
 * Initialize the database adapter with configuration
 * @param {Object} config - Configuration object
 */
const initialize = (config) => {
  dbConfig = { ...dbConfig, ...config };
  
  // Close any existing connections
  if (databricksClient) {
    databricksClient.close();
    databricksClient = null;
  }
};

/**
 * Get a Databricks SQL client
 * @returns {Promise<DBSQLClient>}
 */
const getDatabricksClient = async () => {
  if (!databricksClient) {
    try {
      console.log('Connecting to Databricks with the following config:', {
        host: dbConfig.databricks.host,
        path: dbConfig.databricks.path,
        token: '[REDACTED]'
      });
      
      // For Databricks SQL 1.9.0
      const clientConfig = {
        host: dbConfig.databricks.host,
        // Ensure path is set correctly - this is crucial
        path: dbConfig.databricks.path || '/sql/1.0/endpoints',
      };
      
      // Only add cluster_id if it's provided and not empty
      if (dbConfig.databricks.cluster_id) {
        clientConfig.cluster_id = dbConfig.databricks.cluster_id;
      }
      
      // Create the client using new DBSQLClient()
      databricksClient = new DBSQLClient();
      
      // Connect with token auth
      await databricksClient.connect({
        ...clientConfig,
        token: dbConfig.databricks.token
      });
      
      console.log('Successfully connected to Databricks');
    } catch (err) {
      console.error('Error connecting to Databricks:', err);
      if (err.stack) {
        console.error(err.stack);
      }
      throw err;
    }
  }
  return databricksClient;
};

/**
 * Execute a query
 * @param {string} query - SQL query to execute
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Query results
 */
const executeQuery = async (query, params = {}) => {
  const client = await getDatabricksClient();
  const session = await client.openSession({
    catalog: dbConfig.databricks.catalog,
    schema: dbConfig.databricks.schema
  });
  
  try {
    console.log(`Executing Databricks query: ${query}`);
    console.log('With params:', JSON.stringify(params));
    
    // For Databricks, we need to handle parameters differently
    // Instead of parameter substitution, we'll use literal values in the query
    let modifiedQuery = query;
    
    if (Object.keys(params).length > 0) {
      // For each parameter, replace it with a proper SQL literal
      Object.entries(params).forEach(([name, value]) => {
        let sqlValue;
        
        if (value === null) {
          sqlValue = 'NULL';
        } else if (typeof value === 'string') {
          // Escape single quotes in strings by doubling them
          sqlValue = `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'boolean') {
          sqlValue = value ? 'TRUE' : 'FALSE';
        } else if (value instanceof Date) {
          sqlValue = `'${value.toISOString()}'`;
        } else {
          // Numbers and other types
          sqlValue = String(value);
        }
        
        // Replace the parameter in the query
        modifiedQuery = modifiedQuery.replace(
          new RegExp(`@${name}\\b`, 'g'), 
          sqlValue
        );
        
        // Also handle ? placeholders (positional parameters)
        if (modifiedQuery.includes('?')) {
          modifiedQuery = modifiedQuery.replace('?', sqlValue);
        }
      });
    }
    
    console.log(`Modified query: ${modifiedQuery}`);
    
    // Execute the query without parameters (they're now embedded)
    const operation = await session.executeStatement(modifiedQuery);
    
    try {
      const result = await operation.fetchAll();
      console.log(`Query executed successfully, fetched ${result.length} rows`);
      
      // Return result
      return {
        recordset: result
      };
    } catch (fetchError) {
      console.error('Error fetching results:', fetchError);
      throw fetchError;
    }
  } catch (queryError) {
    console.error('Error executing query:', queryError);
    throw queryError;
  } finally {
    try {
      await session.close();
    } catch (closeError) {
      console.error('Error closing session:', closeError);
    }
  }
};

/**
 * Get all tables from the database
 * @returns {Promise<Array>} Array of table objects
 */
const getTables = async () => {
  // For Databricks Unity Catalog
  const result = await executeQuery(`
    SHOW TABLES IN ${dbConfig.databricks.catalog}.${dbConfig.databricks.schema}
  `);
  
  // Transform the result
  return result.recordset.map(table => ({
    name: table.tableName,
    id: `${dbConfig.databricks.catalog}.${dbConfig.databricks.schema}.${table.tableName}`,
    columnCount: 0, // Will need additional query to get column count
    rCount: 0 // Will need additional query to get row count
  }));
};

/**
 * Get table structure (columns, data types, etc.)
 * @param {string} tableId - Full path for Databricks table (catalog.schema.tableName)
 * @returns {Promise<Object>} Table structure information
 */
const getTableStructure = async (tableId) => {
  // For Databricks, tableId is the full table path: catalog.schema.tableName
  const [catalog, schema, tableName] = tableId.split('.');
  
  // Get columns for the table
  const columnsResult = await executeQuery(`
    DESCRIBE TABLE ${catalog}.${schema}.${tableName}
  `);
  
  // Transform the result
  const columns = columnsResult.recordset.map(col => ({
    name: col.col_name,
    dataType: col.data_type,
    length: 0, // Not directly available in Databricks
    precision: 0, // Not directly available in Databricks
    scale: 0, // Not directly available in Databricks
    isNullable: true, // Default to true for Databricks
    isPrimaryKey: false // Primary key info not easily available in DESCRIBE
  }));
  
  return {
    tableName,
    columns
  };
};

/**
 * Get data from a table
 * @param {string} tableId - Full path for Databricks table
 * @param {number} limit - Maximum number of rows to retrieve
 * @returns {Promise<Array>} Table data
 */
const getTableData = async (tableId, limit = 1000) => {
  const result = await executeQuery(`
    SELECT * FROM ${tableId} LIMIT ${limit}
  `);
  return result.recordset;
};

/**
 * Create a new table
 * @param {string} sqlStatement - SQL statement to create the table
 * @returns {Promise<void>}
 */
const createTable = async (sqlStatement) => {
  return await executeQuery(sqlStatement);
};

/**
 * Insert a row into a table
 * @param {string} tableId - Full path for Databricks table
 * @param {Object} rowData - Data to insert
 * @returns {Promise<void>}
 */
const insertRow = async (tableId, rowData) => {
  // Remove auto-generated ID if present
  const filteredRowData = Object.keys(rowData).reduce((acc, key) => {
    if (key.toLowerCase() !== 'id') {
      acc[key] = rowData[key];
    }
    return acc;
  }, {});
  
  // Build the INSERT statement
  const columns = Object.keys(filteredRowData);
  
  if (columns.length === 0) {
    throw new Error('No data provided for insertion');
  }
  
  // Use direct value insertion rather than parameterized query
  // We'll let executeQuery handle the parameter substitution
  const paramNames = columns.map((_, i) => `@p${i}`);
  const insertSql = `INSERT INTO ${tableId} (${columns.join(', ')}) VALUES (${paramNames.join(', ')})`;
  
  // Create parameters object
  const params = {};
  columns.forEach((col, i) => {
    params[`p${i}`] = filteredRowData[col];
  });
  
  console.log('Executing insert with SQL:', insertSql);
  console.log('Parameters:', JSON.stringify(params));
  
  // Execute the INSERT statement
  await executeQuery(insertSql, params);
};

/**
 * Update a row in a table
 * @param {string} tableId - Full path for Databricks table
 * @param {string} rowId - Primary key value of the row to update
 * @param {Object} rowData - New data for the row
 * @param {string} primaryKeyColumn - Primary key column name (defaults to 'id')
 * @returns {Promise<void>}
 */
const updateRow = async (tableId, rowId, rowData, primaryKeyColumn = 'id') => {
  // Build the UPDATE statement
  const setClauses = Object.keys(rowData)
    .filter(key => key !== primaryKeyColumn) // Skip the primary key
    .map(key => `${key} = @${key}`)
    .join(', ');
  
  const updateSql = `UPDATE ${tableId} SET ${setClauses} WHERE ${primaryKeyColumn} = @pkValue`;
  
  console.log('Executing update with SQL:', updateSql);
  
  // Prepare parameters
  const params = { ...rowData, pkValue: rowId };
  console.log('Parameters:', JSON.stringify(params));
  
  await executeQuery(updateSql, params);
};

/**
 * Delete a row from a table
 * @param {string} tableId - Full path for Databricks table
 * @param {string} rowId - Primary key value of the row to delete
 * @param {string} primaryKeyColumn - Primary key column name (defaults to 'id')
 * @returns {Promise<void>}
 */
const deleteRow = async (tableId, rowId, primaryKeyColumn = 'id') => {
  // Build the DELETE statement using named parameter
  const deleteSql = `DELETE FROM ${tableId} WHERE ${primaryKeyColumn} = @pkValue`;
  
  console.log('Executing delete with SQL:', deleteSql);
  console.log('Parameters:', JSON.stringify({ pkValue: rowId, pkColumn: primaryKeyColumn }));
  
  await executeQuery(deleteSql, { pkValue: rowId });
};

/**
 * Get database metadata
 * @returns {Promise<Object>} Database metadata
 */
const getDatabaseMetadata = async () => {
  // Get all tables in the catalog and schema
  const tablesResult = await executeQuery(`
    SHOW TABLES IN ${dbConfig.databricks.catalog}.${dbConfig.databricks.schema}
  `);
  
  // Process each table to get column information
  const tables = await Promise.all(tablesResult.recordset.map(async (table) => {
    const columnsResult = await executeQuery(`
      DESCRIBE TABLE ${dbConfig.databricks.catalog}.${dbConfig.databricks.schema}.${table.tableName}
    `);
    
    return {
      name: table.tableName,
      schema: dbConfig.databricks.schema,
      columns: columnsResult.recordset.map(col => ({
        name: col.col_name,
        dataType: col.data_type,
        maxLength: 0, // Not directly available
        precision: 0, // Not directly available
        scale: 0, // Not directly available
        isNullable: true, // Default to true
        isPrimaryKey: false // Not directly available
      }))
    };
  }));
  
  return { tables };
};

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
const closeConnections = async () => {
  if (databricksClient) {
    await databricksClient.close();
    databricksClient = null;
  }
};

module.exports = {
  initialize,
  executeQuery,
  getTables,
  getTableStructure,
  getTableData,
  createTable,
  insertRow,
  updateRow,
  deleteRow,
  getDatabaseMetadata,
  closeConnections
};