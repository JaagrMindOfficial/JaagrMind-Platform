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

/**
 * Tiny filler words skipped when extracting initials.
 * We keep words like "school", "public", "academy" because real-world
 * abbreviations use them: DPS, NPS, SSOT.
 * Mirrors the backend algorithm in utils/schoolcode.go.
 */
const SKIP_WORDS = new Set(["the", "of", "and", "for"]);

/**
 * Generates a client-side preview of a school code from name + city.
 * Uses ALL word initials (skipping only articles/prepositions).
 * The actual unique code is confirmed by the server via the generate-code endpoint.
 *
 * @example generateSchoolCodePreview("Delhi Public School", "Delhi") → "DPS-D"
 * @example generateSchoolCodePreview("Scaler School of Technology", "Bangalore") → "SSOT-B"
 * @example generateSchoolCodePreview("National Public School", "Bangalore") → "NPS-B"
 * @example generateSchoolCodePreview("The Heritage Academy", "Gurgaon") → "HA-G"
 */
export function generateSchoolCodePreview(name: string, city: string): string {
  const cleaned = name.replace(/[^a-zA-Z\s\-']/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "";

  // Extract first letter of every word, skipping only fillers
  let initials = words
    .filter((w) => !SKIP_WORDS.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("");

  // Single-word name: use first 3 alpha chars
  if (initials.length < 2) {
    const alpha = name.replace(/[^a-zA-Z]/g, "");
    initials = alpha.slice(0, 3);
  }

  initials = initials.toUpperCase();

  // Append city initial
  const cityClean = city.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (cityClean) {
    return `${initials}-${cityClean[0]}`;
  }

  return initials;
}
