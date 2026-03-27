# Prolink-EZLY: Strategic Roadmap & Status

## Status (March 25, 2026)
- **Initialized:** Architecture review initiated. Existing components (`ContractorCRM`, `ContractorPipeline`, `VettingEngine`) are being refactored for modularity.
- **Architectural Shift:** Moving from a flat structure to a Domain-Driven Design (DDD) to support scaling into an "all-in-one" platform (CRM, Scheduling, Invoicing, Payments).

## Strategic Roadmap
### Phase 1: Foundational CRM & Booking (Target: 72 hours)
- [ ] Refactor `ContractorCRM` into service-based modules.
- [ ] Implement integrated "Online Booking" module for client-side consumption.

### Phase 2: Operations Management (Target: 1 week)
- [ ] Dispatch/Scheduling: Real-time routing integration.
- [ ] Estimate Builder: "Good, Better, Best" quote interface for field techs.

### Phase 3: Finance & Payments
- [ ] Automated Invoicing Engine.
- [ ] Payment gateway integration (Stripe/similar).

## Current Focus
- Establishing a reliable database schema in `schema.sql` that unifies Jobs, Customers, and Estimates.
- Improving component modularity in `src/`.
