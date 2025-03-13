import React, { useState, useEffect } from 'react';

const SimplifiedTableDesigner = ({ onBack, onTableCreated, dbConfig }) => {
  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [columns, setColumns] = useState([
    { name: 'ID', dataType: 'BIGINT', isPrimaryKey: true, isNullable: false, isIdentity: true, isFixed: true }
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [showListValuesModal, setShowListValuesModal] = useState(false);
  const [showTableReferenceModal, setShowTableReferenceModal] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [currentColumnIndex, setCurrentColumnIndex] = useState(null);
  const [listValues, setListValues] = useState('');
  const [selectedRefTable, setSelectedRefTable] = useState('');
  const [selectedDisplayColumns, setSelectedDisplayColumns] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
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
    'BIGINT': 'BIGINT', // Special type used only for the ID column
    'List': 'STRING',   // List column is just a text column with validation
    'Reference': 'BIGINT' // Reference column is a BIGINT for foreign keys
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
  
  // Fetch available tables for reference columns
  useEffect(() => {
    const fetchAvailableTables = async () => {
      try {
        // In a real app, you would fetch this from your API
        // For now, we'll use a mock list
        // const response = await fetch('http://localhost:5000/api/tables');
        // const data = await response.json();
        // setAvailableTables(data.tables);
        
        // Mock data for development
        setAvailableTables([
          { id: 'customers', name: 'Customers' },
          { id: 'products', name: 'Products' },
          { id: 'orders', name: 'Orders' }
        ]);
      } catch (error) {
        console.error('Error fetching available tables:', error);
      }
    };
    
    fetchAvailableTables();
  }, []);
  
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
  
  const addListColumn = () => {
    setCurrentColumnIndex(columns.length);
    setListValues('');
    setShowListValuesModal(true);
  };
  
  const addTableReferenceColumn = () => {
    setCurrentColumnIndex(columns.length);
    setSelectedRefTable('');
    setSelectedDisplayColumns([]);
    setShowTableReferenceModal(true);
  };
  
  const handleListValuesConfirm = () => {
    // Create a new column with list values
    const newColumn = {
      name: '',
      dataType: 'List',
      isPrimaryKey: false,
      isNullable: true,
      isIdentity: false,
      isFixed: false,
      listValues: listValues.split(',').map(val => val.trim()).filter(val => val !== '')
    };
    
    setColumns([...columns, newColumn]);
    setShowListValuesModal(false);
    
    // Reset values for next time
    setTimeout(() => {
      setListValues('');
      generateSQL();
    }, 0);
  };
  
  const handleTableReferenceConfirm = () => {
    if (!selectedRefTable) {
      return; // Require a selected table
    }
    
    // Create a new column with reference info
    const newColumn = {
      name: `${selectedRefTable}ID`, // Default name based on referenced table
      dataType: 'Reference',
      isPrimaryKey: false,
      isNullable: true,
      isIdentity: false,
      isFixed: false,
      referenceTable: selectedRefTable,
      displayColumns: selectedDisplayColumns
    };
    
    setColumns([...columns, newColumn]);
    setShowTableReferenceModal(false);
    
    // Reset values for next time
    setTimeout(() => {
      setSelectedRefTable('');
      setSelectedDisplayColumns([]);
      generateSQL();
    }, 0);
  };
  
  // Effect to fetch columns when a reference table is selected
  useEffect(() => {
    const fetchTableColumns = async () => {
      if (!selectedRefTable) return;
      
      try {
        // In a real app, you would fetch this from your API
        // For now, we'll use mock data
        // const response = await fetch(`http://localhost:5000/api/tables/${selectedRefTable}/structure`);
        // const data = await response.json();
        // setAvailableColumns(data.columns);
        
        // Mock data for development
        if (selectedRefTable === 'customers') {
          setAvailableColumns([
            { name: 'CustomerID', type: 'BIGINT' },
            { name: 'Name', type: 'STRING' },
            { name: 'Email', type: 'STRING' },
            { name: 'Phone', type: 'STRING' }
          ]);
        } else if (selectedRefTable === 'products') {
          setAvailableColumns([
            { name: 'ProductID', type: 'BIGINT' },
            { name: 'ProductName', type: 'STRING' },
            { name: 'Price', type: 'DOUBLE' },
            { name: 'Category', type: 'STRING' }
          ]);
        } else {
          setAvailableColumns([
            { name: 'ID', type: 'BIGINT' },
            { name: 'Name', type: 'STRING' },
            { name: 'Description', type: 'STRING' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching table columns:', error);
      }
    };
    
    fetchTableColumns();
  }, [selectedRefTable]);
  
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
      let sqlDataType;
      
      if (col.dataType === 'List') {
        sqlDataType = 'STRING'; // List columns are stored as strings
      } else if (col.dataType === 'Reference') {
        sqlDataType = 'BIGINT'; // Reference columns are foreign keys
      } else {
        sqlDataType = sqlDataTypeMap[col.dataType];
      }
      
      let definition = `  ${col.name} ${sqlDataType}`;
      
      // Add IDENTITY for auto-increment primary key
      if (col.isIdentity) {
        definition += ' GENERATED ALWAYS AS IDENTITY';
      }
      
      definition += col.isNullable ? '' : ' NOT NULL';
      
      // Add a comment for list columns and reference columns
      if (col.dataType === 'List' && col.listValues && col.listValues.length > 0) {
        definition += ` /* ALLOWED VALUES: ${col.listValues.join(', ')} */`;
      } else if (col.dataType === 'Reference' && col.referenceTable) {
        definition += ` /* REFERENCES: ${col.referenceTable} (DISPLAY: ${col.displayColumns?.join(', ') || 'ID'}) */`;
      }
      
      return definition;
    }).join(',\n');
    
    sql += columnDefinitions;
    
    // Add primary key constraint if any column is marked as primary key
    const primaryKeyColumns = currentColumns.filter(col => col.isPrimaryKey).map(col => col.name);
    if (primaryKeyColumns.length > 0) {
      sql += `,\n  CONSTRAINT PK_${currentTableName} PRIMARY KEY (\n    ${primaryKeyColumns.join(',\n    ')}\n  )`;
    }
    
    // Add foreign key constraints for reference columns
    const foreignKeys = currentColumns
      .filter(col => col.dataType === 'Reference' && col.referenceTable)
      .map((col, idx) => {
        return `  CONSTRAINT FK_${currentTableName}_${col.referenceTable}_${idx} FOREIGN KEY (${col.name}) REFERENCES ${catalog}.${schema}.${col.referenceTable} (${col.referenceTable}ID)`;
      });
      
    if (foreignKeys.length > 0) {
      sql += ',\n' + foreignKeys.join(',\n');
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
      // Call the API endpoint with additional metadata
      const response = await fetch('http://localhost:5000/api/create-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql,
          description: tableDescription,
          createdBy: 'UI', // You could replace this with actual user info once you implement auth
          tableMetadata: {
            columns: columns.map(col => ({
              name: col.name,
              dataType: col.dataType,
              isPrimaryKey: col.isPrimaryKey,
              isNullable: col.isNullable,
              isIdentity: col.isIdentity,
              listValues: col.listValues,
              referenceTable: col.referenceTable,
              displayColumns: col.displayColumns
            }))
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Table "${tableName}" created and registered successfully!`);
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

  // Extract ListValuesModal as a separate component to avoid hooks rules issues
  const ListValuesModal = () => {
    // Move the conditional return after the hooks
    const [localListValues, setLocalListValues] = useState(listValues);
    
    const handleConfirm = () => {
      // Update the parent state only when confirming
      setListValues(localListValues);
      handleListValuesConfirm();
    };
    
    if (!showListValuesModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Configure List Column</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter the allowed values for this column, separated by commas.
          </p>
          <textarea
            value={localListValues}
            onChange={(e) => setLocalListValues(e.target.value)}
            className="w-full p-2 border rounded-md h-32 mb-4"
            placeholder="value1, value2, value3"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowListValuesModal(false)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={!localListValues.trim()}
            >
              Add Column
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Extract TableReferenceModal as a separate component to avoid hooks rules issues
  const TableReferenceModal = () => {
    // Move hooks to the top level of the component
    const [localSelectedRefTable, setLocalSelectedRefTable] = useState(selectedRefTable);
    const [localSelectedDisplayColumns, setLocalSelectedDisplayColumns] = useState(selectedDisplayColumns);
    
    // Effect to synchronize with parent state when the modal opens
    useEffect(() => {
      setLocalSelectedRefTable(selectedRefTable);
      setLocalSelectedDisplayColumns(selectedDisplayColumns);
    }, [showTableReferenceModal]);
    
    // Effect to fetch columns when reference table changes (using local state)
    useEffect(() => {
      if (!localSelectedRefTable) return;
      
      // Fetch columns logic remains the same but using localSelectedRefTable
      const fetchMockColumns = () => {
        if (localSelectedRefTable === 'customers') {
          setAvailableColumns([
            { name: 'CustomerID', type: 'BIGINT' },
            { name: 'Name', type: 'STRING' },
            { name: 'Email', type: 'STRING' },
            { name: 'Phone', type: 'STRING' }
          ]);
        } else if (localSelectedRefTable === 'products') {
          setAvailableColumns([
            { name: 'ProductID', type: 'BIGINT' },
            { name: 'ProductName', type: 'STRING' },
            { name: 'Price', type: 'DOUBLE' },
            { name: 'Category', type: 'STRING' }
          ]);
        } else {
          setAvailableColumns([
            { name: 'ID', type: 'BIGINT' },
            { name: 'Name', type: 'STRING' },
            { name: 'Description', type: 'STRING' }
          ]);
        }
      };
      
      fetchMockColumns();
    }, [localSelectedRefTable]);
    
    const handleConfirm = () => {
      // Update parent state only when confirming
      setSelectedRefTable(localSelectedRefTable);
      setSelectedDisplayColumns(localSelectedDisplayColumns);
      handleTableReferenceConfirm();
    };
    
    const handleCheckboxChange = (columnName, isChecked) => {
      if (isChecked) {
        setLocalSelectedDisplayColumns([...localSelectedDisplayColumns, columnName]);
      } else {
        setLocalSelectedDisplayColumns(localSelectedDisplayColumns.filter(c => c !== columnName));
      }
    };
    
    // Conditional render after all the hooks
    if (!showTableReferenceModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Configure Reference Column</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Reference Table</label>
            <select
              value={localSelectedRefTable}
              onChange={(e) => setLocalSelectedRefTable(e.target.value)}
              className="w-full p-2 border rounded-md"
              autoFocus
            >
              <option value="">-- Select a table --</option>
              {availableTables.map(table => (
                <option key={table.id} value={table.id}>{table.name}</option>
              ))}
            </select>
          </div>
          
          {localSelectedRefTable && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Display Columns</label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {availableColumns.map(column => (
                  <div key={column.name} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`col-${column.name}`}
                      checked={localSelectedDisplayColumns.includes(column.name)}
                      onChange={(e) => handleCheckboxChange(column.name, e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor={`col-${column.name}`} className="text-sm">
                      {column.name} ({column.type})
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                These columns will be displayed when selecting values for this reference.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowTableReferenceModal(false)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={!localSelectedRefTable}
            >
              Add Column
            </button>
          </div>
        </div>
      </div>
    );
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
        <label className="block text-sm font-medium mb-2">Table Description</label>
        <input
          type="text"
          value={tableDescription}
          onChange={(e) => setTableDescription(e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="Enter a description for this table (optional)"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Columns</h2>
          <div className="flex gap-2">
            <button 
              onClick={addColumn}
              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
            >
              Add Column
            </button>
            <button 
              onClick={addListColumn}
              className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
            >
              Add List Column
            </button>
            <button 
              onClick={addTableReferenceColumn}
              className="bg-purple-500 text-white px-3 py-1 rounded-md hover:bg-purple-600"
            >
              Add Table Reference
            </button>
          </div>
        </div>
        
        {/* Modern Grid Layout for Column Definitions */}
        <div className="bg-gray-50 rounded-lg shadow overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-200 font-medium text-gray-700">
            <div className="col-span-5">Column Name</div>
            <div className="col-span-3">Data Type</div>
            <div className="col-span-2">Details</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          {/* Column Rows */}
          {columns.map((column, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-200 hover:bg-gray-100 transition-colors ${column.isPrimaryKey ? 'bg-blue-50' : column.dataType === 'List' ? 'bg-green-50' : column.dataType === 'Reference' ? 'bg-purple-50' : ''}`}
            >
              <div className="col-span-5">
                <div className="flex items-center gap-2">
                  {column.isPrimaryKey && 
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">ID</span>
                  }
                  {column.dataType === 'List' && 
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">LIST</span>
                  }
                  {column.dataType === 'Reference' && 
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">REF</span>
                  }
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder={column.isPrimaryKey ? "ID column (auto-generated)" : column.dataType === 'Reference' ? "Reference column" : "Column name"}
                  />
                </div>
              </div>
              
              <div className="col-span-3">
                {column.isFixed ? (
                  <div className="p-2 bg-gray-100 border rounded-md text-gray-600">
                    ID (auto-incrementing)
                  </div>
                ) : column.dataType === 'List' ? (
                  <div className="p-2 bg-green-100 border rounded-md text-green-800">
                    List of Values
                  </div>
                ) : column.dataType === 'Reference' ? (
                  <div className="p-2 bg-purple-100 border rounded-md text-purple-800">
                    Table Reference
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
              
              <div className="col-span-2">
                {column.dataType === 'List' ? (
                  <div className="text-xs text-gray-600">
                    {column.listValues?.length} values defined
                  </div>
                ) : column.dataType === 'Reference' ? (
                  <div className="text-xs text-gray-600">
                    References: {column.referenceTable}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-xs mr-2">Can be empty:</span>
                    <input
                      type="checkbox"
                      checked={column.isNullable}
                      onChange={(e) => handleColumnChange(index, 'isNullable', e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                      disabled={column.isPrimaryKey}
                      title={column.isPrimaryKey ? "ID column cannot be empty" : ""}
                    />
                  </div>
                )}
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
          
          {/* Add Column Buttons (Bottom) */}
          <div className="px-6 py-3 bg-gray-100 flex gap-4">
            <button 
              onClick={addColumn}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              + Add Another Column
            </button>
            <button 
              onClick={addListColumn}
              className="text-green-500 hover:text-green-700 text-sm font-medium"
            >
              + Add List Column
            </button>
            <button 
              onClick={addTableReferenceColumn}
              className="text-purple-500 hover:text-purple-700 text-sm font-medium"
            >
              + Add Table Reference
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
      
      {/* Render modals */}
      <ListValuesModal />
      <TableReferenceModal />
    </div>
  );
};

export default SimplifiedTableDesigner;