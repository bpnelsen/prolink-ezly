'use client'
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, MapPin } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';

const EMPLOYEES = [
  {
    name: 'Brian',
    hours: '40 hrs / wk',
    jobs: [
      { day: 'Mon', start: 8, end: 10, customer: 'Brian Nelsen', type: 'Kitchen Remodel', address: '123 Main St', color: 'bg-teal-100 border-teal-300 text-teal-800' },
      { day: 'Wed', start: 9, end: 12, customer: 'Sarah Connor', type: 'Bathroom Fix', address: '456 Oak Dr', color: 'bg-blue-100 border-blue-300 text-blue-800' },
      { day: 'Thu', start: 13, end: 15, customer: 'John Smith', type: 'Deck Stain', address: '789 Pine Ct', color: 'bg-amber-100 border-amber-300 text-amber-800' },
      { day: 'Fri', start: 8, end: 11, customer: 'Emily Davis', type: 'Plumbing Repair', address: '321 Elm St', color: 'bg-purple-100 border-purple-300 text-purple-800' },
    ],
  },
  {
    name: 'Steve',
    hours: '38 hrs / wk',
    jobs: [
      { day: 'Mon', start: 10, end: 13, customer: 'Mike Johnson', type: 'Electrical Panel', address: '555 Birch Ave', color: 'bg-orange-100 border-orange-300 text-orange-800' },
      { day: 'Tue', start: 8, end: 10, customer: 'Lisa Wong', type: 'Outlet Install', address: '777 Cedar Ln', color: 'bg-teal-100 border-teal-300 text-teal-800' },
      { day: 'Thu', start: 14, end: 17, customer: 'Tom Harris', type: 'Rewiring', address: '888 Spruce Dr', color: 'bg-rose-100 border-rose-300 text-rose-800' },
    ],
  },
  {
    name: 'Mike',
    hours: '40 hrs / wk',
    jobs: [
      { day: 'Tue', start: 9, end: 11, customer: 'Anna Lee', type: 'Drywall Patch', address: '444 Walnut St', color: 'bg-blue-100 border-blue-300 text-blue-800' },
      { day: 'Wed', start: 13, end: 16, customer: 'Kevin Brown', type: 'Roof Inspection', address: '222 Maple Ct', color: 'bg-amber-100 border-amber-300 text-amber-800' },
      { day: 'Fri', start: 10, end: 14, customer: 'Rachel Green', type: 'Full Remodel', address: '999 Oak Blvd', color: 'bg-purple-100 border-purple-300 text-purple-800' },
    ],
  },
  {
    name: 'Sarah',
    hours: '32 hrs / wk',
    jobs: [
      { day: 'Mon', start: 12, end: 14, customer: 'David Park', type: 'HVAC Service', address: '111 Pine Way', color: 'bg-teal-100 border-teal-300 text-teal-800' },
      { day: 'Wed', start: 8, end: 10, customer: 'Jenny Cruz', type: 'AC Repair', address: '333 Ash Rd', color: 'bg-orange-100 border-orange-300 text-orange-800' },
      { day: 'Thu', start: 10, end: 13, customer: 'Mark Olsen', type: 'Furnace Install', address: '666 Fir Dr', color: 'bg-rose-100 border-rose-300 text-rose-800' },
    ],
  },
];

const WORK_HOURS = Array.from({ length: 11 }, (_, i) => {
  const hour = i + 8; // 8 AM to 6 PM
  const label = hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
  return { hour, label };
});

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DispatchCalendar() {
  const [currentWeek] = useState('March 26 - April 1');
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0].name);

  const employee = EMPLOYEES.find(e => e.name === selectedEmployee) || EMPLOYEES[0];

  const getJobForSlot = (day: string, hour: number) => {
    return employee.jobs.find(j => j.day === day && hour >= j.start && hour < j.end);
  };

  const isJobStart = (day: string, hour: number) => {
    return employee.jobs.find(j => j.day === day && j.start === hour);
  };

  const getJobSpan = (day: string, hour: number) => {
    const job = employee.jobs.find(j => j.day === day && j.start === hour);
    return job ? job.end - job.start : 1;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8 page-enter">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[{ label: 'Dispatch', href: '/dispatch' }]} />
        
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Master Dispatch</h2>
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <button className="p-1 text-gray-500 hover:text-teal-600"><ChevronLeft size={20}/></button>
            <span className="font-bold text-sm w-48 text-center text-gray-700">{currentWeek}</span>
            <button className="p-1 text-gray-500 hover:text-teal-600"><ChevronRight size={20}/></button>
          </div>
        </header>

        {/* Employee Selector */}
        <div className="card overflow-hidden">
          <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-teal-600" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {EMPLOYEES.map(emp => (
                  <option key={emp.name} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full font-bold text-gray-600">{employee.hours}</span>
              <span className="text-xs bg-teal-50 px-3 py-1.5 rounded-full font-bold text-teal-700 border border-teal-200">{employee.jobs.length} jobs this week</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex overflow-x-auto">
            {/* Time Column */}
            <div className="shrink-0 w-20 border-r border-gray-200 bg-white">
              <div className="h-10 border-b border-gray-200"></div>
              {WORK_HOURS.map(({ hour, label }) => (
                <div key={hour} className="h-14 border-b border-gray-100 flex items-start justify-end pr-3 pt-1">
                  <span className="text-[10px] font-semibold text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {DAYS.map(day => (
              <div key={day} className="flex-1 border-r border-gray-100 min-w-[130px]">
                <div className="h-10 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  {day}
                </div>
                <div className="relative">
                  {WORK_HOURS.map(({ hour }) => {
                    const job = getJobForSlot(day, hour);
                    const isStart = isJobStart(day, hour);
                    const span = getJobSpan(day, hour);

                    return (
                      <div key={hour} className="h-14 border-b border-gray-50 relative">
                        {isStart && job && (
                          <div
                            className={`absolute inset-x-1 top-1 rounded-lg border px-2 py-1.5 z-10 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${job.color}`}
                            style={{ height: `${span * 56 - 8}px` }}
                          >
                            <p className="text-[11px] font-bold truncate">{job.customer}</p>
                            <p className="text-[9px] opacity-75 truncate">{job.type}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin size={8} className="opacity-60 shrink-0" />
                              <p className="text-[8px] opacity-60 truncate">{job.address}</p>
                            </div>
                          </div>
                        )}
                        {!job && (
                          <div className="w-full h-full hover:bg-teal-50/30 transition-colors cursor-pointer" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
