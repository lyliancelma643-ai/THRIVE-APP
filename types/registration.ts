export interface ChildFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  sport: string;
}

export interface ParentRegistrationStep1 {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface ParentRegistrationStep2 {
  family_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  children_count: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface ParentRegistrationStep3 {
  children: ChildFormData[];
}

export interface FullRegistration
  extends ParentRegistrationStep1,
    ParentRegistrationStep2,
    ParentRegistrationStep3 {
  agreed_to_terms: boolean;
}
