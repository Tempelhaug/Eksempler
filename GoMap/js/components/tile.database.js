/* eslint-disable no-unused-expressions */
/* eslint-disable no-loop-func */
/* eslint-disable no-console */
import moment from 'moment';
import uuid from 'uuidv4';
import db from './database';
import deviceready from './deviceready';
import * as blobFunctions from './blobFunctions';
import { translate } from './translation';

/**
 * Responsible for storing and handling the tiles and maps used for offlinemaps.
 * Contains methods for downloading and saving maps and maptiles using the internal database (sqlite)
 * @module components/tile.database
 */

/**
 * @constant {bool} Debug - If true this script will print debugmessages to the console
 */
const Debug = false;
/**
 * @var {bool} rejected - An additional check used when downloading tiles. If download fails too many times we will have a missing tile in the map download and this variable is set to true to mark that
 */
let rejected = false;
/**
 * @constant {Integer} numberOfRetries - Controls how many times we will try to download a tile. @note during testing we rarely had any retries as the download usually worked first try
 */
const numberOfRetries = 5;
let offlineDb = null;

// Sets up the reference to the internal database, so that we can use the internal database
deviceready(() => {
  db().then(database => {
    offlineDb = database;
  });
});

/**
 * Tries to create the tables required to use the offlineMap download system.
 */
export const setup = () => {
  deviceready(() => {
    db().then(database => {
      if (database) {
        database.executeSql(
          'CREATE TABLE IF NOT EXISTS offlineMaps (tileId STRING, tileUrl STRING, tileData STRING, mapId STRING)',
          [],
          () => {},
          e => {
            Debug ? console.warn(JSON.stringify(e)) : '';
          },
        );
        database.executeSql(
          'CREATE TABLE IF NOT EXISTS offlineMapData (mapId STRING, mapName STRING, createTime STRING, size INTEGER, mapPreview STRING, bounds STRING, minZoom STRING, maxZoom STRING)',
          [],
          () => {},
          e => {
            Debug ? console.warn(JSON.stringify(e)) : '';
          },
        );
      }
    });
  });
};

/**
 * Updates the offlinemap tables with new data. Some data is not know when we start the download, such as amount of tiles we have downloaded so we use
 * this method to update mapdata when the download has completed. This function waits a bit before executing incase mapdownload hasnt completed yet. It also contains a callback
 * incase the download still hasnt completed.
 *
 * @todo Set up a better way of selecting preview tile, currently just selects the first downloaded tile
 *
 * @param {String} mapId - the unique UUID for the Map we are updating
 * @param {Integer} tileAmount - the amount of tiles downloaded for this mapId
 * @param {L.Bounds} mapBounds - Bounds of the current map download
 * @param {Integer} minZoom  - The minimum zoom for this map download
 * @param {Integer} maxZoom  - The maximum zoom for this map download
 */
export const updateOfflineMap = (mapId, tileAmount, mapBounds, minZoom, maxZoom) => {
  // Wait 5 seconds before executing to give the download a better chance at being done
  setTimeout(() => {
    if (offlineDb) {
      offlineDb.executeSql(
        'SELECT * FROM offlineMaps WHERE mapId = ?',
        [mapId],
        result => {
          // Compare the amount of tiles passedto the function to the actual amount of tiles stored. If this doesnt match the download is not complete and we need to wait longer before updating mapdata
          if (result.rows.length !== tileAmount) {
            updateOfflineMap(mapId, tileAmount, mapBounds, minZoom, maxZoom);
          } else {
            let size = 0;
            // Calculate the total size of the map download
            for (let i = 0; i < result.rows.length; i += 1) {
              const item = result.rows.item(i).tileData;
              size += JSON.parse(item).size;
            }
            // Takes the first map tile in the data set and uses it as a preview tile - this is the tile the user will see when selecting offlinemaps to display.
            const mapPreview = result.rows.item(0).tileData;
            offlineDb.executeSql(
              'UPDATE offlineMapData SET size = ? , mapPreview = ?, bounds = ?, minZoom = ?, maxZoom = ?  WHERE mapId = ?',
              [size, mapPreview, mapBounds, minZoom, maxZoom, mapId],
              () => {},
              e => {
                Debug ? console.warn(JSON.stringify(e)) : '';
              },
            );
            deviceready(() => {
              // When download is completed we hide the spinner and open up the list of downloaded offlinemaps
              SpinnerDialog.hide();
              $('#txt_my_offline_maps').trigger('click');
              window.plugins.toast.showLongCenter(translate('OFFLINE.TOAST.COMPLETE'));
            });
          }
        },
        e => {
          Debug ? console.warn(JSON.stringify(e)) : '';
        },
      );
    }
  }, 5000);
};

/**
 * Returns all id, name, size, preview image, bounds and zoomlevels for all maps stored in the internal databse
 *
 * @returns A promise that resolves with with data about all downloaded offlinemaps
 */
export const getMaps = () => {
  const getMapsPromise = new Promise((resolve, reject) => {
    if (offlineDb) {
      offlineDb.executeSql(
        'SELECT * FROM offlineMapData',
        [],
        resultSet => {
          Debug ? console.info(`[Offline Map] Fetched stored mapinfo`) : '';
          resolve(resultSet);
          return getMapsPromise;
        },
        e => {
          Debug ? console.warn(JSON.stringify(e)) : '';
          reject();
          return getMapsPromise;
        },
      );
    }
    return getMapsPromise;
  });
  return getMapsPromise;
};

/**
 * Prepares a new table entry for offlimeMapData and inserts initial values to the map instance
 *
 * @param {String}  mapId - The uuid of the map we want to prepare data for - Identifier used in the system to differentiate between different maps
 * @param {String} mapName - The name of the map we are downloading - Identifier displayed for users to differentiate between different maps
 * @param {String} createTime - The time when mapDownload started. Used to determine duration of offlinemap,
 *
 * @returns A promise that resolves when data has been inserted into the internal database
 */
export const newMap = (mapId, mapName, createTime) => {
  const newMapPromise = new Promise((resolve, reject) => {
    if (offlineDb) {
      offlineDb.executeSql(
        'INSERT INTO offlineMapData (mapId, mapName, createTime, size, mapPreview) VALUES (?,?,?,?,?)',
        [mapId, mapName, createTime, 0, 'null'],
        () => {},
        e => {
          Debug ? console.warn(JSON.stringify(e)) : '';
          reject();
          return newMapPromise;
        },
      );
      Debug ? console.info(`[Offline Map] New map: ${mapId} created on device`) : '';
      resolve();
    }
  });
  return newMapPromise;
};

/**
 * Initial step when downloading a map. Fetches the current time, and generates a UUId for this map instance and then runs the newMap() function to set up tables.
 *
 * @param {String} offlineMapName - The name the user created for this offlinemap
 *
 * @returns A promise that resolves the mapId when the required entries has been created in the internal database
 */
export const saveOfflineMap = offlineMapName => {
  const saveOfflineMapPromise = new Promise(resolve => {
    if (offlineDb) {
      const createTime = moment();
      const mapId = uuid();
      newMap(mapId, offlineMapName, createTime.format()).then(() => {
        resolve(mapId);
      });
    }
  });
  return saveOfflineMapPromise;
};

/**
 * Check if database is prepared to handle requests
 *
 * @returns a promise that resolves when database is ready
 */
export const dbReady = async () => {
  const dbReadyPromise = new Promise(resolve => {
    setTimeout(() => {
      if (offlineDb) {
        resolve();
        return dbReadyPromise;
      }
      return dbReadyPromise;
    }, 300);
    return dbReadyPromise;
  });
  return dbReadyPromise;
};

/**
 * Fetch a specific tile from the internal database - Used when displaying offline maps on the map container
 *
 * @param {String} key - the identifier of the tile we want (usually partly the url of the tile with zoom levels and x,y coordinates filled in)
 * @param {String} mapId  - The id of the map we want to get the tile from
 *
 * @returns A promise that resolves either as empty if no tile was found, or resolves with a tile that has been turned into a blob
 */
export const getItem = (key, mapId) => {
  return new Promise((resolve, reject) => {
    if (offlineDb) {
      offlineDb.executeSql(
        'SELECT * FROM offlineMaps where tileId = ? AND mapId = ?',
        [key, mapId],
        resultSet => {
          // If the query returned empty, we haven stored the requested tile in the database and we resolve empty
          if (resultSet.rows.length < 1) {
            resolve();
          }
          // If the query returned a result that means we have stored the requested tile, we need to turn it into a blob so that the map can display this tile
          const tileResult = JSON.parse(resultSet.rows.item(0).tileData);
          const blobResult = blobFunctions.decodeBlob(tileResult);
          Debug ? console.info(`[Offline Map] Fetched tiledata from tileId ${key}!`) : null;
          resolve(blobResult);
        },
        e => {
          reject(e);
        },
      );
    }
  });
};

/**
 * @deprecated
 * Check if tiledownload had errors
 */
export const isRejected = () => {
  return rejected;
};

/**
 * Deletes all data about the supplied mapId
 *
 * @param {String} mapId - the UUID of the map we want to delete
 *
 * @returns A bool that signifies if the deletion was successful or not
 */
export const clear = mapId => {
  if (offlineDb) {
    offlineDb.executeSql(
      'DELETE FROM offlineMaps WHERE mapId = ? ',
      [mapId],
      () => {},
      e => {
        // An error occured when deleting map - deletion not successful
        Debug ? console.warn(JSON.stringify(e)) : '';
        return false;
      },
    );
    offlineDb.executeSql(
      'DELETE FROM offlineMapData WHERE mapId = ? ',
      [mapId],
      () => {},
      e => {
        // An error occured when deleting map - deletion not successful
        Debug ? console.warn(JSON.stringify(e)) : '';
        return false;
      },
    );
    // If we reached this point, the mapdata has been deleted successfully
    Debug ? console.info(`[Offline Map] Deleted map ${mapId}!`) : '';
    return true;
  }
  // Database not ready yet, cannot delete map
  Debug ? console.warn(`[Offline Map] Could not connect to database`) : '';
  return false;
};

/**
 * Checks if the supplied mapTile exists in the database, if it does it deletes it. This is to prevent a tile being downloaded twice for a mapId
 *
 * @param {String} mapId - The id of the map we're looking up
 * @param {Object} key - An object that has the tile identifier and theUrl for the tile
 *
 * @returns A bool that lets us know if something wrong happened. Will return true if a tile was found and deleted or if no matching tiles where found
 */
export const removeItem = (mapId, key) => {
  if (offlineDb) {
    // Attempt to delete a map tile
    offlineDb.executeSql(
      'DELETE FROM offlineMaps WHERE tileId = ? AND tileUrl = ? AND mapId = ?',
      [key.key, key.url, mapId],
      () => {},
      e => {
        Debug ? console.warn(JSON.stringify(e)) : '';
        return false;
      },
    );
    // If we found a tile and deleted it successfully, or if we didnt find a matching tile
    Debug ? console.warn('[Offline Map] Maptile deleted successfully') : '';
    return true;
  }
  Debug ? console.warn(`[Offline Map] Could not connect to database`) : '';
  return false;
};

/**
 * Attempt to save a tile, by converting it into a base64 string and then store that string on the internal database
 * Store it in the table with a reference to the mapId and tile identifiers.
 *
 * @param {String} mapId - The id of the map we want to store the tile on
 * @param {Object} key - An object that contains identifiers for the tile we are trying to save
 * @param {Blob} value - A blob that contains the tile
 *
 * @returns A promise that resolves when a tile has been saved successfully
 */
export const saveTile = (mapId, key, value) => {
  const saveTilePromise = new Promise((resolve, reject) => {
    if (offlineDb) {
      // Check if the table contains a reference to this tile on this MapId, deletes it if it does, so we get an updated tile
      if (removeItem(mapId, key)) {
        // Value is a blob, and we need to convert it to base64
        blobFunctions.encodeBlob(value).then(encodedBlob => {
          offlineDb.executeSql(
            'INSERT INTO offlineMaps (tileId, tileUrl, tileData, mapId) VALUES (?,?,?,?)',
            [key.key, key.url, JSON.stringify(encodedBlob), mapId],
            () => {},
            e => {
              Debug ? console.warn(JSON.stringify(e)) : '';
              reject();
              return saveTilePromise;
            },
          );
        });
        // If tile was saved successfully we can resolve the promise
        Debug ? console.warn(`[Offline Map] Maptile ${key.key} from ${mapId} was stored successfully!`) : '';
        resolve();

        return saveTilePromise;
      }
      // If removeItem returned false something went wrong in the process and we need to reject the promise
      Debug ? console.warn(`[Offline Map] Could not connect to database`) : '';
      reject();
      return saveTilePromise;
    }
    Debug ? console.warn(`[Offline Map] Could not connect to database`) : '';
    reject();
    return saveTilePromise;
  });
  return saveTilePromise;
};

/**
 * Loops through all the tiles for this mapdownload and attempts to download them. If a download failes it will retry a set number of times before giving up on that tile, this will mark this download as rejected.
 * A rejected download will still work, but may have missing tiles.
 * Creates a new Promise for each tile it tries to download that will resolve when the tile download is complete or reject if an error occured for this tile
 *
 * @param {String} mapId - The id of the map we are saving
 * @param {Array} tileUrls - An array that contains the url and key for all the tiles we are trying to save
 *
 * @returns A promise that resolves when all download requests has been resolved
 */
export const saveTiles = (mapId, tileUrls) => {
  // Prepare an array of promise.
  const promises = [];
  // Set rejection check to false, since at this point we have had no erros in this download
  rejected = false;
  if (offlineDb) {
    // Loop through every tile in the supplied set
    for (let i = 0; i < tileUrls.length; i += 1) {
      const tileUrl = tileUrls[i];
      // For each tile we create a new promise
      promises[i] = new Promise((resolve, reject) => {
        // Make a XMLHttpRequest and attempt to get the tile image for the current tileUrl
        const request = new XMLHttpRequest();
        request.open('GET', tileUrl.url, true);
        // Tiles are stored as blobs, and the map container uses them as blobs
        request.responseType = 'blob';
        // The request has returned something
        request.onreadystatechange = () => {
          // The request is completed so now we can check if it succeeded or not
          if (request.readyState === XMLHttpRequest.DONE) {
            // IF a tiledownload failed we want to retry, so we set up a loop that the request will retry the set number of times
            for (let j = 0; j <= numberOfRetries; j += 1) {
              // IF the request status is 200 it means a request was completed succesfully and we can resolve this promise
              if (request.status === 200) {
                resolve(saveTile(mapId, tileUrl, request.response));
                // Set the number of retries to max, to break out of this loop.
                j = numberOfRetries;
              }
              // If we loop through this the set number of retries this tiledownload wont work, so we mark this map download as rejected and reject this promise
              // Operations will continue on other tiles and map may still be usable, but the download is marked as having errors
              else if (j === numberOfRetries) {
                rejected = true;
                reject(
                  new Error({
                    status: request.status,
                    statusText: request.statusText,
                  }),
                );
              }
            }
          }
        };
        if (!rejected) {
          request.send();
        }
      });
    }
  }
  if (!rejected) {
    return Promise.all(promises);
  }
  return Promise.reject();
};

/**
 * Gets the amount of tiles stored on this mapId, usable for verifying if tile download is completed by comparing the amount of stored tiles to the expected amount of tiles to be downloaded
 *
 * @param {String} mapId - The id of the map we want to know the size of
 *
 * @returns The number of downloaded tiles
 */
export const length = mapId => {
  if (offlineDb) {
    offlineDb.executeSql(
      'SELECT COUNT(*) FROM offlineMaps WHERE mapId = ?',
      [mapId],
      resultSet => {
        Debug ? console.warn(`[Offline Map] Offline mapId: ${mapId} contains: ${resultSet.rows.item(0)} tiles!`) : '';
        return resultSet;
      },
      e => {
        Debug ? console.warn(JSON.stringify(e)) : '';
      },
    );
    Debug ? console.warn(`[Offline Map] Offline mapId: ${mapId} not found!`) : '';
    return 0;
  }
  Debug ? console.warn(`[Offline Map] Offline database not ready!`) : '';
  return 0;
};
