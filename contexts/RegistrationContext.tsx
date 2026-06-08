import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  ParentRegistrationStep1,
  ParentRegistrationStep2,
  ChildFormData,
} from '../types/registration';

interface RegistrationData {
  step1: Partial<ParentRegistrationStep1>;
  step2: Partial<ParentRegistrationStep2>;
  children: ChildFormData[];
  agreed_to_terms: boolean;
}

interface RegistrationContextType {
  data: RegistrationData;
  setStep1: (d: Partial<ParentRegistrationStep1>) => void;
  setStep2: (d: Partial<ParentRegistrationStep2>) => void;
  setChildren: (c: ChildFormData[]) => void;
  setAgreedToTerms: (v: boolean) => void;
  resetRegistration: () => void;
}

const defaultData: RegistrationData = {
  step1: {},
  step2: {},
  children: [],
  agreed_to_terms: false,
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegistrationData>(defaultData);

  const setStep1 = (d: Partial<ParentRegistrationStep1>) =>
    setData(prev => ({ ...prev, step1: { ...prev.step1, ...d } }));

  const setStep2 = (d: Partial<ParentRegistrationStep2>) =>
    setData(prev => ({ ...prev, step2: { ...prev.step2, ...d } }));

  const setChildren = (c: ChildFormData[]) =>
    setData(prev => ({ ...prev, children: c }));

  const setAgreedToTerms = (v: boolean) =>
    setData(prev => ({ ...prev, agreed_to_terms: v }));

  const resetRegistration = () => setData(defaultData);

  return (
    <RegistrationContext.Provider
      value={{ data, setStep1, setStep2, setChildren, setAgreedToTerms, resetRegistration }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
