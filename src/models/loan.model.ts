import type { Client } from "./client.model";

export interface Loan {
  id: number;
  client_id: number;
  requested_amount: number;
  approved_amount?: number;
  loan_duration?: number;
  payment_mode?: "weekly" | "monthly";
  payment_schedule_start?: Date;
  status:
    | "registered"
    | "captured"
    | "approved"
    | "disbursed"
    | "active"
    | "completed"
    | "defaulted";
  phase: 1 | 2 | 3 | 4;
  registered_by: number;
  captured_by?: number;
  approved_by?: number;
  disbursed_by?: number;
  disbursement_method?: string;
  disbursement_notes?: string;
  registration_date: Date;
  capturing_date?: Date;
  approval_date?: Date;
  disbursement_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoanRepayment {
  id: number;
  loan_id: number;
  amount: number;
  payment_date: Date;
  due_date: Date;
  status: "pending" | "paid" | "overdue";
  received_by?: number;
  created_at: Date;
}

export interface CreateLoanRequest {
  client_id: number;
  requested_amount: number;
}

export interface ApproveLoanRequest {
  approved_amount: number;
  loan_duration: string;
  payment_mode: "weekly" | "monthly";
  payment_start_date: string;
  payment_end_date: string;
  processing_fee: number;
  interest_rate: number;
}

export interface DisburseLoanRequest {
  disbursement_method: "cash" | "bank_transfer" | "mobile_money" | "cheque";
  disbursement_notes?: string;
}

export interface LoanWithClient extends Loan {
  client: Client;
}

// Structured loan response format
export interface StructuredLoanResponse {
  id: number;
  registered: {
    client_id: number;
    client_name: string;
    client_contact: string;
    client_email?: string;
    client_location: string;
    client_landmark?: string;
    client_business?: string;
    requested_amount: number;
    registered_by: number;
    registered_by_name?: string;
    registration_date: Date;
  };
  captured: {
    captured_by?: number;
    captured_by_name?: string;
    capturing_date?: Date;
    dob?: string;
    marital_status?: string;
    occupation?: string;
    profile_image?: string;
    id_type?: string;
    id_number?: string;
    id_front_image?: string;
    id_back_image?: string;
    witnesses: any[];
    business_locations: any[];
    residences: any[];
  };
  approved: {
    approved_amount?: number;
    loan_duration?: number;
    payment_mode?: "weekly" | "monthly";
    processing_fee?: number;
    interest_rate?: number;
    payment_start_date?: Date;
    payment_end_date?: Date;
    approved_by?: number;
    approved_by_name?: string;
    approval_date?: Date;
  };
  disbursement: {
    disbursed_by?: number;
    disbursed_by_name?: string;
    disbursement_date?: Date;
    disbursement_method?: string;
    disbursement_notes?: string;
  };
  loan_status: {
    status: string;
    phase: number;
    payment_schedule_start?: Date;
  };
  created_at: Date;
  updated_at: Date;
}
