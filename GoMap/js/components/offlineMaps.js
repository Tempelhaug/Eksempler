/* eslint-disable no-underscore-dangle */
import moment from 'moment';
import deviceready from './deviceready';
import db from './database';
import * as tilesDb from './tile.database';
import { translate } from './translation';

/**
 * Sets up the myOfflineMaps page. Fetches all downloaded maps from the internal database and builds them into a list of clickable cards, so that the user can select which offlineMap they want
 * to display or delete. Maps have a set duration as indicated on the offlineMapDuration constant
 * @module components/offlineMaps
 */

let offlineDb = null;
/**
 * @constant {Integer} offlineMapDuration - This is read as number of days, so that if its set to 14 a map will be deleted 14 days after the map was downloaded
 */
const offlineMapDuration = 14;

moment.locale('nb');

deviceready(() => {
  db().then(database => {
    offlineDb = database;
  });
});

// Creates a card displaying all maps the user has stored on the phone
$('#myOfflineMaps').click(() => {
  // Show the myOfflineMaps menu
  $('#offline-maps-menu-top').removeClass('hidden');
  // Hide the map menu buttons
  $('#fixed-top-menu').addClass('hidden');
  // Hide the bottom menu
  $('#fixed-bottom-menu').addClass('hidden');
  if (offlineDb) {
    tilesDb.getMaps().then(result => {
      if (result.rows.length !== 0) {
        // Used to check if we have added an offline map or not
        let addedMaps = 0;
        $('#offlineMapList').html('');
        for (let i = 0; i < result.rows.length; i += 1) {
          const item = result.rows.item(i);
          let imageData;
          // If something went wrong in the download of the map, it is possible that the map preview wasnt stored correctly, in order for the page to still load in such cases we need to check if the image data exists
          // If id doesnt we set it to an empty string and add text to the image noting that an error occured
          if (item.mapPreview) {
            imageData = JSON.parse(item.mapPreview);
            if (imageData) {
              imageData = imageData.data;
            } else {
              imageData = '';
            }
          } else {
            imageData = '';
          }
          let bounds = JSON.parse(item.bounds);
          let corruptText = '';
          // If an error occured during download of offlinemap it is possible that we dont have any bounds related to the map, in such a case we have to manually set the bounds to 0 so that the page will still load
          if (!bounds) {
            corruptText = 'ERROR';
            bounds = {
              _northEast: {
                lat: 0,
                lng: 0,
              },
              _southWest: {
                lat: 0,
                lnt: 0,
              },
            };
          }
          /**
           * In order to determine when a map expires we have to fetch the download date of the map and create an expiry date an expiry hour so that we can check if a map is expired or not
           */
          const expiryDate = moment(item.createTime)
            .add(offlineMapDuration, 'days')
            .format('L');
          const expiryHour = moment(item.createTime)
            .add(offlineMapDuration, 'days')
            .format('LT');
          if (
            moment(item.createTime)
              .add(1, 'hour')
              .valueOf() -
              moment().valueOf() <
            0
          ) {
            tilesDb.clear(item.mapId);
          } else {
            addedMaps += 1;
            // If a map was found we set up a card that contains some data that is displayed to the user, and some data that is used if the user clicks that element and wants to open  that offline map
            // We display remaining duration of this offlinemap on the card, but if that duration is less than 24hours we change the color of the text for that card to red
            $('#offlineMapList').append(
              `
            <div class="my-2">
              <div id="mapCard" class="card mx-auto" style="width:85%;">
              <div class="view overlay mb-2 image-container showOfflineMap" style="width: 100%; height:150px; display:block; position:relavitve; overlow:hidden;" data-name="${
                item.mapName
              }" data-nelat="${bounds._northEast.lat}" data-nelng="${bounds._northEast.lng}" data-swlat="${bounds._southWest.lat}" data-swlng="${bounds._southWest.lng}" data-minZoom="${
                item.minZoom
              }"  data-maxZoom="${item.maxZoom}" data-val="${item.mapId}" id="mapPicture">${corruptText}  
              <img class="card-img-top" src="data:image/png;base64, ${imageData}" alt="mapPreview">
              <a><div class="mask rgba-white-slight"></div></a>
            </div>
                <h4 class="card-title text-center text-secondary font-weight-bold">${item.mapName}
                  <span style="float:right;" class="mr-3 deleteThisMap">
                    <a class="btn-link" href="#"><i class="far fa-trash-alt fa-xs deleteThisMap" data-val="${item.mapId}"></i></a>
                  </span></h4>
                <h6 class="card-content text-center">${translate('{TXT_DOWNLOADED}')}: ${moment(item.createTime).format('L')} ${moment(item.createTime).format('LT')} 
                  <br> Utløper: <a ${
                    moment(item.createTime)
                      .add(offlineMapDuration, 'hour')
                      .valueOf() -
                      moment().valueOf() <
                    8640000
                      ? 'style="color: red;"'
                      : ''
                  }>${expiryDate} ${expiryHour} </a>
                  <br> ${translate('{TXT_SIZE}')}: ${item.size > 1000000 ? `${Math.round((item.size / 1000000) * 100) / 100}Mb` : `${Math.round((item.size / 1000) * 100) / 100}Kb`}!
                </h6>
              </div>
              <br />
            </div>`,
            );
          }
        }
        if (addedMaps === 0) {
          // IF we for some reason suddenly have no maps(All stored maps was expired and therefore deleted) We have to display a message noting that we found no maps
          $('#offlineMapList').html(`
          <div class="col mt-5 mx-2 text-center">
            <b id="noOfflineMapsDownLoaded">${translate('{TXT_NO_OFFLINE_MAPS_DOWNLOADED}')}</b>
          </div>`);
        }
      } else {
        // If no maps were found we display a message noting that no maps was found
        $('#offlineMapList').html(`
        <div class="col mt-5 mx-2 text-center">
          <b id="noOfflineMapsDownLoaded">${translate('{TXT_NO_OFFLINE_MAPS_DOWNLOADED}')}</b>
        </div>`);
      }
    });
  }
});

// Handles removal of a map. Will delete the clicked map from the database and then remove it from the view
$(document).on('click', '.deleteThisMap', e => {
  if (offlineDb) {
    tilesDb.clear($(e.currentTarget).data('val'));
    $(e.currentTarget)
      .parentsUntil('#offlineMapList')
      .remove();
  }
});

// Hide the myOfflineMapsView view
$('#offline-maps-menu-hide').click(() => {
  // Hide the offlineMaps menu
  $('#offline-maps-menu-top').addClass('hidden');
  // Show the map menu buttons
  $('#fixed-top-menu').removeClass('hidden');
  // Show the bottom menu
  $('#fixed-bottom-menu').removeClass('hidden');

  // Hide the offline maps page and show the map
  $('#map').removeClass('hidden');
  $('#offlineMaps').addClass('hidden');
});
