/**
 * Fetches all currently active scooter pushChannels
 *
 * @returns {Promise} A promise containing the fetched data object
 */
const pushChannelData = () => {
  const pushChannelDataPromise = new Promise((resolve, reject) => {
    $.get(`https://api.gomap.cloud/v1/scooter/activePushChannels`, data => {
      if (!data) {
        reject();
      } else {
        resolve(data);
      }
    });
  });
  return pushChannelDataPromise;
};
export default pushChannelData;
