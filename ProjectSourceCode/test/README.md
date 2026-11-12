
Ran:
cd ProjectSourceCode
docker compose -f docker-compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests

Route Contract:

| Item | Contract |
|---|---|
| Route | `POST /register` |
| Request format | URL-encoded HTML form |
| Required fields | `username` and `email` must be nonempty strings; `password` must be a string of at least 8 characters |
| Success response | `302` redirect to `/login` |
| Invalid-input response | `400` HTML registration page containing `Invalid input.` |
| Persistence | Insert one row into `users`, storing `username`, `email`, and a bcrypt hash in `password` |

Test data:

The registration tests use a unique username and delete that test user's row before and after each case. The test suite also closes the shared PostgreSQL pool after all tests finish. There is no database change.

Clean Up:
docker compose -f docker-compose.test.yaml down
