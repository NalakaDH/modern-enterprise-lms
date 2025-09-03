import React from 'react';
import { ClipboardList, Search, Filter } from 'lucide-react';

const Gradebook = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <p className="text-gray-600">Manage student grades and assessments</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search students or courses..."
                  className="input pl-10 w-64"
                />
              </div>
              <button className="btn btn-outline btn-sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>
          </div>

          <div className="text-center py-12">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Gradebook</h3>
            <p className="mt-1 text-sm text-gray-500">
              This feature is under development. Gradebook functionality will be available soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gradebook;
