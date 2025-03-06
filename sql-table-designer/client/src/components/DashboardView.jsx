import React from 'react';

const DashboardView = ({ onCreateTable, onManageTables }) => {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Management Dashboard</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Table Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Create New Table
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      Design and create database tables
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <button
                onClick={onCreateTable}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Table Designer
              </button>
            </div>
          </div>
        </div>

        {/* Manage Data Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                  <path strokeLinecap="round" strokeWidth={2} d="M4 7h16" />
                  <path strokeLinecap="round" strokeWidth={2} d="M8 4v6" />
                  <path strokeLinecap="round" strokeWidth={2} d="M16 4v6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Manage Table Data
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      View, add, edit, and delete records
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <button
                onClick={onManageTables}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Data Grid
              </button>
            </div>
          </div>
        </div>

        {/* Manage Jobs Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a2 2 0 012-2h3.5a2 2 0 012 2v2h2V5a2 2 0 012-2H18a2 2 0 012 2v2m-2 0v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7h16z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Job Management
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      View, assign and resolve job failures
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-5">
              <button
                onClick={onManageTables}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Manage Jobs
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardView;