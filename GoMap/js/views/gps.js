/* eslint-disable no-param-reassign, no-console */

import BackgroundGeolocation from 'cordova-background-geolocation';
import L from 'leaflet';
import uuidv4 from 'uuidv4';
import moment from 'moment';
import deviceready from '../components/deviceready';
import sleep from '../components/sleep';
import { translate, translateGPSModals } from '../components/translation';
import map from './map';
import database from '../components/database';

/**
 * Enables the Gps tracking - this is used when recording a trip, to get data about the trip: track data, length, time etc.
 * Displays trail on the map.
 * @module views/gps
 */

// Set the moment locale
moment.locale('nb');
/**
 * @const debug - If true this script will print debug messages to the console
 */
const debug = false;

// Containers
let player;
let tracker;
let log = [];
let trackerLog = [];
let startTime = null;
let elapsedTime;

// Extend leaflet's Polyline method
L.Polyline = L.Polyline.include({
  getDistance(system) {
    // distance in meters
    let mDistanse = 0;
    // eslint-disable-next-line
    const { length } = this._latlngs;
    for (let i = 1; i < length; i += 1) {
      // eslint-disable-next-line
      mDistanse += this._latlngs[i].distanceTo(this._latlngs[i - 1]);
    }
    // optional
    if (system === 'imperial') {
      return mDistanse / 1609.34;
    }
    return mDistanse / 1000;
  },
});

// Initialize the GPS to make sure we're ready!
deviceready(() => {
  BackgroundGeolocation.ready().then(() => {
    if (debug) console.log('[GPS Manager] Background geolocation manager is configured and ready for use');

    // Decide what to do when the Start/Stop button is pressed
    $(document).on('click', '.gps', async () => {
      // GPS state machine
      const state = await BackgroundGeolocation.getState();
      if (debug) console.log('[GPS Manager] Current state:', state.enabled ? 'Enabled' : 'Disabled');

      // Determine the current action depending on state
      if (!state.enabled) {
        // State is Disabled; Prepare and enable GPS
        BackgroundGeolocation.start().then(async () => {
          if (debug) console.log('[GPS Manager] GPS has been enabled');

          // Reset logs
          log = [];
          trackerLog = [];
          startTime = moment();

          // Switch buttons
          $('.gps-start').hide();
          $('.gps-stop').show();

          elapsedTime = setInterval(() => {
            const ms = moment().diff(moment(startTime).local());
            const d = moment.duration(ms);
            const s = Math.floor(d.asHours()) + moment.utc(ms).format(':mm:ss');
            $('.stopwatch').text(s);
          }, 1000);

          // Wait for 500ms after starting the GPS to show the toast message
          await sleep(500);
          window.plugins.toast.hide();
          window.plugins.toast.showLongCenter(translate('GPS.TOAST.ACTIVATED'));
        });
      } else {
        $.get('templates/modals/gps-modals.html', tpl => {
          // Append modals to body
          $('body').append(tpl);

          translateGPSModals();

          // Show the first modal about stopping GPS mode
          $('#gpsModeEnd').modal('show');

          // Remove modals when they are hidden
          $('#gpsModeEnd').on('hidden.bs.modal', () => {
            $('#gpsModeEnd').remove();
          });
          $('#saveTripModal').on('hidden.bs.modal', async () => {
            // Stop the GPS mode when the save trip modal is hidden either by saving a trip or cancelling
            await BackgroundGeolocation.stop().then(() => {
              if (debug) console.log('[GPS Manager] GPS has been disabled');
              window.plugins.toast.hide();
              window.plugins.toast.showLongCenter(translate('GPS.TOAST.DEACTIVATED'));
            });

            // Top the clock from continuing
            clearInterval(elapsedTime);

            // Show the sporlog section
            $('.distance').text('0.00');
            $('.stopwatch').text('0:00:00');

            // Switch buttons
            $('.gps-start').show();
            $('.gps-stop').hide();

            // Remove the save trip modal
            $('#saveTripModal').remove();
          });

          // Did we want to stop GPS mode?
          $('#stopGPS').click(() => {
            $('#gpsModeEnd').modal('hide');

            // Show the second modal about saving trips
            $('#gpsModeEnd').on('hidden.bs.modal', () => {
              $('#gpsModeEnd').remove();
              $('#saveTripModal').modal('show');
            });
          });

          /**
           * When the user stops a trip they get the option to save that trip. This requires a trip name, and if none exists an error message will appear until a name is given or the user cancels the process
           * Then stores the trip in the internal database with all required data
           */
          $('#saveTrip').click(() => {
            const tripName = $('#saveTripName').val();
            if (tripName.length < 1) {
              window.plugins.toast.showLongCenter(translate('TRIP.TOAST.ERROR'));
            } else {
              database().then(db => {
                db.executeSql(
                  'INSERT INTO savedTrips VALUES (?,?,?,?,?,?,?,?)',
                  [uuidv4(), startTime.format(), moment().format(), tripName, '', JSON.stringify(trackerLog), tracker.getDistance(), 0],
                  () => {
                    $('#saveTripModal').modal('hide');
                  },
                );
              });
            }
          });
        });
      }
    });
  });

  BackgroundGeolocation.onLocation(location => {
    if (debug) console.log('[GPS Manager] Location update:', location);

    // Log data
    log.push(location);
    trackerLog.push([location.coords.latitude, location.coords.longitude, location.coords.altitude]);

    // Player marker
    if (!map.hasLayer(player)) {
      player = L.marker([location.coords.latitude, location.coords.longitude, location.coords.altitude]).addTo(map);
    } else {
      player.setLatLng([location.coords.latitude, location.coords.longitude, location.coords.altitude]);
    }

    // Tracker
    if (!map.hasLayer(tracker)) {
      tracker = L.polyline(location.coords.latitude, location.coords.longitude, location.coords.altitude).addTo(map);
    } else {
      tracker.addLatLng([location.coords.latitude, location.coords.longitude]);
    }

    // Update the distance
    $('.distance').text(tracker.getDistance().toFixed(2));

    // Debug
    console.log('[GPS Manager] Current distance:', tracker.getDistance());
  });
});
