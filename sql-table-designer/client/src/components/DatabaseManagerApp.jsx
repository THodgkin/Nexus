import React, { useState, useEffect } from 'react';
import TableDesigner from './TableDesigner';
import DashboardView from './DashboardView';
import TableSelectorView from './TableSelectorView';
import DataGridView from './DataGridView';
import DatabaseConfigModal from './DatabaseConfigModal';

const DatabaseManagerApp = () => {
    const [activeView, setActiveView] = useState('dashboard');
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [dbConfig, setDbConfig] = useState({
      databricks: {
        host: '',
        path: '',
        token: '',
        catalog: '',
        schema: 'default',
        cluster_id: ''
      }
    });
    const [activeDbLabel, setActiveDbLabel] = useState('Databricks');
  
    // Fetch tables on initial load
    useEffect(() => {
      fetchTables();
      // Try to load saved configuration from local storage
      const savedConfig = localStorage.getItem('dbConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setDbConfig(parsedConfig);
          setActiveDbLabel('Databricks');
        } catch (e) {
          console.error('Failed to parse saved configuration:', e);
        }
      }
    }, []);
  
    // Fetch all tables from the database
    const fetchTables = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const response = await fetch('http://localhost:5000/api/tables');
        const data = await response.json();
        
        if (response.ok) {
          setTables(data.tables || []);
        } else {
          setError(data.error || 'Failed to fetch tables');
        }
      } catch (error) {
        setError('Error connecting to the server');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
  
    // Filter tables based on search query
    const filteredTables = tables.filter(table => 
      table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    // Handle table selection and navigate to data grid
    const handleTableSelect = async (table) => {
      setSelectedTable(table);
      setActiveView('dataGrid');
    };
  
    // Navigate back to dashboard
    const navigateToDashboard = () => {
      setActiveView('dashboard');
      setSelectedTable(null);
    };

    // Handle saving database configuration
    const handleSaveConfig = async (newConfig) => {
      setIsLoading(true);
      setError('');
      
      try {
        const response = await fetch('http://localhost:5000/api/configure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config: newConfig.config }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Update the local state with the new configuration
          setDbConfig(newConfig.config);
          
          // Save to local storage (excluding sensitive information)
          const configForStorage = {
            ...newConfig.config,
            token: '' // Replace token with empty string for storage
          };
          localStorage.setItem('dbConfig', JSON.stringify(configForStorage));
          
          // Close the modal
          setIsConfigModalOpen(false);
          
          // Refresh tables
          fetchTables();
        } else {
          setError(data.error || 'Failed to update configuration');
        }
      } catch (error) {
        setError('Error connecting to the server');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
  
    // Render the current view based on state
    const renderView = () => {
      switch (activeView) {
        case 'dashboard':
          return <DashboardView 
                   onCreateTable={() => setActiveView('tableDesigner')} 
                   onManageTables={() => setActiveView('tableSelector')}
                 />;
        case 'tableDesigner':
          return <TableDesigner onBack={navigateToDashboard} onTableCreated={fetchTables} />;
        case 'tableSelector':
          return <TableSelectorView 
                   tables={filteredTables} 
                   searchQuery={searchQuery}
                   onSearchChange={setSearchQuery}
                   onTableSelect={handleTableSelect}
                   isLoading={isLoading}
                   error={error}
                   onBack={navigateToDashboard}
                 />;
        case 'dataGrid':
          return <DataGridView 
                   table={selectedTable} 
                   onBack={() => setActiveView('tableSelector')}
                 />;
        default:
          return <div>Invalid view</div>;
      }
    };
  
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <nav className="bg-indigo-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-xl font-bold cursor-pointer" onClick={navigateToDashboard}>
                  Databricks Manager
                </span>
                <div className="ml-4 px-3 py-1 bg-indigo-700 rounded-md text-sm">
                  {activeDbLabel}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={navigateToDashboard}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'dashboard' ? 'bg-indigo-700' : 'hover:bg-indigo-500'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveView('tableDesigner')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'tableDesigner' ? 'bg-indigo-700' : 'hover:bg-indigo-500'}`}
                >
                  Create Table
                </button>
                <button 
                  onClick={() => setActiveView('tableSelector')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeView === 'tableSelector' || activeView === 'dataGrid' ? 'bg-indigo-700' : 'hover:bg-indigo-500'}`}
                >
                  Manage Data
                </button>
                <button 
                  onClick={() => setIsConfigModalOpen(true)}
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700"
                >
                  Databricks Config
                </button>
              </div>
            </div>
          </div>
        </nav>
  
        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderView()}
        </main>

        {/* Database Configuration Modal */}
        <DatabaseConfigModal 
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveConfig}
          currentConfig={dbConfig}
          databricksOnly={true} // Add this prop to inform the modal it's Databricks only
        />
      </div>
    );
  };

  export default DatabaseManagerApp;