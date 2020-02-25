/**
 * Makes an async attempt at logging into the system, by posting the user logindata to the api
 *
 * @param {OBJECT} loginData this is either an object containing phonenumber or email
 */
const login = async loginData => {
  try {
    const result = await $.post('https://api.gomap.cloud/v1/login', { loginData });
    return result;
  } catch (error) {
    return error;
  }
};

export default login;
