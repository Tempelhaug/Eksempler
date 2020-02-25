import moment from 'moment';
import L from 'leaflet';
import deviceready from './deviceready';
import * as municipalInfoPage from './subPages/municipalInfoPages';
import './subPages/settingsPage';
import recievedAlerts from './subPages/recievedAlertsPage';
import receiptSetup from './subPages/myReceipts';
import { myAlerts, translateMySettings, translate, translateMyTrips } from './translation';
import myTripsInit from './subPages/myTripsPage';
import database from './database';
import map from '../views/map';
import openImagePicker from './camera';

/**
 * Sets up events that prepares subpages, by injecting the corresponding template into the subPages element and initializes that page(with translation)
 * Also sets up events that handles navigation on subpages that allows us to move back from a subpage to the main view of the app
 * @module components/subpageSetup
 */

deviceready(() => {
  // Loads up the infopages subpage
  $('#infopages').click(() => {
    $.get('templates/subPages/municipal-info-pages.html', tpl => {
      $('#subPages').html(tpl);
      translate('{TXT_MUNICIPAL_INFOPAGES}', '#txt-municipal-infopages');
      municipalInfoPage.municipalitiesListed().then(businessData => {
        municipalInfoPage.setupList(businessData);
      });
    });
  });
  // Loads the settings subpage
  $('#settings').click(() => {
    $.get('templates/subPages/settings-page.html', tpl => {
      $('#subPages').html(tpl);
      translateMySettings();
    });
  });
  // Loads the recievedAlerts subpage
  $('#recievedAlerts').click(() => {
    $.get('templates/subPages/recieved-alerts-page.html', tpl => {
      $('#subPages').html(tpl);
      myAlerts();
      recievedAlerts();
    });
  });
  // Loads the myTrips page
  $('#myTrips').click(() => {
    $.get('templates/subPages/my-trips-page.html', tpl => {
      $('#subPages').html(tpl);
      translateMyTrips();
      myTripsInit();

      let mapTrack;

      // The users stored trips is saved on the internal db and is identified by a UUID, when a trip is selected from the trip list we load that trip with corresponding data onto hte map
      $(document).on('click', '.show-trip', e => {
        const trip = $(e.currentTarget).data('display');

        deviceready(() => {
          database().then(db => {
            db.executeSql('SELECT * FROM savedTrips WHERE guid = ?', [trip], res => {
              const item = res.rows.item(0);
              const trackData = JSON.parse(item.trackData);
              const startTime = moment(item.startTime);
              const endTime = moment(item.endTime);
              const track = L.polyline(trackData);
              mapTrack = track;

              // We add trip data to the trip overview element so that the user gets more info on the selected trip
              $('.trip-name').text(item.title);
              $('.trip-start-date').text(moment.utc(item.startTime).format('DD.MM.YYYY HH.mm'));
              $('.trip-distance').text(item.distance.toFixed(3));
              $('.trip-total-time').text(moment.utc(endTime.diff(startTime)).format('HH:mm:ss'));

              $('#my-trips-page').hide();
              $('#fixed-bottom-menu').hide();
              $('#fixed-top-menu').hide();
              $('#show-trip-header').show();
              $('#my-trip-overview').show();
              $('#map').removeClass('hidden');

              // Invalidate the map and resize it
              map.invalidateSize();
              // Add the track to the map
              track.addTo(map);
              // TODO: Add max bounds to map from polyline here
            });
          });
        });
      });

      // If we want to add an image to the trip we need to select one from the phones imagelibrary
      $('#selectImage').click(() => {
        openImagePicker();
      });
      // Close the trip view and removes Gui elements related to this view
      $('#hide-my-trip').click(() => {
        // Remove the map layer
        map.removeLayer(mapTrack);

        $('#fixed-bottom-menu')
          .show()
          .removeClass('hidden');
        $('#fixed-top-menu')
          .show()
          .removeClass('hidden');

        $('#show-trip-header').hide();
        $('#my-trip-overview').hide();
      });
    });
  });

  // Prepares and opens the myReceipts view
  $('#myReceipts').click(() => {
    $.get('templates/subPages/my-receipts.html', tpl => {
      $('body').addClass('grey-background');
      $('#subPages').html(tpl);
      receiptSetup();
      $('#back-from-receipts').click(() => {
        $('body').removeClass('grey-background');
      });
    });
  });
});
