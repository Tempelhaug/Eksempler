/**
 * Fetches business data from the server, if no businessId is given it fetches all data on all businesses on server
 *
 * @param businessId the Id of a specific business we want the infopage from
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const businessInfo = businessId => {
  const businessPromise = new Promise((resolve, reject) => {
    if (businessId) {
      $.get(`https://api.gomap.cloud/v1/scooter/getBusiness/${businessId}`, data => {
        if (!data) {
          reject();
        } else {
          resolve(data);
        }
      });
    } else {
      $.get(`https://api.gomap.cloud/v1/scooter/getBusiness`, data => {
        if (!data) {
          reject();
        } else {
          resolve(data);
        }
      });
    }
  });
  return businessPromise;
};
export default businessInfo;
