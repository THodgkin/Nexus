import React, { useState, useEffect } from 'react';

const DatabaseConfigModal = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [config, setConfig] = useState({
    host: '',
    path: '',
    token: '',
    catalog: '',
    schema: 'default',
    cluster_id: ''
  });

  // Initialize form with current config
  useEffect(() => {
    if (currentConfig && currentConfig.databricks) {
      setConfig(currentConfig.databricks);
    }
  }, [currentConfig, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ config });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Databricks Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Host</label>
              <input
                type="text"
                name="host"
                value={config.host}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g., adb-123456789.1.azuredatabricks.net"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Path</label>
              <input
                type="text"
                name="path"
                value={config.path}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g., /sql/1.0/warehouses/abcdef1234567890"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Personal Access Token (PAT)</label>
              <input
                type="password"
                name="token"
                value={config.token}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Databricks Personal Access Token"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Catalog</label>
                <input
                  type="text"
                  name="catalog"
                  value={config.catalog}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g., main"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Schema</label>
                <input
                  type="text"
                  name="schema"
                  value={config.schema}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g., default"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Cluster ID (Optional)</label>
              <input
                type="text"
                name="cluster_id"
                value={config.cluster_id}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Optional: Enter cluster ID if not using SQL warehouse"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DatabaseConfigModal;