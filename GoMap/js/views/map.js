/* eslint-disable no-console */
import L from 'leaflet';
import moment from 'moment';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet.pattern';
import 'leaflet.markercluster';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility';
import '../tweaked_node_modules/leaflet-offline/src/leaflet-offline';
import 'tilelayer-kartverket';
import * as tilesDb from '../components/tile.database';
import deviceready from '../components/deviceready';
import 'leaflet-ajax';
import mapdata from '../components/mapdata';
import { translate } from '../components/translation';

/**
 * The map object used in the app. Uses leaflet as a base, and has separate layers for offline and online mapview. This is the main viewport of the app
 * When we try do download a map, or if we are viewing an offline map we remove the onlineLayer and add the offlineLayer.
 * Else we remove the offlinelayer from the map and add the onlinelayer.
 * @module views/map
 */

/**
 * @constant {bool} debug - A boolean switch to help debug. If set to true this script will print out debug messages in the console.
 */
const debug = false;
/**
 * @constant {String} mode - If set to 'development' it will not try to load mapmetadata to the map. Due to issues in the way we retrieve the mapmetadata it will not display properly when run on an emulator and it will print out a lot of errors. Setting this to development helps in keeping the console as empty as possible when deveoping
 */
const mode = 'development';
/**
 * @constant {Object} map - The map object that we use to display map data on.
 */
const map = L.map('map', {
  center: [65.833472, 13.199444],
  zoom: 9,
  attributionControl: false,
  zoomControl: false,
});

let offlineMapName;
let downloadedOfflineLayer;

/**
 * @constant {tileLayer} onlineLayer - This is the default map layer in the map, uses the topo4 layer from kartverket.
 */
const onlineLayer = L.tileLayer.kartverket('topo4');

/**
 * The offline map layer - Due how this layer will attempt to fetch layers from the internal database we only use this layer when downloading or displaying an offline map.
 *
 * The tilelayer constructor has some additional parameters: L.tilelayer.offline(mapUrl, tileDatabase, offlinemapName, options)
 * @param mapUrl -  the url we try to fetch this map tile from - the {s} element is the specific subdomain so that under heavy load we have multiple options of where we try to get a tile
 *                  the {z}, {x}, {y} element represents the zoom, and x,y coordinates of the tile we want.
 * @param tileDatabase - the tiledatabase is the functions we use to store and fetch the offlinetiles, the tilesDb is our custom setup for storing maptiles on the internal database
 * @param offlinemapName - Tells the layer what offline map it is displaying if any. When this is set to 'null' we're not trying to access any specific offline map, and is used when downloading an offline map.
 * @param options - This are the specific options we initialize this tilelayer with: subdomains is the different subdomains we will attempt to fetch online tiles from, min zoom is the minimum zoomlevel that is possible.
 * with a minimum zoom level of 6 we can view almost all of Norway in the main view, so less zoom than this is unnecessary at this moment. maxZoom at 17 allows us to see buildings on the map and zoomlevels
 * higher than this is unnecessary since you cant get better level of detail.
 * maxBounds is set to null since there is no point in limiting the map view within a set bounds when trying to download map.
 */
const offlineLayer = L.tileLayer.offline('https://{s}.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', tilesDb, 'null', {
  subdomains: ['opencache', 'opencache2', 'opencache3'],
  minZoom: 6,
  maxZoom: 17,
  maxBounds: null,
});

/**
 * Sets up the controls for the offline map.
 * The constructor needs the follofing parameters: L.control.offline(layer, tiledatabase, options)
 * @param layer -this is the layer we want to add this control to, and that layer needs to have the .offline exension - in this case that will be the offlineLayer
 * @param tilesDb - how we store the tiles, same as the offlineLayer constructor
 * @param options - Here we control what zoomlevels we allow the user to download:
 *        minZoom: This is the minimum zoomlevel we can download, if the current zoom is less than this the download will start at the set minZoom level
 *        maxZoom: This is the maximum zoomlevel we can download, if the current zoom is higher than this we wont download anything at all, and when we reach this zoomlevel during download we will stop
 *        maxOfflineZoomLevels:  This sets the amount of zoomlevels we allow the user to download. It will start with the current zoom and then download zoomlevels each zoom level higher than the current until this limit is reached
 *
 * @note regarding maxOfflineZoomLevels testing showed that when downloading more than 4 zoomlevels the app has a high risk of freezing, due to the sheer amount of tiles it tries to download.
 * @note With the max zoomlevel set to 4 we will average close to 1000 tiles downloaded and that map instance will be about 20mb. Each added zoomlevel will atleast quadruple the size (since we download whats in the viewport and not
 * the actual tiles we can have instances where we at the min zoomlevel need to download 8 tiles in some cases and 4 in others)
 */
const offlineControl = L.control.offline(offlineLayer, tilesDb, {
  minZoom: 6,
  maxZoom: 17,
  maxOfflineZoomLevels: 4,
});

// The map tiles
onlineLayer.addTo(map);

// If we're moving away from displaying an offline map we remove the offline layer and control from the map and add the onlineLayer
$(document).on('click', '.notOfflineMap', '#offline-maps-download-menu-hide, #cancelDownloadOfflineMap', () => {
  map.removeLayer(offlineLayer);
  map.removeControl(offlineControl);
  onlineLayer.addTo(map);
});

// Resets the map options and removes all layers and adds the online layer back to the map
$(document).on('click', '#offline-maps-view-hide', () => {
  map.removeLayer(downloadedOfflineLayer);
  onlineLayer.addTo(map);
  map.options.minZoom = 5;
  map.options.maxZoom = 19;
  map.setMaxBounds(false);
  $('#offline-maps-view-top').addClass('hidden');
  $('#fixed-top-menu').removeClass('hidden');
  // Hide the bottom menu
  $('#fixed-bottom-menu').removeClass('hidden');
});

/**
 * When we want to display a specific the user will select a map from the offline map list and we load that map layer to the map.
 *
 * The clickable element in the offline map list contains all datafields we require to set things like zoomlevels that are downloaded and the bounds of that offline map.
 * Since we unload the onlineLayer when view an offline map, we can only display the tiles that were downloaded, this means that if the user zooms to a zoom level that wasnt downloaded
 * we wont find any tiles, and the map will turn grey. The same will happen if the user were to move the map view outside of the bounds that was downloaded
 * Because of this we set minZoom and maxZoom levels based on the zoomlevels of the map that was downloaded, in addition to setting the map bounds to the bounds of the downloaded map.
 *
 * @note Note how we use the tilelayer with the offline extension but this time we have an actual value in the 'name' parameter, so that we will try to access the tiles of that map in the database.
 */
$(document).on('click', '.showOfflineMap', e => {
  // We remove all maplayers from the map.
  map.removeLayer(onlineLayer);
  map.removeLayer(offlineLayer);

  // Based on the element the user clicked we have different map bounds and zoom levels for each downloaded map, so we need to fetch those.
  const minY = $(e.currentTarget).data('nelat');
  const minX = $(e.currentTarget).data('nelng');
  const maxY = $(e.currentTarget).data('swlat');
  const maxX = $(e.currentTarget).data('swlng');
  const minZoom = $(e.currentTarget).data('minzoom');
  const maxZoom = $(e.currentTarget).data('maxzoom');

  // Display the name of the selected map on the mapHeader bar, so the user knows what map it has selected
  $('#offlineMapViewText').text(`               ${$(e.currentTarget).data('name')}`);

  // Initialize an offline layer the same way we did earlier, but instead of name beaing 'null' we pass the name of the map the user selected
  downloadedOfflineLayer = L.tileLayer.offline('https://{s}.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}', tilesDb, $(e.currentTarget).data('val'), {
    subdomains: ['opencache', 'opencache2', 'opencache3'],
    minZoom,
    maxZoom,
  });

  downloadedOfflineLayer.addTo(map);

  // We pan  the map to fit the bounds of the downloaded map, so that the user isnt stuck in a bunch of empty tiles, and we force the bounds of the map to be withing the downloaded bounds.
  map.fitBounds([[minY, minX], [maxY, maxX]]);
  map.setMaxBounds([[minY, minX], [maxY, maxX]]);

  // Set min/max zoomlevels
  map.options.minZoom = minZoom;
  map.options.maxZoom = maxZoom;

  // Hide the offlineMaps menu
  $('#offline-maps-menu-top').addClass('hidden');
  // Show header that displays the name of the offline map that is active and allows us to navigate back to the normal map
  $('#offline-maps-view-top').removeClass('hidden');

  // Hide the offline maps page and show the map
  $('#map').removeClass('hidden');
  $('#offlineMaps').addClass('hidden');
});

/**
 * If the user wants to download a map we ensure that the tilesDb is prepared for setup and is ready before we start the download process.
 */
$('#downloadOfflineMap').click(() => {
  deviceready(() => {
    // initialize the tilesDb, just to ensure that the required tables exists on the phone
    tilesDb.setup();
    // Check if the tilesDb is prepared to handle any request
    tilesDb.dbReady().then(() => {
      // Remove the onlinelayer
      map.removeLayer(onlineLayer);
      // Add offlinelayer and offlineControl
      offlineLayer.addTo(map);
      offlineControl.addTo(map);

      // Add an eventlistener that displays a message to the user when the download process has completed
      offlineLayer.on('offline:save-end', () => {
        window.plugins.toast.showLongCenter(translate('OFFLINE.TOAST.STARTED'));
      });
    });
  });
});

// Handles navigation events so that the map view is cleaned up if the offline save section is active
$('.notOfflineMap')
  .off()
  .click(() => {
    // hide download options
    if (!$('#offline-map-save-section').is(':visible')) return;

    $('#offline-map-save-section').addClass('hidden');
    $('#offlineMapName').val('');

    $('#home').click();
  });

// Cleans up view when moving away from offline map view
$('.notOfflineMapMenu')
  .off()
  .click(() => {
    // hide download options
    $('#offline-map-save-section').addClass('hidden');
    $('#offlineMapName').val('');
  });

/**
 * Activates downloading of offline maps. Hide and display the GUi components required for offlineMapdownload to function properly
 * Opens up a text inputfield that allows the user to input a name for the offlinemap
 */
$('#downloadOfflineMap').click(() => {
  deviceready(() => {
    // Show download options
    $('#offline-map-save-section').removeClass('hidden');
    $('#offline-save-button').removeClass('btn-success');
    $('#offline-save-button').addClass('btn-light');

    // If the user enters something into the offlineMapName field we store the variable
    $('#offlineMapName').change(e => {
      offlineMapName = $(e.currentTarget).val();
    });

    /**
     * Starts download of offlinemap. If no offlineMapName is supplied we will use the current time as the name instead
     * Sends the map name into the saveOfflineMap function and awaits for the first step of the saving process to complete,
     * this function will return an uuid generated for that offlinemap instance.
     * The second step of the saving process is to store the map tiles, this returns the settings of the current map(zoomLevels and bounds is the most important ones)
     * The final step in the saving process is to store info about the downloaded map, such as bounds and zoomlevels.
     * When this step is complete we clear the offlinemapName input field and remove the gui elements for saving an offline map
     */
    $('#offline-save-button')
      .off()
      .click(() => {
        SpinnerDialog.show(null, null, true);
        // If no name is supplied we use the current time as the name instead - them always need a name so that its easier for the user to separate different maps
        if (!offlineMapName) {
          offlineMapName = moment().format('DD-MM-YYYY HH:mm:ss');
        }
        let mapId;
        // Initial step of saving an offline map.
        tilesDb.saveOfflineMap(offlineMapName).then(id => {
          mapId = id;
          // The second step of saving an offline map - saves the tiles into the database
          // eslint-disable-next-line no-underscore-dangle
          offlineControl._saveTiles(mapId).then(settings => {
            // We need to save the map on a map id, so that the system knows the difference between the different maps
            if (mapId) {
              // Final step in storing an offline map - saves things like mapbounds and zoom settings
              tilesDb.updateOfflineMap(mapId, settings.tileUrlLength, JSON.stringify(settings.offlineBounds), settings.currentZoom, settings.maxZoomlevels);
              $('#offlineMapName').val('');
              $('#offline-map-save-section').addClass('hidden');
            }
          });
        });
      });
  });
});

/**
 * Due to issues with accessing the localfilesystem when running in emulator we can disable loading of map metadata when developing, since it would clutter the console with errors
 */
if (mode !== 'development') {
  /**
   * Here we load map data to the map - things like tracks and markers are added here, on an interval so that if it fails it will retry until it has managed to laod map data
   * @note We ran into issues with accessing the local filesystem so this part will most likelay not work on emulator
   */
  const loadMapTracks = setInterval(() => {
    // In order to load elements to the map we need the map to be activated before we start loading elements. We also want the map to complete loading as soon as possible since its the main feature of the app
    if ($('#map').is(':visible')) {
      deviceready(() => {
        /**
         * We use groups to group up map elements, this combines elements that are too close together and would overlap and makes it easier for the user to navigate the map.
         * Some elements - like tracks wont be combined since they are supposed to be attached to each other.
         */
        const markerClusters = L.markerClusterGroup().addTo(map);
        const disabledTrack = L.featureGroup().addTo(map);
        const snowmobileTracks = L.featureGroup().addTo(map);
        const limitedArea = new L.StripePattern({ color: '#DC143C' }).addTo(map);

        /**
         * @function styles - Builds a feature and adds it to the map. A feature is any type of map element,such as a track, or a marker.
         *
         * @param {L.feature} feature contains data on what type of featire this is.
         * @param {L.layer} layer what map layer we want to add the supplied feature to.
         *
         * @todo Add clickevent to Poi cards so that they will be displayed on clicks on proper icons
         */
        const styles = (feature, layer) => {
          layer.on('click', () => {
            console.log(feature);
          });
          // If feature.geometry.type = 'point' we need to place a marker for that point on the map
          if (feature.geometry.type === 'Point') {
            // For each 'point' we add we check what icon that point needs, and we use the mapdata() function to generate the marker we need. And if there is no title we justuse the standard marker popup to display more info about the marker
            if (feature.properties.icon === 'rest') {
              mapdata('rast').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'park') {
              mapdata('park').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'info') {
              mapdata('info').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'warning') {
              mapdata('closed').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'accomodation') {
              mapdata('accomodation').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'doctor') {
              mapdata('doctor').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'food') {
              mapdata('food').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'gas') {
              mapdata('gas').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'icefish') {
              mapdata('icefish').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'skii') {
              mapdata('skii').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'store') {
              mapdata('store').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            if (feature.properties.icon === 'workshop') {
              mapdata('workshop').then(icon => {
                layer.setIcon(icon);
              });
              if (feature.properties.title !== '') {
                layer.bindPopup(`<h4>${feature.properties.title}</h4><p>${feature.properties.bodyText}</p>`);
              }
            }
            layer.addTo(markerClusters);
          }
          // If feature.geometry.tyoe = 'polygon' we need to place track markers and add the mto the correct feature group: disabledTrack || snowmobile tracs || limitedArea
          if (feature.geometry.type === 'Polygon') {
            const type = feature.properties.fillType;

            // If type is 1 then this area is limited and we need to differntiate this track from normal tracks by adding a different style
            if (type === 1) {
              layer
                .setStyle({
                  fillPattern: limitedArea,
                  color: '#111#',
                  opacity: 0.5,
                  weight: 3,
                })
                .addTo(snowmobileTracks);
            }
            // Else if it is just a normal track we add the normal style to this track
            else {
              layer
                .setStyle({
                  color: '#111',
                  opacity: 0.5,
                  fillColor: '#3388ff',
                  fillOpacity: null,
                  weight: 3,
                })
                .addTo(snowmobileTracks);
            }
          }
          // If feature.geometry.type = 'Linestring' we are dealing with an area that has been marked up
          if (feature.geometry.type === 'LineString') {
            const props = feature.properties;
            // If props.isActivated is not undefined there is nothing specific aobut this track, so we just add it normally - based on the tracktype (maintrack  or sidetrack)
            if (props.isActivated !== undefined) {
              if (props.isActivated) {
                if (props.trackType === 0) {
                  layer.setStyle({
                    color: '#990f04',
                    dashArray: null,
                    opacity: 1,
                    weight: 6,
                  });
                } else {
                  layer.setStyle({
                    color: '#205aaa',
                    dashArray: null,
                    opacity: 1,
                    weight: 6,
                  });
                }
              } else {
                layer.setStyle({
                  color: '#990f04',
                  dashArray: '3,9',
                  opacity: 1,
                });
              }
              layer.addTo(snowmobileTracks);
            }
            // If props.isActivated is undefined, then this track needs to be marked as disabled
            else {
              layer.setStyle({
                weight: 12,
                dashArray: '3,16',
                color: '#effd5f',
                opacity: 1,
              });
              layer.addTo(disabledTrack);
            }
          }
          disabledTrack.bringToFront();
        };

        /**
         * In order to load metadata to  the map, we need to fetch it from the local Filesystem first.
         * For each file we read through the file and add each feature to the map using the styles function
         */
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
          const directoryReader = dirEntry.createReader();
          directoryReader.readEntries(files => {
            // Debug printing - If metadata files wont load this block will print out all files stored on thelocal filesystem for the app
            if (debug) {
              console.log('----------------------- LOCAL FILESYSTEM ----------------------');
              console.log('===============================================================');
              console.log('========================= DIRECTORIES =========================');
              console.log('===============================================================');
              files.forEach(item => {
                if (item.isDirectory) {
                  console.log(item.nativeURL);
                }
              });
              console.log('');
              console.log('===============================================================');
              console.log('============================ FILES ============================');
              console.log('===============================================================');
              files.forEach(item => {
                if (item.isFile) {
                  console.log(item.nativeURL);
                }
              });
              console.log('----------------------- LOCAL FILESYSTEM ----------------------');
            }

            /**
             * Load files from the local file system
             */
            files.forEach(item => {
              if (item.isFile) {
                // We read the file and try to add each feature in the file to the map
                // eslint-disable-next-line
                new L.GeoJSON.AJAX(item.nativeURL, { local: true, onEachFeature: styles });
              }
            });
            // If we loaded all map icons to the map we dont have to retry
            clearInterval(loadMapTracks);
          });
        });
      });
    } else {
      console.log('Map not visible, trying again in 1.5s ...');
    }
  }, 1500);
}

export default map;
