# TODO - SelfSharing OTP Verify

- [x] Add `verifyOtp` API method to `src/services/SelfSharingService.js` calling `POST /selfsharing/trip/verify-otp`.
- [x] Update `src/screens/mainscreens/SelfSharingTripDetailsScreen.js`:
  - [x] Add “Verify OTP” button on each booking card.
  - [x] Add OTP entry modal (TextInput + Submit + Cancel).
  - [x] On submit, call `SelfSharingService.verifyOtp({ trip_id, booking_id, otp })`.
  - [x] On success, close modal and refresh trip via `fetchTrip()`.
- [ ] Quick test: ensure modal opens/closes and submit triggers API.
- [ ] Add Start/Complete/Cancel ride buttons UI and wire APIs.



