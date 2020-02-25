/**
 * Fetch product categories from server
 *
 * @returns {Promise}
 */
const productCategories = () => {
  const productCategoriesPromise = new Promise((resolve, reject) => {
    $.get('https://api.gomap.cloud/v1/purchases/productCategories', data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return productCategoriesPromise;
};

export default productCategories;
