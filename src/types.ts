export interface Organization {
  id: string;
  name: string;
  plan_tier: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface User {
  id: string;
  org_id: string | null;
  role: "driver" | "fleet_manager" | "admin";
  name: string;
  phone: string;
  preferred_language: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  org_id: string;
  registration_number: string;
  make: "Tata" | "Ashok Leyland" | "Mahindra" | "Other";
  model: string;
  year: number;
  assigned_driver_id: string | null;
  mileage: number;
  last_service_date: string;
}

export interface FaultReport {
  id: string;
  vehicle_id: string;
  driver_id: string;
  timestamp: string;
  symptom_text_hindi: string;
  symptom_text_english: string;
  acoustic_signal_class: "normal" | "knock" | "squeal" | "misfire" | null;
  severity: "drive" | "caution" | "stop_immediately";
  diagnosis: string;
  recommended_action: string;
  estimated_cost_range: string;
  synced_at: string | null; // null means pending local sync
  agent_trace_json: string; // JSON string representing the multi-agent trace
}

export interface FleetAlert {
  id: string;
  org_id: string;
  pattern_description: string;
  related_fault_report_ids: string[];
  created_at: string;
  resolved: boolean;
}

export interface ServiceCenter {
  id: string;
  name: string;
  location: string;
  vehicle_makes_supported: string[];
}

export interface FatigueEvent {
  id: string;
  driver_id: string;
  timestamp: string;
  ear_value: number;
  duration_seconds: number;
  severity: "caution" | "critical";
  driver_name?: string;
  vehicle_reg?: string;
}
