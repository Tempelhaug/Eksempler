/**
 * Fetches all transactions for the given user
 *
 * @param uuid the uuid of the user currently logged into the app
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const transactions = uuid => {
  const transactionsPromise = new Promise((resolve, reject) => {
    $.get(`https://api.gomap.cloud/v1/scooter/transactions/${uuid}`, data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return transactionsPromise;
};

export default transactions;
