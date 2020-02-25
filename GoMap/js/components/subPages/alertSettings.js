import * as docCookies from 'doc-cookies';
import database from '../database';
import deviceready from '../deviceready';
import updateSubscriptions from '../apiAccess/updateSubscriptions';
import { translate } from '../translation';
import alerts from '../apiAccess/getAlerts';
/**
 * @module components/subPages/alertSettings
 */
/**
 * @const {Object} - an object containing the userdata that is fetched from the userData cookie
 */
const userData = JSON.parse(docCookies.getItem('userData'));

/**
 * Function for setting up the alert settings page
 * This will build the alert settings page with all active pushchannels for this version of the app, and will check all the boxes the user is currently subscribed to
 */
const alertSettings = () => {
  deviceready(() => {
    database().then(db => {
      if (db) {
        const mySubscriptions = [];
        const pushChannels = [];
        // Fetch channel id's that the user is currently subscribed to.
        db.executeSql('SELECT * FROM messageSubscriptions', [], res => {
          for (let i = 0; i < res.rows.length; i += 1) {
            const item = res.rows.item(i);
            mySubscriptions.push(item.pushChannelId);
          }
          // Fetch all puschannels that is currently active for this apptype
          db.executeSql('SELECT * FROM activePushChannels', [], result => {
            for (let i = 0; i < result.rows.length; i += 1) {
              const item = result.rows.item(i);
              pushChannels.push(item);
            }
            $('#subscriptionCheckboxes').html('');
            // Sets up checkboxes for all the active pushchannels, and checks them if the user is subsribed to that channel
            pushChannels.forEach(channel => {
              $('#subscriptionCheckboxes').append(
                `
                <div class="col-6 mb-3 text-black">
                <div class="form-check" style="height:50px; width:50px">
                <input type="checkbox" class="form-check-input" id="checkBox_${channel.pushChannelId}" value="${channel.pushChannelId}" ${
                  mySubscriptions.indexOf(channel.pushChannelId) > -1 ? 'checked' : ''
                }>
                <label class="form-check-label text-capitalize font-weight-bold" for="checkBox_${channel.pushChannelId}">${channel.channelName}</label>
            </div>
                </div>
                `,
              );
            });
          });
        });
        /**
         * #saveAlertSettings click event
         *
         * Fetches all currently checked boxes in the alert settings page, and sets up a subscription to the channels that have their checkbox checked
         * Then clears the internal database that contains the users subscriptions and inserts the updated subscriptions, that is stored in the "updates" variable
         *
         * When we have updated pushchannel subcriptions, we also purge the internal pushmessage table, and then inserts messages from the channels the user is now subscribed to.
         */
        $('#saveAlertSettings').click(async () => {
          const updates = [];
          for (let i = 0; i < pushChannels.length; i += 1) {
            if ($(`#checkBox_${pushChannels[i].pushChannelId}`).is(':checked')) {
              updates.push(parseInt(pushChannels[i].pushChannelId, 10));
            }
          }
          await updateSubscriptions({
            gomapUserAccountsId: userData.gomapUserAccountsId,
            pushChannelId: updates,
            appType: 1,
          }).then(() => {
            db.executeSql('CREATE TABLE IF NOT EXISTS messageSubscriptions (pushChannelId INTEGER)', []);
            db.executeSql('DELETE FROM messageSubscriptions', []);
            db.executeSql('VACUUM', []);
            updates.forEach(entry => {
              db.executeSql('INSERT INTO messageSubscriptions (pushChannelId) VALUES (?)', [entry], () => {});
            });
            updates.push(1);
            docCookies.setItem('messageFilterPreference', JSON.stringify(updates), Infinity);
            alerts(userData.gomapUserAccountsId).then(data => {
              if (data) {
                db.executeSql('CREATE TABLE IF NOT EXISTS messages (pushMessageId INTEGER, title STRING, message STRING, pushChannelId STRING, channelName STRING)', []);
                db.executeSql('DELETE FROM messages', []);
                db.executeSql('VACUUM', []);
                data.forEach(entry => {
                  if (entry.length > 0) {
                    entry.forEach(messageEntry => {
                      db.executeSql(
                        'INSERT INTO messages (pushMessageId, title, message, pushChannelId, channelName) VALUES (?,?,?,?,?)',
                        [messageEntry.pushMessagesId, messageEntry.title, messageEntry.message, messageEntry.pushChannelId, messageEntry.channelName],
                        () => {},
                      );
                    });
                  }
                });
              }
            });
            navigator.notification.alert(translate('{TXT_NOTIFICATION_UPDATE_SUCCESS}'), '', translate('{TXT_CHANGE_NOTIFICATIONS}'));
          });
        });
      }
    });
  });
};
export default alertSettings;
