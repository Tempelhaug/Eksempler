/**
 * Initializes the register page, which allows new users to be registered via the app. Sets up input fields and adds events to buttons so that when the correct data is entered into the form
 * a post is made to the server attempting to register a new user.
 * Will fail if the user exixsts or gets no response from server. When the register post succeeds the user will be sent a verification code and prompted to enter it in the verification modal that popsup.
 * If the code entered matches the code created on the server we update the userData cookie with the supplied userdata, and in essence logs the user into the system
 * @module views/register
 */
import * as intlTelInput from 'intl-tel-input/build/js/intlTelInput';
import * as util from 'intl-tel-input/build/js/utils';
import * as docCookies from 'doc-cookies';
import deviceready from '../components/deviceready';
import map from './map';
import register from '../components/apiAccess/registerApi';
import verify from '../components/apiAccess/loginVerify';
import { translate, translateVerificationModal } from '../components/translation';
import userDataRequired from '../components/dataFunctions';

const input = document.querySelector('#phoneRegister');
// eslint-disable-next-line
let iti;
// If the input element exists we convert it into an intlTelInput object which allows us to verify phonenumbers and lookup what country they're from
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

// Hook onto progress/continue/submit hardware/software buttons - allows the use of enter button on keyboard to easily navigate to the next inputfield (Debugging/testing)
$('input#phoneRegister').on('keydown', e => {
  if (e.which === 13) {
    $('#regFirstName').focus();
  }
});
$('input#regFirstName').on('keydown', e => {
  if (e.which === 13) {
    $('#regLastName').focus();
  }
});
$('input#regLastName').on('keydown', e => {
  if (e.which === 13) {
    $('#regEmail').focus();
  }
});
$('input#regEmail').on('keydown', e => {
  if (e.which === 13) {
    $('#newRegistration').click();
  }
});

// Register button clicked
$('#newRegistration').click(() => {
  if (iti.isValidNumber()) {
    const firstName = $('#regFirstName').val();
    const lastName = $('#regLastName').val();
    const email = $('#regEmail').val();
    const countryData = iti.getSelectedCountryData();

    // No first name input
    if (firstName.length < 1) {
      deviceready(() => {
        navigator.notification.alert(translate('{TXT_ERR_REG_FIRSTNAME}'), '', translate('{ERR_REG_TITLE}'));
      });
      return;
    }
    // No last name input
    if (lastName.length < 1) {
      deviceready(() => {
        navigator.notification.alert(translate('{TXT_ERR_REG_LASTNAME}'), '', translate('{ERR_REG_TITLE}'));
      });
      return;
    }
    // No email input
    if (email.length < 1) {
      deviceready(() => {
        navigator.notification.alert(translate('{TXT_ERR_REG_EMAIL}'), '', translate('{ERR_REG_TITLE}'));
      });
      return;
    }

    deviceready(() => {
      $.get('templates/modals/verification.html', tpl => {
        // Inject the modal
        $('#register').append(tpl);

        translateVerificationModal();
        register({
          email,
          phoneNumber: iti.getNumber(),
          firstName,
          lastName,
          language: countryData.iso2,
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

            // Hardware button clicked
            $('input#verificationCode').on('keydown', e => {
              if (e.which === 13) {
                $('#submitVerification').click();
              }
            });

            // Dismiss and remove verification modal
            $('#submitVerification').click(() => {
              // Send verification code
              verify({
                code: $('#verificationCode').val(),
                userId: data.userId,
              })
                .then(userData => {
                  // Hide the modal
                  $('#verificationModal').modal('hide');

                  // Store cookie data
                  docCookies.setItem('userData', JSON.stringify(userData), Infinity);

                  $('#verificationModal').on('hidden.bs.modal', () => {
                    // Remove injected HTML
                    $('#verificationModal').remove();

                    // Setup the main view
                    $('#main').show();
                    $('#register').addClass('hidden');

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
            if (e.status === 400) {
              navigator.notification.alert(translate('{TXT_ERR_REG_ACCOUNT_EXISTS}'), '', translate('{ERR_REG_TITLE}'));
            } else {
              navigator.notification.alert(translate('{TXT_ERR_REG_GENERIC}'), '', translate('{ERR_REG_TITLE}'));
            }
          });
      });
    });
  } else {
    deviceready(() => {
      navigator.notification.alert(translate('{TXT_ERR_REG_PHONENUMBER}'), '', translate('{ERR_REG_TITLE}'));
    });
  }
});
