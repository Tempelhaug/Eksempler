/**
 * Fetches messages from the server, with the subsciption setting of the supplied userId
 *
 * @param userId the id of the user that wants alert
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const alertData = userId => {
  const alertPromise = new Promise((resolve, reject) => {
    if (userId) {
      $.get(`https://api.gomap.cloud/v1/scooter/notifications/${userId}`, data => {
        if (!data) {
          reject();
        } else {
          resolve(data);
        }
      });
    }
  });
  return alertPromise;
};

export default alertData;
