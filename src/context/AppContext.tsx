'use client';
import { createContext, useContext, useReducer } from 'react';

const AppStateContext = createContext<any>(null);

function appReducer(state: any, action: any) {
  switch (action.type) {
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.job] };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.customer] };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, { jobs: [], customers: [], invoices: [] });
  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => useContext(AppStateContext);
