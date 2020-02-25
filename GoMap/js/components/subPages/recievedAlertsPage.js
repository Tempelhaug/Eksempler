import moment from 'moment';
import * as docCookies from 'doc-cookies';
import { translateMyAlertSettings, translate } from '../translation';
import alertSettings from './alertSettings';
import database from '../database';
import deviceready from '../deviceready';
/**
 * Script responsible for setting up the received messages/alerts sent via pushchannels
 * Builds a list containing messages from the pushchannels the user has subscribed to,
 * and builds a filter dropdown that contains the names of the different channels the user is subscribed to.
 *
 * @module components/subPages/recievedAlertsPage
 */

/**
 * This function sets up the edit alerts page by injecting the template into the editAlerts holder.
 * Then translates the page using the translate script and builds the alert settingspage
 */
export const recievedAlertsPage = () => {
  $(document).on('click', '#edit-alerts', () => {
    $.get('templates/subPages/alerts-page.html', tpl => {
      $('#editAlerts').html(tpl);

      // Translates the text visible on the page after injecting it.
      translateMyAlertSettings();
      // Builds the alertSettings page
      alertSettings();
      $('#editAlerts').removeClass('hidden');
      $('#recievedAlertsMain').addClass('hidden');
    });
  });
};

// To prevent the filter dropdown we have to stop propagation on it, since its set to close by default on click.
$(document).on('click', '#filterContainer .dropdown-menu', e => {
  e.stopPropagation();
});

/**
 * This click event triggers on the only button presses that allows the user to open the received alerts page.
 * Builds the received alertspage by first building a dropdown containing the channels the user is subscribed to, and then builds a list containing the messages sent by those channels.
 */
$(document).on('click', '#recievedAlerts, #backFromAlertSettings', () => {
  deviceready(() => {
    database().then(db => {
      const messages = [];
      const channels = [];
      const myChannels = [];
      if (db) {
        $('.dropdown-divider').parent().html(`            <a class="dropdown-item text-capitalize text-center" style="font-size: 22px;" href="#" data-source="everything">${translate(
          '{TXT_FILTER}',
        )}</a>
          <div class="dropdown-divider"></div>`);
        // We fetch the last active filters from the messageFilterPreference cookie so that the filters the user previously activated will still be active.
        let filterPreferences = JSON.parse(docCookies.getItem('messageFilterPreference'));
        $('#recievedAlertsList').text('');

        // Adds a linebreak to the message list to prevent the content from disapearing behind the header.
        $('#recievedAlertsList').html('<br>');
        db.executeSql('SELECT * FROM activePushChannels', [], result => {
          for (let i = 0; i < result.rows.length; i += 1) {
            const item = result.rows.item(i);
            channels.push(item);
          }
          translate('{TXT_FILTER}', '#filterText');
          // If we cannot find any filterpreferences in the users cookies, we add all the users subscribed channels to the filterPreference
          if (!filterPreferences) {
            filterPreferences = [];
            filterPreferences.push(1);
            channels.forEach(channel => {
              filterPreferences.push(channel.pushChannelId);
            });
          }
          db.executeSql('SELECT * FROM messageSubscriptions', [], mySubscriptionsResult => {
            // The channel ID 1 is the GoMap specific channels, and all users are forced to be subsrcibed to these channels
            myChannels.push(1);

            // Since all users have to be subsrcibed to the GoMap Channels we can build the dropdown item for this channel for all users anyway.
            $('.dropdown-divider').parent().append(`
            <div class="col-6 text-black my-2">
            <div class="form-check" style="height:30px; width:50px;">
              <input type="checkbox" class="form-check-input" id="filterCheckBox_1" value="1" ${filterPreferences.indexOf(1) > -1 ? 'checked' : ''}>
              <label class="form-check-label text-capitalize" style="font-size: 15px;" for="filterCheckBox_1">GoMap</label>
            </div>
            <hr class="py-0 my-0">
          </div>`);

            // Loop through all the subscribed channels and add the channel name to the dropdown. with a checkbox to activate or disable filtering on that item.
            for (let i = 0; i < mySubscriptionsResult.rows.length; i += 1) {
              const item = mySubscriptionsResult.rows.item(i).pushChannelId;
              myChannels.push(item);
              $('.dropdown-divider').parent().append(`
              <div class="col-6 text-black my-2">
                <div class="form-check" style="height:30px; width:50px;">
                  <input type="checkbox" class="form-check-input" id="filterCheckBox_${item}" value="${item}" ${filterPreferences.indexOf(item) > -1 ? 'checked' : ''}>
                  <label class="form-check-label text-capitalize" style="font-size: 15px;" for="filterCheckBox_${item}"
                  >${channels.find(channel => channel.pushChannelId === item).channelName}</label>
                </div>
              </div>
              `);
            }
            $('.dropdown-divider').parent().append(`
            <div class="col text-black">
              <div class="text-center my-2">
              <button class="btn btn-sm btn-secondary py-1" style="border-radius:5px;font-size:15px;" type="button"  id="municipalFilterOk">
                ${translate('{TXT_OK}')}
            </button>
              </div>
            </div>`);
          });
        });
        db.executeSql('SELECT * FROM messages', [], res => {
          // If we coudlnt find any messages, or the user has turned off all filters we display a No Message text.
          if (res.rows.length < 1 || (filterPreferences.length < 1 && filterPreferences !== null)) {
            $('#recievedAlertsList').append(`
            <br /><br />
            <div class="text-center">${translate('{TXT_NO_MESSAGES}')}</div>
            <br /><br />
            `);
          } else {
            // Build an array containing all messages that the user is subscribed to.
            for (let i = 0; i < res.rows.length; i += 1) {
              const item = res.rows.item(i);
              messages.push(item);
            }
            // Reverse the messages array so that they get ordered from newest to oldest.
            messages.reverse();

            // Loops through all messages and checks if the filter for that channel is active, if it is we build the message and add i to the list of messages.
            messages.forEach(alert => {
              if (filterPreferences.indexOf(alert.pushChannelId) > -1 || (filterPreferences.indexOf(1) > -1 && (alert.pushChannelId === 2 || alert.pushChannelId === 4))) {
                $('#recievedAlertsList').append(`
        <div class="item" data-category="${alert.channelName}">
        <div class="mt-2 mx-3">
          <h5 class="text-center text-secondary font-weight-bold">${alert.title}</h5>
          <p class="text-center text-muted">${moment(alert.timestamp).format('L')}</p>
          <p>${alert.message}</p>
          <div>
            <p style="text-align: right;" class="font-weight-bold">${alert.channelName}</p>
          </div>
        </div>
        <hr>
        </div>`);
              }
            });
          }
          // When a user clicks the Ok button to update filters we clear the message list and builds it again
          $(document)
            .off('click', '#municipalFilterOk')
            .on('click', '#municipalFilterOk', () => {
              const newFilterPreferences = [];
              $('#recievedAlertsList').text('');
              $('#recievedAlertsList').html('<br>');

              // Loop through the checkboxes to find what filter the user wants to activate
              for (let i = 0; i < myChannels.length; i += 1) {
                if ($(`#filterCheckBox_${myChannels[i]}`).is(':checked')) {
                  newFilterPreferences.push(myChannels[i]);
                }
              }

              // Set the new filter preference so that the next time the user enters this page the same filters will be active
              docCookies.setItem('messageFilterPreference', JSON.stringify(newFilterPreferences), Infinity);

              // If no messages were found or all filters were disabled we display a no Message text
              if (res.rows.length < 1 || (newFilterPreferences.length < 1 && newFilterPreferences !== null)) {
                $('#recievedAlertsList').append(`
              <br /><br />
              <div class="text-center">${translate('{TXT_NO_MESSAGES}')}</div>
              <br /><br />
              `);
              }
              // Loop throug all messages and builds the ones with an active filter.
              messages.forEach(alert => {
                if (newFilterPreferences.indexOf(alert.pushChannelId) > -1 || (newFilterPreferences.indexOf(1) > -1 && (alert.pushChannelId === 2 || alert.pushChannelId === 4))) {
                  $('#recievedAlertsList').append(`
        <div class="item" data-category="${alert.channelName}">
        <div class="mt-2 mx-3">
          <h5 class="text-center text-secondary font-weight-bold">${alert.title}</h5>
          <p class="text-center text-muted">${moment(alert.timestamp).format('L')}</p>
          <p>${alert.message}</p>
          <div>
            <p style="text-align: right;" class="font-weight-bold">${alert.channelName}</p>
          </div>
        </div>
        <hr>
        </div>`);
                }
              });
            });
        });
      }
    });
  });
});

// This method handles the navigation events on the backbutton when the editAlertsPage is visible
$(document).on('click', '.backToSettings', () => {
  $('#recievedAlertsMain').removeClass('hidden');
  $('#editAlerts').addClass('hidden');
  $('#editAlerts').html('');
});

export default recievedAlertsPage;
