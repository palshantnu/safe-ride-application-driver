# TODO - On-Spot (service_id 77) integration

- [ ] Update `src/components/driver/DriverHomeFlow.js`:
  - [x] Add `isOnSpotCaptain` flag (service_id === 77)
  - [x] Keep existing `hasSpecialService` for only 72/73

  - [ ] Add new state + polling logic to call `GET /onspot/captain/available`
  - [ ] Create separate `OnSpotRequestCard` UI for available bookings
  - [ ] Add reject modal flow for on-spot bookings
  - [ ] Implement accept call: `POST /onspot/captain/accept` with `booking_no`
  - [ ] Implement reject call: `POST /onspot/captain/reject` with `{ booking_no, reject_reason }`
  - [ ] Ensure list shows only when no `currentRides` active (same pattern as existing)

- [x] Test skipped/failed: Jest config issue (not part of on-spot integration)


- [ ] (Optional) Update `src/services/EndPoints.js` to add onspot endpoints constants.

- [ ] Test:
  - [ ] Run app and login as service_id 77
  - [ ] Verify on-spot bookings appear
  - [ ] Verify accept/reject works end-to-end

