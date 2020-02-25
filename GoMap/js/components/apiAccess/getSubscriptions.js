/**
 * Fetches users subsriptions from the server
 *
 * @param userId the Id of the user we want subscriptions for
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const subscriptionData = userId => {
  const subscriptionsPromise = new Promise((resolve, reject) => {
    if (userId) {
      $.get(`https://api.gomap.cloud/v1/userdata/getScooterSubscriptions/${userId}`, data => {
        if (!data) {
          reject();
        } else {
          resolve(data);
        }
      });
    }
  });
  return subscriptionsPromise;
};
export default subscriptionData;
