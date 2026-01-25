/**
 * REST API client for backend services.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Contact information from parsed resume.
 */
export interface ContactInfo {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

/**
 * Work experience entry.
 */
export interface Experience {
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  highlights: string[];
}

/**
 * Education entry.
 */
export interface Education {
  institution: string;
  degree: string;
  field: string | null;
  graduation_date: string | null;
}

/**
 * Parsed resume with structured data.
 */
export interface ParsedResume {
  contact: ContactInfo;
  summary: string | null;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  raw_text: string;
}

/**
 * API error response.
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Upload and parse a PDF resume.
 *
 * @param file - PDF file to upload
 * @returns Parsed resume with structured data
 * @throws APIError if upload or parsing fails
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/resume/parse`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new APIError(
      error.detail || "Failed to parse resume",
      response.status,
      error.detail
    );
  }

  return response.json();
}
