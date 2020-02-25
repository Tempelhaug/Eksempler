/**
 * Fetches product data from server
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const products = () => {
  const productsPromise = new Promise((resolve, reject) => {
    $.get(`https://api.gomap.cloud/v1/scooter/products`, data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return productsPromise;
};

export default products;
