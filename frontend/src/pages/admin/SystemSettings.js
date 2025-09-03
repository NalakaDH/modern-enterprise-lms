import React from 'react';
import { Settings, Save } from 'lucide-react';

const SystemSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure system-wide parameters and preferences</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">System Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              This feature is under development. System settings functionality will be available soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
