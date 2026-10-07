// A Business Associate only operates these services, so only these are offered
// when a BA registers or adds a driver. Matched on the exact title so look-alikes
// such as "Rental Sharing" stay out.
const BA_SERVICE_TITLES = ['one way', 'rental', 'driver'];

export const filterBAServices = (services) =>
  (Array.isArray(services) ? services : []).filter((service) =>
    BA_SERVICE_TITLES.includes(
      String(service?.title || service?.service_name || service?.name || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, ' '),
    ),
  );
