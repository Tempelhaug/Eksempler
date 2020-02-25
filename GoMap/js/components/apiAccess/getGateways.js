/**
 * Fetches paymentgateways for scooter businesses
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const gateways = () => {
  const gatewayPromise = new Promise((resolve, reject) => {
    $.get('https://api.gomap.cloud/v1/purchases/gateways/1', data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return gatewayPromise;
};

export default gateways;
