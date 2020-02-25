/* eslint-disable no-unused-expressions */
import * as docCookies from 'doc-cookies';
import deviceready from '../deviceready';
import database from '../database';
/**
 * Handles all logic for editing profile data
 * @module components/subPages/editProfile
 */
/**
 * @const {bool} Debug - a bool used for debugging purposes, if set to true this script will print debug messages, else if false will not print anything
 */
const userData = JSON.parse(docCookies.getItem('userData'));
/**
 * @const {Object} userData - an object that contains the userdata fetched from the userData cookie
 */
const Debug = false;

/**
 * Builds the edit profile page, and fills the userdata fields with the data we have stored on the user.
 * If the user clicks to start edit userdata it will add inputfields to all editable fields on the page and allows the user to enter updated userData.
 * When the edit-profile-save button is clicked we make a post to the api with all the fields that is different from the data stored in the userData variable and is not null or an empty string
 */
const editProfile = () => {
  deviceready(() => {
    database().then(db => {
      const previousUserName = userData.firstName;
      const previousLastName = userData.lastName;
      const previousEmail = userData.email;
      $('#edit-userName-label').text(previousUserName);
      $('#edit-lastName-label').text(previousLastName);
      $('#edit-email-label').text(previousEmail);
      $('#edit-phone-label').text(userData.phoneNumber);

      $('#start-edit-profile').click(() => {
        $('#start-edit-profile').addClass('hidden');

        // Add input to username
        $('#edit-userName-label').addClass('md-form');
        $('#edit-userName-label').removeClass('my-3');
        $('#edit-userName-label').addClass('my-0');
        const profileName = $('#edit-userName-label').text();
        $('#edit-userName-label').text('');
        $('#edit-userName-label').append(`      <input type="text" id="edit-userName" class="form-control" />`);
        $('#edit-userName').val(profileName);

        // Add input to lastname
        $('#edit-lastName-label').addClass('md-form');
        $('#edit-lastName-label').removeClass('my-3');
        $('#edit-lastName-label').addClass('my-0');
        const lastname = $('#edit-lastName-label').text();
        $('#edit-lastName-label').text('');
        $('#edit-lastName-label').append(`      <input type="text" id="edit-lastName" class="form-control" />`);
        $('#edit-lastName').val(lastname);

        // Add input to email
        $('#edit-email-label').addClass('md-form');
        $('#edit-email-label').removeClass('my-3');
        $('#edit-email-label').addClass('my-0');
        const profileMail = $('#edit-email-label').text();
        $('#edit-email-label').text('');
        $('#edit-email-label').append(`      <input type="text" id="edit-email" class="form-control" />`);
        $('#edit-email').val(profileMail);
        // Show save button
        $('#edit-profile-save').removeClass('hidden');
      });

      $('#edit-profile-save').click(() => {
        const profileName = $('#edit-userName').val();
        const lastname = $('#edit-lastName').val();
        const profileMail = $('#edit-email').val();

        // Remove input from firstName
        $('#edit-userName-label').removeClass('md-form');
        $('#edit-userName-label').addClass('my-3');
        $('#edit-userName-label').removeClass('my-0');
        $('#edit-userName-label').html('');

        // Remove input from lastName
        $('#edit-lastName-label').removeClass('md-form');
        $('#edit-lastName-label').addClass('my-3');
        $('#edit-lastName-label').removeClass('my-0');
        $('#edit-lastName-label').html('');

        // Remove input from email
        $('#edit-email-label').removeClass('md-form');
        $('#edit-email-label').addClass('my-3');
        $('#edit-email-label').removeClass('my-0');
        $('#edit-email-label').html('');

        // Hide savebutton and show editprofile button
        $('#edit-profile-save').addClass('hidden');
        $('#start-edit-profile').removeClass('hidden');

        // Stores updated data from the fields, if they are empty we just use the data already stored in the userdata object
        userData.firstName = profileName !== '' ? profileName : userData.firstName;
        userData.lastname = lastname !== '' ? lastname : userData.lastname;
        userData.email = profileMail !== '' ? profileMail : userData.email;

        // Clears the internal userData table and inserts the new data into it
        db.executeSql(
          'CREATE TABLE IF NOT EXISTS userData (createTime STRING, language STRING, userId STRING, birthdate STRING, email STRING, firstName STRING, gender STRING, lastName STRING, phone STRING)',
          [],
        );
        db.executeSql('DELETE FROM userData', []);
        db.executeSql('VACUUM', []);
        db.executeSql(
          'INSERT INTO userData (createTime, language, userId, birthdate, email, firstName, gender, lastName, phone) VALUES (?,?,?,?,?,?,?,?,?)',
          [userData.createTime, userData.language, userData.gomapUserAccountsId, userData.birthDate, userData.email, userData.firstName, userData.gender, userData.lastName, userData.phoneNumber],
          () => {},
          e => {
            Debug ? console.warn(JSON.stringify(e)) : '';
          },
        );

        $('#edit-userName-label').text(userData.firstName);
        $('#edit-lastName-label').text(userData.lastName);
        $('#edit-email-label').text(userData.email);

        // Updates the userData cookie with the new userData and sets the duration to Infinity
        docCookies.setItem('userData', JSON.stringify(userData), Infinity);

        // Makes a post to the api to updatUserdata on the server, currently the fields birthdate, gender and language isnt used in the system.
        $.post('https://api.gomap.cloud/v1/updateUserdata', {
          gomapUserAccountsId: userData.gomapUserAccountsId,
          firstName: profileName,
          lastName: lastname,
          birthdate: '',
          gender: '',
          email: profileMail,
          language: '',
        });
      });
    });
  });
};

export default editProfile;
