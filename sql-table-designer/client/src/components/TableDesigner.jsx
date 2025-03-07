import React, { useState, useEffect } from 'react';

const SimplifiedTableDesigner = ({ onBack, onTableCreated, dbConfig }) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([
    { name: 'ID', dataType: 'BIGINT', isPrimaryKey: true, isNullable: false, isIdentity: true, isFixed: true }
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');
  
  // Simplified data types for non-technical users
  const userFriendlyDataTypes = [
    'Text',
    'Number',
    'Date',
    'True/False'
  ];
  
  // Mapping from user-friendly types to SQL data types
  const sqlDataTypeMap = {
    'Text': 'STRING',
    'Number': 'DOUBLE',
    'Date': 'TIMESTAMP',
    'True/False': 'BOOLEAN',
    'BIGINT': 'BIGINT' // Special type used only for the ID column
  };
  
  // Effect to update the primary key name when table name changes
  useEffect(() => {
    if (tableName) {
      const updatedColumns = [...columns];
      // Find the primary key column (should be the first one)
      const pkColumnIndex = updatedColumns.findIndex(col => col.isPrimaryKey);
      if (pkColumnIndex !== -1) {
        // Only update if the name follows the pattern or is still the default
        if (updatedColumns[pkColumnIndex].name === 'ID' || 
            updatedColumns[pkColumnIndex].name.endsWith('ID')) {
          updatedColumns[pkColumnIndex].name = `${tableName}ID`;
          setColumns(updatedColumns);
          setTimeout(() => generateSQL(tableName, updatedColumns), 0);
        }
      }
    }
  }, [tableName]);
  
  const handleTableNameChange = (e) => {
    const newTableName = e.target.value;
    setTableName(newTableName);
    
    // Generate SQL with the new value
    setTimeout(() => {
      generateSQL(newTableName);
    }, 0);
  };
  
  const handleColumnChange = (index, field, value) => {
    const updatedColumns = [...columns];
    
    // If setting as primary key, automatically set nullable to false
    if (field === 'isPrimaryKey' && value === true) {
      // First, remove primary key status from any existing PK column
      updatedColumns.forEach((col, i) => {
        if (i !== index && col.isPrimaryKey) {
          col.isPrimaryKey = false;
        }
      });
      
      // Set the new primary key
      updatedColumns[index][field] = value;
      updatedColumns[index]['isNullable'] = false;
    } else {
      // If this is the primary key column and trying to make it nullable, prevent it
      if (updatedColumns[index].isPrimaryKey && field === 'isNullable' && value === true) {
        return; // Don't allow primary key to be nullable
      }
      
      // Otherwise just update the specified field
      updatedColumns[index][field] = value;
    }
    
    setColumns(updatedColumns);
    
    // Generate SQL with updated columns
    setTimeout(() => {
      generateSQL(tableName, updatedColumns);
    }, 0);
  };
  
  const addColumn = () => {
    setColumns([
      ...columns,
      { name: '', dataType: 'Text', isPrimaryKey: false, isNullable: true, isIdentity: false, isFixed: false }
    ]);
    // Generate SQL when columns are added
    setTimeout(() => generateSQL(), 0);
  };
  
  const removeColumn = (index) => {
    // Prevent removing the primary key column
    if (columns[index].isPrimaryKey) {
      return;
    }
    
    const updatedColumns = columns.filter((_, i) => i !== index);
    setColumns(updatedColumns);
    // Generate SQL with the updated columns
    setTimeout(() => generateSQL(tableName, updatedColumns), 0);
  };
  
  const generateSQL = (currentTableName = tableName, currentColumns = columns) => {
    if (!currentTableName) {
      setGeneratedSQL('');
      return '';
    }
    
    // Validate columns
    for (const column of currentColumns) {
      if (!column.name) {
        setGeneratedSQL('');
        return '';
      }
    }
    
    // Get catalog and schema from dbConfig, or use defaults if not available
    const catalog = dbConfig?.databricks?.catalog || 'nexus_dev';
    const schema = dbConfig?.databricks?.schema || 'default';
    
    // Generate SQL statement with dynamic catalog and schema
    let sql = `CREATE TABLE ${catalog}.${schema}.${currentTableName} (\n`;
    
    const columnDefinitions = currentColumns.map(col => {
      // Map the user-friendly data type to actual SQL data type
      const sqlDataType = sqlDataTypeMap[col.dataType];
      
      let definition = `  ${col.name} ${sqlDataType}`;
      
      // Add IDENTITY for auto-increment primary key
      if (col.isIdentity) {
        definition += ' GENERATED ALWAYS AS IDENTITY';
      }
      
      definition += col.isNullable ? '' : ' NOT NULL';
      
      return definition;
    }).join(',\n');
    
    sql += columnDefinitions;
    
    // Add primary key constraint if any column is marked as primary key
    const primaryKeyColumns = currentColumns.filter(col => col.isPrimaryKey).map(col => col.name);
    if (primaryKeyColumns.length > 0) {
      sql += `,\n  CONSTRAINT PK_${currentTableName} PRIMARY KEY (\n    ${primaryKeyColumns.join(',\n    ')}\n  )`;
    }
    
    sql += '\n) USING DELTA;';
    
    setGeneratedSQL(sql);
    return sql;
  };
  
  const createTable = async () => {
    setIsLoading(true);
    setMessage('');
    
    // Generate SQL once more to ensure it's up to date
    const sql = generateSQL();
    if (!sql) {
      setIsLoading(false);
      return;
    }
    
    // In a real application, you would send this SQL to your backend API
    try {
      // Call the API endpoint
      const response = await fetch('http://localhost:5000/api/create-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Table "${tableName}" created successfully!`);
        if (onTableCreated) {
          onTableCreated(); // Call the callback to refresh tables list
        }
      } else {
        setMessage(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Simple Table Designer</h1>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        )}
      </div>
      
      {/* Display current database connection info */}
      {dbConfig?.databricks && (
        <div className="mb-6 p-3 bg-blue-50 rounded-md text-sm">
          <p className="font-medium text-blue-800">Creating table in: {dbConfig.databricks.catalog || 'nexus'}.{dbConfig.databricks.schema || 'default'}</p>
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Table Name</label>
        <input
          type="text"
          value={tableName}
          onChange={handleTableNameChange}
          className="w-full p-2 border rounded-md"
          placeholder="Enter table name"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Columns</h2>
          <button 
            onClick={addColumn}
            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
          >
            Add Column
          </button>
        </div>
        
        {/* Modern Grid Layout for Column Definitions */}
        <div className="bg-gray-50 rounded-lg shadow overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-200 font-medium text-gray-700">
            <div className="col-span-6">Column Name</div>
            <div className="col-span-3">Data Type</div>
            <div className="col-span-1">Can be empty?</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          {/* Column Rows */}
          {columns.map((column, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-200 hover:bg-gray-100 transition-colors ${column.isPrimaryKey ? 'bg-blue-50' : ''}`}
            >
              <div className="col-span-6">
                <div className="flex items-center gap-2">
                  {column.isPrimaryKey && 
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">ID</span>
                  }
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder={column.isPrimaryKey ? "ID column (auto-generated)" : "Column name"}
                  />
                </div>
              </div>
              
              <div className="col-span-3">
                {column.isFixed ? (
                  <div className="p-2 bg-gray-100 border rounded-md text-gray-600">
                    ID (auto-incrementing)
                  </div>
                ) : (
                  <select
                    value={column.dataType}
                    onChange={(e) => handleColumnChange(index, 'dataType', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {userFriendlyDataTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="col-span-1 text-center">
                <input
                  type="checkbox"
                  checked={column.isNullable}
                  onChange={(e) => handleColumnChange(index, 'isNullable', e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                  disabled={column.isPrimaryKey}
                  title={column.isPrimaryKey ? "ID column cannot be empty" : ""}
                />
              </div>
              
              <div className="col-span-2 text-right">
                <button 
                  onClick={() => removeColumn(index)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={column.isPrimaryKey}
                  title={column.isPrimaryKey ? "ID column cannot be removed" : ""}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          {/* Add Column Button (Bottom) */}
          <div className="px-6 py-3 bg-gray-100">
            <button 
              onClick={addColumn}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              + Add Another Column
            </button>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Generated SQL</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 shadow-inner">{generatedSQL || 'Define your table to generate SQL'}</pre>
      </div>
      
      <div className="flex justify-between items-center">
        <button 
          onClick={createTable} 
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 shadow-sm transition-colors"
          disabled={isLoading || !generatedSQL}
        >
          {isLoading ? 'Creating Table...' : 'Create Table in Database'}
        </button>
        
        {message && (
          <div className={`px-4 py-2 rounded-md shadow-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedTableDesigner;