/**
 * Sets up the launchscreen in the app, loading until backgrounddata has been synced and checks loginstatus
 * @module views/welcome
 */
import * as docCookies from 'doc-cookies';

// Registration button clicked
$('#gomapRegister').click(() => {
  $('#welcome').addClass('hidden');
  $('#register').removeClass('hidden');
});

// Register cancel button clicled
$('#registerCancel').click(() => {
  $('#welcome').removeClass('hidden');
  $('#register').addClass('hidden');
});

// Login button clicked
$('#gomapLogin').click(() => {
  $('#welcome').addClass('hidden');
  $('#login').removeClass('hidden');

  // Focus the phone number field
  $('#phoneLogin').focus();
});

// Login cancel button clicled
$('#loginCancel').click(() => {
  $('#welcome').removeClass('hidden');
  $('#login').addClass('hidden');
});

// Home button clicked
$('#home').click(() => {
  $('#offlineMaps').addClass('hidden');
  $('#map').removeClass('hidden');
});

// Determine if we need to login/register account or go straight to the map
if (docCookies.getItem('userData')) {
  $('#welcome').addClass('hidden');
  $('#main').removeClass('hidden');

  setTimeout(() => {
    navigator.splashscreen.hide();
  }, 2000);
} else {
  setTimeout(() => {
    navigator.splashscreen.hide();
  }, 2000);
}
