/**
 * Makes an async attempt at registering a new user into the system. Requires certain datafields to work as explained on the data parameter
 *
 * @param {Object} data - An object containing necessary data for registering a new user
 * data{
 *  email, - String
 *  phoneNumber, - Integer
 *  firstName,  - String
 *  lastName, - String
 *  languate  - iso2 countrycode (ie. for norwegian the code is 'no')
 * }
 */
const register = async data => {
  try {
    const result = await $.post('https://api.gomap.cloud/v1/register', data);
    return result;
  } catch (error) {
    return error;
  }
};

export default register;
