import * as docCookies from 'doc-cookies';
import deviceready from '../components/deviceready';
import map from './map';
import '../components/general';
import '../components/subpageSetup';
import database from '../components/database';
import metadataSync from '../components/mapMetadataCache';
import sleep from '../components/sleep';
import userDataRequired from '../components/dataFunctions';

/**
 * Initialization method for the app. Fetches active businesses from the db and tries to fetch the map metadata from those businesses, so that we can display the map elements for that business
 * which is set on an interval so that we retry if we didnt get business data we retry.
 * @module views/init
 */

// Disable keyboard interaction with the map for iOS
map.keyboard.disable();

deviceready(() => {
  const checkDatabase = setInterval(() => {
    database().then(db => {
      db.executeSql('SELECT * FROM businesses', [], res => {
        if (res.rows.length > 2) {
          // If we got data from the server we dont have to retry so we clear the Interval
          clearInterval(checkDatabase);
          for (let i = 0; i < res.rows.length; i += 1) {
            // Make sure the name is lowercase
            const name = res.rows
              .item(i)
              .name.split(' ')[0]
              .toLowerCase();
            // Sync data
            metadataSync(name);
          }
        } else {
          // If we got no data from the server, we retry to ensure we get map metadata
          console.log('Retrying in 3 seconds ...');
        }
      });
    });
  }, 3000);
});

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

// Show the spinner first thing
deviceready(async () => {
  if (!docCookies.getItem('userData')) {
    await sleep(4000);
    $('#loading-screen').fadeOut(1000, () => {
      $('#welcome').fadeIn(350, () => {
        $('#loading-screen').addClass('hidden');
        $('body').removeClass('secondary-color');
      });
    });
  } else {
    await sleep(4000);
    $('#loading-screen').fadeOut(1000, () => {
      $('#main').fadeIn(350, () => {
        $('#loading-screen').addClass('hidden');
        $('body').removeClass('secondary-color');
        // We force a reset on the map to ensure that it loads in.
        map.invalidateSize();
        // Now that we have userdata we can fetch the data that is specific for this user
        userDataRequired();
      });
    });
  }
});
