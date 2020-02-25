/**
 * Sends feedback to server with phonedata, userdata and a message from the user.
 * The other fields required for this post function is fetched within this function
 *
 * @param {String} message - the message the user wants to send as feedback
 * @param {String} userId - the uuid of the user that is sending the feedback
 *
 * @returns {Promise} return a promise to let the app know if the post succeded or not
 */
const sendFeedback = (message, userId) => {
  const sendFeedbackPromise = new Promise(resolve => {
    if (message.length > 0 && userId) {
      $.post(
        'https://api.gomap.cloud/v1/feedback',
        {
          message,
          gomapUserAccountsId: userId,
          phoneData: {
            available: window.device.available,
            cordova: window.device.cordova,
            isVirtual: window.device.isVirtual,
            manufacturer: window.device.manufacturer,
            model: window.device.model,
            platform: window.device.platform,
            serial: window.device.serial,
            uuid: window.device.uuid,
            version: window.device.version,
          },
        },
        () => {
          resolve(true);
        },
      );
    }
  });
  return sendFeedbackPromise;
};

export default sendFeedback;
