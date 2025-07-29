# API Endpoint Request & Response Formats

This document provides a concise reference for the request body and response formats for the relevant API endpoints.

---

## 1. GET `/admin/pending-registration`

- **Request Body:** None

- **Response (200 OK):**

[
{
"id": 1,
"email": "user@example.com",
"requested_role": "Interviewer"
},
{
"id": 2,
"email": "anotheruser@example.com",
"requested_role": "HR"
}
]

---

## 2. POST `/admin/approve-registration`

- **Request Body:**

{
"id": 1
}

- **Successful Response (200 OK):**

{
"message": "User approved successfully",
"userId": 1,
"newRole": "Interviewer"
}

- **Error Responses:**

  - `400 Bad Request` – Missing or invalid `id`, or invalid requested role.
  - `404 Not Found` – User or requested role not found.
  - `500 Internal Server Error` – Server error during approval.

---

## 3. POST `/admin/reject-registration`

- **Request Body:**

{
"id": 1
}

- **Successful Response (200 OK):**

{
"message": "User registration rejected and user deleted."
}

- **Error Responses:**

  - `400 Bad Request` – Missing or invalid `id`.
  - `404 Not Found` – User not found or not pending.
  - `500 Internal Server Error` – Server error during rejection.

---

# `/applications` API Endpoint Request & Response Formats

## 1. POST `/applications/`

- **Request Body:**
{
"jobId": 123,
"experienceYears": 5

- **Successful Response (200 OK):**

{
"message": "Posted Application Successfully",
"applicationNumber": "0001"
}

- **Error Responses:**

  - `409 Conflict` – If candidate has already applied for the same job, or other insertion error.
  
  - `404 Not Found` – If the job opening does not exist.
  
  - `409 Conflict` (generic) – On other application errors.

---

## 2. GET `/applications/`

- **Request Body:** None

- **Successful Response (200 OK):**
[
{
"candidate_id": 1,
"application_number": "0001",
"name": "John Doe",
"phone": "1234567890",
"email": "john@example.com",
"current_country": "USA",
"address": "123 Street, City",
"experience_years": 5,
"applied_at": "2025-07-28T13:45:00.000Z",
"skills": "JavaScript, Node.js",
"job_role": "Software Developer",
"resume_url": "https://example.com/resume/johndoe.pdf"
},
...

]

- **Access:** Admin only

---

## 3. GET `/applications/application-form`

- **Request Body:** None

- **Successful Response (200 OK):**

{
"name": "John Doe",
"phone": "1234567890",
"email": "john@example.com",
"linkedin_url": "https://linkedin.com/in/johndoe",
"resume_url": "https://example.com/resume/johndoe.pdf",
"github_url": "https://github.com/johndoe",
"current_country": "USA",
"address": "123 Street, City",
"skills": "JavaScript, Node.js"
}

- **Error Responses:**

  - `404 Not Found` – Candidate profile not found.
  
  - `500 Internal Server Error` – On server-side error.

- **Access:** Candidate (authenticated) only

---

## 4. POST `/applications/approve`

- **Request Body:**

{
"id": 1
}

- **Successful Response (200 OK):**

{
"message": "Shortlisted applicant successfully"
}

- **Error Responses:**

  - `409 Conflict` – On errors during status update.

- **Access:** Admin only

---
