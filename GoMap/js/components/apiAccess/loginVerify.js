/**
 * Makes an async attempt at checking if the supplied verification code is correct, and if so allows the user to log into the system
 *
 * @param {Object} data - an object containing userId, a verificationcode and gomapUserAccountsId
 */
const verify = async data => {
  try {
    const result = await $.post('https://api.gomap.cloud/v1/verify', data);
    return result;
  } catch (error) {
    return error;
  }
};

export default verify;
