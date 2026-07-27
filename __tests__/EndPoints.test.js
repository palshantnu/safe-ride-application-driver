import EndPoints from '../src/services/EndPoints';

describe('BA booking endpoints', () => {
  it('uses the history endpoint for BA booking history and the new-bookings endpoint for incoming BA bookings', () => {
    expect(EndPoints.baBookingHistory).toBe('/ba/my-bookings');
    expect(EndPoints.baBookings).toBe('/ba/bookings');
  });
});
