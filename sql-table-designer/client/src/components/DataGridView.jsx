import React, { useState, useEffect } from 'react';

const DataGridView = ({ table, onBack }) => {
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 15;
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentRow, setCurrentRow] = useState({});
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Helper function to display debug information
  const logDebug = (operation, info) => {
    console.log(`DEBUG [${operation}]:`, info);
    setDebugInfo(prev => ({
      ...prev,
      [operation]: info
    }));
  };

  useEffect(() => {
    if (table) {
      fetchTableStructure();
      fetchTableData();
    }
  }, [table]);

  // Map SQL type to our user-friendly types
  const mapSqlTypeToFriendlyType = (sqlType) => {
    if (!sqlType) return 'Text';
    
    sqlType = sqlType.toUpperCase();
    
    if (sqlType.includes('VARCHAR') || sqlType.includes('CHAR') || sqlType.includes('TEXT')) {
      return sqlType.includes('MAX') ? 'Long Text' : 'Text';
    }
    if (sqlType.includes('INT') || sqlType.includes('NUMERIC') || sqlType.includes('DECIMAL') || 
        sqlType.includes('FLOAT') || sqlType.includes('REAL') || sqlType.includes('MONEY')) {
      return 'Number';
    }
    if (sqlType.includes('DATE') || sqlType.includes('TIME')) {
      return 'Date';
    }
    if (sqlType.includes('BIT') || sqlType.includes('BOOLEAN')) {
      return 'True/False';
    }
    
    return 'Text'; // Default
  };

  // Fetch table structure (columns)
  const fetchTableStructure = async () => {
    setIsLoading(true);
    setError('');
    try {
      const url = `http://localhost:5000/api/tables/${table.id}/structure`;
      logDebug('fetchTableStructure', { url });
      
      const response = await fetch(url);
      const result = await response.json();
      
      logDebug('fetchTableStructure:response', {
        status: response.status,
        result: result
      });
      
      if (response.ok) {
        // Map the SQL types to our friendly types
        const mappedColumns = (result.columns || []).map(col => ({
          ...col,
          friendlyType: mapSqlTypeToFriendlyType(col.dataType)
        }));
        
        // Find the primary key column
        const pkColumn = mappedColumns.find(col => col.isPrimaryKey);
        if (pkColumn) {
          setPrimaryKeyColumn(pkColumn.name);
          logDebug('primaryKey', { name: pkColumn.name, type: pkColumn.dataType });
        } else {
          // Fallback: check for columns ending with "id" (case insensitive)
          const idColumn = mappedColumns.find(col => 
            col.name.toLowerCase().endsWith('id')
          );
          if (idColumn) {
            setPrimaryKeyColumn(idColumn.name);
            logDebug('fallbackPrimaryKey', { name: idColumn.name, type: idColumn.dataType });
          } else {
            // No ID column found - this will cause issues
            logDebug('noPrimaryKey', { message: 'No primary key identified', columns: mappedColumns.map(c => c.name) });
            setError('Warning: No primary key column found in this table. Updates and deletes may not work correctly.');
          }
        }
        
        setColumns(mappedColumns);
        initializeEmptyRow(mappedColumns);
      } else {
        setError(result.error || 'Failed to fetch table structure');
      }
    } catch (error) {
      setError(`Error connecting to the server: ${error.message}`);
      console.error('fetchTableStructure error:', error);
      logDebug('fetchTableStructureError', { message: error.message, stack: error.stack });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize empty row with default values based on data type
  const initializeEmptyRow = (cols) => {
    const emptyRow = {};
    cols.forEach(col => {
      // Set appropriate default values based on data type
      const friendlyType = col.friendlyType || mapSqlTypeToFriendlyType(col.dataType);
      
      switch (friendlyType) {
        case 'Text':
        case 'Long Text':
          emptyRow[col.name] = '';
          break;
        case 'Number':
          emptyRow[col.name] = null;
          break;
        case 'Date':
          emptyRow[col.name] = '';
          break;
        case 'True/False':
          emptyRow[col.name] = false;
          break;
        default:
          emptyRow[col.name] = '';
      }
    });
    setCurrentRow(emptyRow);
  };

  // Fetch table data
  const fetchTableData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const url = `http://localhost:5000/api/tables/${table.id}/data`;
      logDebug('fetchTableData', { url });
      
      const response = await fetch(url);
      const result = await response.json();
      
      logDebug('fetchTableData:response', {
        status: response.status,
        resultSize: result.data ? result.data.length : 0
      });
      
      if (response.ok) {
        setData(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch table data');
      }
    } catch (error) {
      setError(`Error connecting to the server: ${error.message}`);
      console.error('fetchTableData error:', error);
      logDebug('fetchTableDataError', { message: error.message, stack: error.stack });
    } finally {
      setIsLoading(false);
    }
  };

  // Open the modal for editing a row
  const openEditModal = (rowIndex) => {
    const actualRowIndex = currentPage * rowsPerPage + rowIndex;
    setCurrentRow({...data[actualRowIndex]});
    setCurrentRowIndex(actualRowIndex);
    setModalMode('edit');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  // Open the modal for adding a new row
  const openAddModal = () => {
    initializeEmptyRow(columns);
    setModalMode('add');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setValidationErrors({});
  };

  // Handle input changes in the modal form
  const handleInputChange = (columnName, value) => {
    setCurrentRow({
      ...currentRow,
      [columnName]: value
    });
    
    // Clear validation error for this field if it exists
    if (validationErrors[columnName]) {
      const newErrors = {...validationErrors};
      delete newErrors[columnName];
      setValidationErrors(newErrors);
    }
  };

  // Validate a single field
  const validateField = (column, value) => {
    const isPrimaryKey = column.isPrimaryKey || (primaryKeyColumn && column.name === primaryKeyColumn);
    
    // Skip validation for primary key fields - they will be auto-generated
    if (isPrimaryKey && modalMode === 'add') {
      return null;
    }
    
    if (!column.isNullable && (value === null || value === undefined || value === '')) {
      return `${column.name} cannot be empty`;
    }
    
    const friendlyType = column.friendlyType || mapSqlTypeToFriendlyType(column.dataType);
    
    switch (friendlyType) {
      case 'Number':
        if (value !== '' && value !== null && isNaN(Number(value))) {
          return `${column.name} must be a valid number`;
        }
        break;
      case 'Date':
        if (value !== '' && value !== null && isNaN(Date.parse(value))) {
          return `${column.name} must be a valid date`;
        }
        break;
      default:
        return null;
    }
    
    return null;
  };

  // Validate all fields
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    columns.forEach(column => {
      const error = validateField(column, currentRow[column.name]);
      if (error) {
        errors[column.name] = error;
        isValid = false;
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  // Save the current row (add or edit)
  const saveRow = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      let url;
      let method;
      let rowToSave = {...currentRow};
      
      // For add mode, use POST to the base data endpoint
      if (modalMode === 'add') {
        method = 'POST';
        url = `http://localhost:5000/api/tables/${table.id}/data`;
        
        // Remove primary key field for 'add' mode so it will be auto-generated
        if (primaryKeyColumn) {
          delete rowToSave[primaryKeyColumn];
        }
      } else { // edit mode
        method = 'PUT';
        
        if (!primaryKeyColumn) {
          throw new Error('Cannot update row: No primary key column identified');
        }
        
        const pkValue = currentRow[primaryKeyColumn];
        if (pkValue === undefined || pkValue === null) {
          throw new Error(`Cannot update row: Missing primary key value in column "${primaryKeyColumn}"`);
        }
        
        // Add pkColumn as a query parameter
        url = `http://localhost:5000/api/tables/${table.id}/data/${pkValue}?pkColumn=${primaryKeyColumn}`;
      }
  
      // Log the request info for debugging
      logDebug('saveRow:request', { 
        url, 
        method, 
        data: rowToSave,
        primaryKey: primaryKeyColumn,
        primaryKeyValue: rowToSave[primaryKeyColumn],
        mode: modalMode
      });
      
      // Make the request
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowToSave)
      });
        
      // Try to parse response as JSON
      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { text };
      }
        
      // Log the response for debugging
      logDebug('saveRow:response', { 
        status: response.status, 
        ok: response.ok,
        result
      });
        
      if (response.ok) {
        closeModal();
        fetchTableData();
      } else {
        let errorMsg = '';
        if (result && result.error) {
          errorMsg = result.error;
        } else if (result && result.message) {
          errorMsg = result.message;
        } else if (result && result.text) {
          errorMsg = result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '');
        } else {
          errorMsg = `Server returned ${response.status}: ${response.statusText}`;
        }
          
        setError(`Failed to ${modalMode === 'add' ? 'add' : 'update'} row: ${errorMsg}`);
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
      console.error('saveRow error:', error);
      logDebug('saveRowError', { message: error.message, stack: error.stack });
    } finally {
      setIsSaving(false);
    }
  };
  // Delete row
  const deleteRow = async (row) => {
    if (!primaryKeyColumn) {
      setError('Cannot delete row: No primary key column identified');
      return;
    }
    
    const pkValue = row[primaryKeyColumn];
    if (pkValue === undefined || pkValue === null) {
      setError(`Cannot delete row: Missing primary key value in column "${primaryKeyColumn}"`);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this row? This action cannot be undone.')) {
      setIsDeleting(true);
      setError('');
      
      try {
        // MATCH API FORMAT: Use the primary key value directly in the URL
        const url = `http://localhost:5000/api/tables/${table.id}/data/${pkValue}?pkColumn=${primaryKeyColumn}`;
        
        // Log the delete request for debugging
        logDebug('deleteRow:request', { 
          url,
          primaryKey: primaryKeyColumn,
          primaryKeyValue: pkValue,
          rowData: row
        });
        
        const response = await fetch(url, {
          method: 'DELETE'
        });
        
        // Try to parse response
        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          result = await response.json();
        } else {
          const text = await response.text();
          result = { text };
        }
        
        // Log the response for debugging
        logDebug('deleteRow:response', { 
          status: response.status, 
          ok: response.ok,
          result
        });
        
        if (response.ok) {
          fetchTableData();
        } else {
          let errorMsg = '';
          if (result && result.error) {
            errorMsg = result.error;
          } else if (result && result.message) {
            errorMsg = result.message;
          } else if (result && result.text) {
            errorMsg = result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '');
          } else {
            errorMsg = `Server returned ${response.status}: ${response.statusText}`;
          }
          
          setError(`Failed to delete row: ${errorMsg}`);
        }
      } catch (error) {
        setError(`Error connecting to the server: ${error.message}`);
        console.error('deleteRow error:', error);
        logDebug('deleteRowError', { message: error.message, stack: error.stack });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Format cell value for display
  const formatCellValue = (value, friendlyType) => {
    if (value === null || value === undefined) {
      return '';
    }
    
    switch (friendlyType) {
      case 'Date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'True/False':
        return value === true ? 'Yes' : value === false ? 'No' : '';
      default:
        return value;
    }
  };

  // Test the API directly with simple GET request
  const testAPI = async () => {
    try {
      const urls = [
        `http://localhost:5000/api/tables/${table.id}/data`,
        `http://localhost:5000/api/tables`
      ];
      
      const results = [];
      
      for (const url of urls) {
        try {
          const startTime = Date.now();
          const response = await fetch(url);
          const endTime = Date.now();
          
          let result;
          try {
            result = await response.json();
          } catch (e) {
            const text = await response.text();
            result = { text: text.substring(0, 100) };
          }
          
          results.push({
            url,
            status: response.status,
            time: endTime - startTime,
            ok: response.ok,
            result: result
          });
        } catch (err) {
          results.push({
            url,
            error: err.message
          });
        }
      }
      
      logDebug('apiConnectionTest', results);
      setError(null);
    } catch (error) {
      setError(`API test failed: ${error.message}`);
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {table ? `Data for ${table.name}` : 'Loading...'}
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={testAPI}
            className="px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            Test API Connection
          </button>
          <button
            onClick={onBack}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Table List
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center py-4">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25" cx="12" cy="12"
              r="10" stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 
                 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      )}

      {/* Debug Info */}
      {primaryKeyColumn && (
        <div className="mb-4 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">
          <strong>Debug Info:</strong> Primary key column: <span className="font-semibold">{primaryKeyColumn}</span>
        </div>
      )}

      {/* Detailed Debug Info (Collapsible) */}
      {debugInfo && (
        <details className="mb-4 border border-gray-200 rounded-md">
          <summary className="px-3 py-2 bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer">
            Debug Information (Click to expand)
          </summary>
          <div className="p-3 bg-gray-50 text-xs font-mono overflow-x-auto">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </details>
      )}

      {/* Add New Row Button */}
      {!isLoading && (
        <div className="mb-4">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add New Row
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && columns.length > 0 && (
        <div className="w-full shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.name}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                               uppercase tracking-wider"
                  >
                    {column.name}
                    {column.name === primaryKeyColumn && (
                      <span className="ml-1 text-xs text-blue-500">PK</span>
                    )}
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 
                             uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    No data found. Add a new row to get started.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr key={primaryKeyColumn ? row[primaryKeyColumn] : index} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column.name} className="px-6 py-4">
                        <div className={`text-sm text-gray-900 ${column.friendlyType === 'Long Text' ? '' : 'whitespace-nowrap'}`}>
                          {formatCellValue(row[column.name], column.friendlyType)}
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(index)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRow(row)}
                          disabled={isDeleting}
                          className={`text-red-600 hover:text-red-900 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && data.length > 0 && (
        <div className="mt-4 flex justify-end items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 
                       hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 
                       hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            // Updated Modal Panel with responsive width and two-column layou

            {/* Modal panel */}
            <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${columns.length > 5 ? 'sm:max-w-4xl' : 'sm:max-w-xl'} w-full`}>
              <div className="bg-white px-6 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-6" id="modal-title">
                  {modalMode === 'add' ? 'Add New Row' : 'Edit Row'}
                </h3>
                
                {/* Responsive grid layout */}
                <div className={`${columns.length > 5 ? 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5' : 'space-y-6'}`}>
                  {columns.map((column) => {
                    const isPrimaryKey = column.isPrimaryKey || (primaryKeyColumn && column.name === primaryKeyColumn);
                    const friendlyType = column.friendlyType || mapSqlTypeToFriendlyType(column.dataType);
                    const value = currentRow[column.name];
                    const hasError = !!validationErrors[column.name];
                    
                    // Enhanced base classes for all inputs
                    const baseClasses = `block w-full rounded-md shadow-sm text-base py-3 px-4
                                        ${hasError 
                                          ? 'border-2 border-red-400 focus:border-red-500 focus:ring-red-500' 
                                          : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`;
                    
                    return (
                      <div key={column.name} className={columns.length > 5 ? '' : 'mb-5'}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {column.name}
                          {!column.isNullable && !isPrimaryKey && <span className="text-red-500 ml-1">*</span>}
                          {isPrimaryKey && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Primary Key</span>}
                        </label>
                        
                        {/* Field type rendering code stays the same as before */}
                        {isPrimaryKey && modalMode === 'add' ? (
                          <input
                            type="text"
                            value={value || ''}
                            className="block w-full rounded-md border border-gray-200 bg-gray-100 text-gray-500 py-3 px-4 text-base cursor-not-allowed"
                            readOnly
                            placeholder="Auto-generated ID"
                          />
                        ) : isPrimaryKey && modalMode === 'edit' ? (
                          <input
                            type="text"
                            value={value || ''}
                            className="block w-full rounded-md border border-gray-200 bg-gray-100 text-gray-500 py-3 px-4 text-base cursor-not-allowed"
                            readOnly
                          />
                        ) : 
                        friendlyType === 'Long Text' ? (
                          <textarea
                            value={value || ''}
                            onChange={(e) => handleInputChange(column.name, e.target.value)}
                            className={`${baseClasses} min-h-[120px] resize-y`}
                            placeholder={`Enter ${column.name}`}
                          />
                        ) : friendlyType === 'Number' ? (
                          <input
                            type="number"
                            value={value !== null && value !== undefined ? value : ''}
                            onChange={(e) => handleInputChange(column.name, e.target.value === '' ? null : Number(e.target.value))}
                            className={baseClasses}
                            placeholder={`Enter ${column.name}`}
                            step="any"
                          />
                        ) : friendlyType === 'Date' ? (
                          <div className="relative">
                            <input
                              type="date"
                              value={value ? new Date(value).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleInputChange(column.name, e.target.value)}
                              className={`${baseClasses} pr-10`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        ) : friendlyType === 'True/False' ? (
                          <div className="flex items-center">
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                              <input
                                type="checkbox"
                                id={`checkbox-${column.name}`}
                                checked={value === true}
                                onChange={(e) => handleInputChange(column.name, e.target.checked)}
                                className="sr-only"
                              />
                              <label
                                htmlFor={`checkbox-${column.name}`}
                                className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                                  value ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                                    value ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                ></span>
                              </label>
                            </div>
                            <span className="text-base text-gray-700 font-medium">
                              {value ? 'Yes' : 'No'}
                            </span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleInputChange(column.name, e.target.value)}
                            className={baseClasses}
                            placeholder={`Enter ${column.name}`}
                          />
                        )}
                        
                        {validationErrors[column.name] && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors[column.name]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-5 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveRow}
                  disabled={isSaving}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-5 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGridView;