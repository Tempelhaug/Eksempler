/**
 * Fetches all trips the given user has saved on the server
 *
 * @param uuid the uuid of the user currently logged into the app
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const myTrips = uuid => {
  const myTripsPromise = new Promise((resolve, reject) => {
    $.get(`*************************************${uuid}`, data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return myTripsPromise;
};

export default myTrips;
