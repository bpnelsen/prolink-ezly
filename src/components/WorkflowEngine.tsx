'use client'

import React from 'react';
import { Clock, DollarSign, CheckCircle, FileText, CalendarDays } from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ReactNode;
}

const steps: WorkflowStep[] = [
  { id: 'estimate', name: 'Estimate', status: 'completed', icon: <FileText size={18} /> },
  { id: 'schedule', name: 'Schedule', status: 'current', icon: <CalendarDays size={18} /> },
  { id: 'start', name: 'Start', status: 'pending', icon: <Clock size={18} /> },
  { id: 'invoice', name: 'Invoice', status: 'pending', icon: <DollarSign size={18} /> },
  { id: 'pay', name: 'Pay', status: 'pending', icon: <CheckCircle size={18} /> },
];

export default function WorkflowEngine({ currentStatus }: { currentStatus: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Job Workflow</h3>
      
      <div className="grid grid-cols-5 gap-0 md:gap-4 items-start">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center group ${step.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
              <div className={`p-2 md:p-3 rounded-full mb-1 md:mb-2 border-2 transition-all ${
                step.status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                step.status === 'current' ? 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-50' :
                'bg-gray-100 border-gray-200 text-gray-400'
              }`}>
                {React.cloneElement(step.icon as React.ReactElement, { size: 16 })}
              </div>
              <span className={`text-[10px] md:text-xs font-medium text-center ${step.status === 'current' ? 'text-blue-700' : 'text-gray-600'}`}>{step.name}</span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`hidden md:block h-0.5 mt-5 ${
                steps[index+1].status !== 'pending' ? 'bg-blue-200' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="mt-8 flex gap-4">
        <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700">
          Mark as {steps.find(s => s.status === 'current')?.name} Complete
        </button>
      </div>
    </div>
  );
}
