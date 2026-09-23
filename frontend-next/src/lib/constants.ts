/**
 * Platform-wide geographic and institutional constants.
 */

export const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Other / Outside India",
] as const;

export type IndianStateOrUT = (typeof INDIAN_STATES_AND_UTS)[number];

export const SCHOOL_DESIGNATIONS = [
  "Principal / Head of School",
  "Vice Principal",
  "Director / Trustee / Founder",
  "Dean of Academics",
  "Senior Administrator",
  "Head of Student Wellness / Counselor",
  "IT / Operations Administrator",
  "Other",
] as const;

export type SchoolDesignation = (typeof SCHOOL_DESIGNATIONS)[number];
