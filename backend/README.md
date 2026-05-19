# CRM Backend (V1 Skeleton)

## Stack
- Java 17
- Spring Boot 3.x
- REST + SSE
- In-memory store for local functional verification (DB integration pending)

## Run
1. Install Maven
2. `cd backend`
3. `mvn spring-boot:run`

## Default users
- System Admin: `13800000000` / `Admin@123`
- Sales: `13800000001` / `Sales@123`

## Auth
- `POST /api/auth/login`
- Use `Authorization: Bearer <token>` for protected APIs.

## Key APIs
- Members: `/api/users`
- Role data scope: `/api/roles` and `/api/roles/{code}/scope`
- Legacy scope alias: `/api/system/scope-mode`
- Dict config: `/api/system/dicts`
- Contacts: `/api/contacts`
- Projects: `/api/projects`
- Followups: `/api/followups`
- Contracts: `/api/contracts`
- Payments: `/api/payments`
- Audit logs: `/api/audit-logs`
- SSE: `/api/stream/subscribe`

## Implemented business rules
- Phone uniqueness: contact phone1/phone2 unique in tenant, phone1 != phone2
- Project owner single required
- One project one contract (V1)
- Payment bound to contract
- Contract creation auto-updates project stage to `SIGNING`
- Soft delete project cascades to followup/contract/payment
- Contact cannot be deleted when referenced by project
- Data scope config (role-level): system admin fixed `ALL`, sales configurable
- Sales data operations bound by role scope; project admin/system admin full access
- Member status: `ENABLED`/`DISABLED` (disabled cannot login)
- Audit logging for persisted mutation operations

## Notes
- This version uses in-memory repositories to unblock domain-flow development in current environment.
- Replace repositories with MyBatis-Plus mappers for MySQL persistence in next step.
