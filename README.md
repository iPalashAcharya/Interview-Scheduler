1.GET /pending-registration
Request Body: None
Response (200 OK):
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

2. POST /approve-registration
Request Body:
{
  "id": 1
}
Successful Response (200 OK):
{
  "message": "User approved successfully",
  "userId": 1,
  "newRole": "Interviewer"
}
Error Responses:
400 Bad Request if id is missing or invalid, or role is invalid
404 Not Found if user or requested role not found
500 Internal Server Error on server error

3.POST /reject-registration
Request Body:{
  "message": "User registration rejected and user deleted."
}
Error Responses:
400 Bad Request if id is missing or invalid
404 Not Found if user not found or not pending
500 Internal Server Error on server error
