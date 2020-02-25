/**
 * Makes an async attempt at updating the subscription settings for the user
 *
 * @param {Object} subscriptionUpdates - an object containing data about which channels the user wants to subscribe to:
 * subscriptionUpdates: {
 *  gomapUserAccountsId: String, id of the user that is updating subscriptions
 *  pushChannelId: Integer, push channel id of the channel the user wants to subscribe too
 *  appType: Integer, identifier for which type of app the user wants to update for. 1 = scooter app
 * }
 */
const updateSubscriptions = async subscriptionUpdates => {
  try {
    const result = await $.post('https://api.gomap.cloud/v1/setSubscriptions', { subscriptionUpdates }).then(data => {
      return data;
    });
    return result;
  } catch (error) {
    return error;
  }
};

export default updateSubscriptions;
