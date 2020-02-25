import * as intlTelInput from 'intl-tel-input/build/js/intlTelInput';
import * as util from 'intl-tel-input/build/js/utils';
import * as docCookies from 'doc-cookies';
import deviceready from '../components/deviceready';
import map from './map';
import login from '../components/apiAccess/loginApi';
import verify from '../components/apiAccess/loginVerify';
import '../components/offlineMaps';
import { translate, translateVerificationModal } from '../components/translation';
import userDataRequired from '../components/dataFunctions';

/**
 * Prepares the login page and adds relevant clickevents to the login page. User can either log into the system using a phonenumber or an email.
 * When a phoneNumber or email has been supplied we send a request to the server which generates a verification code for the user and is sent to the supplied contact method.
 * Opens a modal for the user to input the verification code, and if the code matches the code generated on the server allows the user to log in. Stores userdata as a cookie on successful login
 * so that the user doesnt have to login in everytime they start the app.
 *
 * @todo Add Logic allowing email login as well
 * @module views/login
 */
const input = document.querySelector('#phoneLogin');
// eslint-disable-next-line
let iti;
// If the input element exists we turn it into an intlTelInput object, which allows us to verify if numbers are correct and also detect what country that number is from
if (input) {
  iti = intlTelInput(input, {
    utilsScript: util,
    initialCountry: 'no',
    autoPlaceholder: 'off',
    geoIpLookup(success) {
      $.get('https://ipinfo.io', () => {}, 'jsonp').always(resp => {
        const countryCode = resp && resp.country ? resp.country : '';
        success(countryCode);
      });
    },
  });
}

// Hook onto progress/continue/submit hardware/software buttons
$('input#phoneLogin').on('keydown', e => {
  if (e.which === 13) {
    $('#loginSubmit').click();
  }
});

// Submit button clicked
$('#loginSubmit').click(() => {
  $('input#phoneLogin').blur();

  if (iti.isValidNumber()) {
    deviceready(() => {
      $.get('templates/modals/verification.html', tpl => {
        // Inject the modal
        $('#login').append(tpl);
        translateVerificationModal();

        // Make a post to the server supplying countrycode and phonenumber/email which will send a verification code to the user
        login({
          email: '',
          phoneNumber: iti.getNumber(),
          country: navigator.language.split('-')[0],
        })
          .then(data => {
            // Load the modal
            $('#verificationModal').modal({
              show: true,
              backdrop: 'static',
            });

            // Focus the verification field
            setTimeout(() => {
              $('#verificationCode').focus();
            }, 500);

            // Hardware button clicked used for testing purposes, allows the use of enter button to simulate ok button clicks
            $('input#verificationCode').on('keydown', e => {
              if (e.which === 13) {
                $('#submitVerification').click();
              }
            });

            // Dismiss and remove verification modal
            $('#submitVerification').click(() => {
              verify({
                code: $('#verificationCode').val(),
                userId: data.userId,
              })
                .then(userData => {
                  // Hide modal
                  $('#verificationModal').modal('hide');

                  // Store cookie data
                  docCookies.setItem('userData', JSON.stringify(userData), Infinity);

                  // Wait until hidden
                  $('#verificationModal').on('hidden.bs.modal', () => {
                    // Remove injected HTML
                    $('#verificationModal').remove();

                    // Setup the main view
                    $('#main').show();
                    $('#login').addClass('hidden');

                    // Wait until section is visible before refreshing the map
                    setTimeout(() => {
                      // Reset the map
                      map.invalidateSize();
                      userDataRequired();
                    }, 500);
                  });
                })
                .catch(e => {
                  // Error: Verification code doesn't exist or server unresponsive
                  if (e) {
                    $('#verificationCode').val('');
                    navigator.notification.alert(translate('{TXT_ERR_VERIFY}'), '', translate('{ERR_VERIFY_TITLE}'));
                  }
                });
            });
          })
          .catch(e => {
            // Error: Phone number don't exist
            if (e.status === 404) {
              navigator.notification.alert(translate('{TXT_ERR_LOGIN_NOEXIST_PHONENUMBER}'), '', translate('{ERR_LOGIN_TITLE}'));
            } else {
              // Error: Server unresponsive
              navigator.notification.alert(translate('{TXT_ERR_LOGIN_SERVER_FAULT}'), '', translate('{ERR_LOGIN_TITLE}'));
            }
          });
      });
    });
  } else {
    // Error: Invalid phone number
    deviceready(() => {
      navigator.notification.alert(translate('{TXT_ERR_LOGIN_PHONENUMBER}'), '', translate('{ERR_LOGIN_TITLE}'));
    });
  }
});
