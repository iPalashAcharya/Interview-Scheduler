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
