import L from 'leaflet';

/**
 * Set up map markers for use on the map
 *
 * @module components/mapdata
 */

/**
 * Creates a map marker based on the name it receives. Builds the marker and attaches a marker image based on the name it recieves
 *
 * @param {String} name - the identifying name for the marker type we want the image for.
 *
 * @returns - A promise that resolves the mapMarker it has created when it is created.
 */
const mapdata = name => {
  const mapdataPromise = new Promise((resolve, reject) => {
    if (!name) {
      const error = 'No icon name supplied';
      reject(error);
    } else {
      let mapIconUrl;

      // Based on the name we receive we fetch the correct image file that we want to attach to the marker
      if (name === 'info') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/info_icon.png`;
      } else if (name === 'poiCard') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/POI_icon.png`;
      } else if (name === 'park') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/parking_icon.png`;
      } else if (name === 'rast') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/rast_icon.png`;
      } else if (name === 'accomodation') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/accomodation_icon.png`;
      } else if (name === 'doctor') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/doctor_icon.png`;
      } else if (name === 'food') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/food_icon.png`;
      } else if (name === 'gas') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/gas_icon.png`;
      } else if (name === 'icefish') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/icefish_icon.png`;
      } else if (name === 'skii') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/skii_icon.png`;
      } else if (name === 'store') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/store_icon.png`;
      } else if (name === 'workshop') {
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/workshop_icon.png`;
      } else if (name === 'closed') {
        // If the name is closed the marker we create is a bit different than the rest, i.e. it doenst have a marker shadow
        mapIconUrl = `${cordova.file.applicationDirectory}www/images/map/closed_icon.png`;

        const mapIcon = L.icon({
          iconUrl: mapIconUrl,
          iconSize: [50, 44],
          iconAnchor: [25, 22],
        });

        resolve(mapIcon);
      } else {
        const rejection = `Map icon ${name} doesn't exist.`;
        reject(rejection);
      }

      // If we received a name and the name wasnt closed we build all other markers the same way and attach a markershadow to the marker
      const mapIcon = L.icon({
        iconUrl: mapIconUrl,
        shadowUrl: `${cordova.file.applicationDirectory}www/images/map/markers_shadow.png`,
        iconSize: [35, 45],
        iconAnchor: [17, 42],
        popupAnchor: [1, -32],
        shadowAnchor: [10, 12],
        shadowSize: [36, 16],
      });

      resolve(mapIcon);
    }
  });
  return mapdataPromise;
};
export default mapdata;
