/* eslint-disable no-console */
import deviceready from './deviceready';
import database from './database';

/**
 * Synchronizes map metadata from scooter businesses from the server, based on the kommune it receives. Will only update metadata if the supplied municipality doesnt already exists in the internal
 * database, or the hash stored in the internal database is different than the hash retrieved from the server.
 * @module components/mapMetadataCache
 */
/**
 * @const {bool} debug - If true this script will print debug messages into  the console, if false it wont
 */
const debug = false;

/**
 * Makes an async attempt at updating metadata.
 * Receives a municipality and checks the metadata for that municipality from the server, if that municipality doenst exist in the internal database, or the hash is different from the internal database
 * It means updated data is available on the server and we need to update the data stored on the internal database for that entry.
 * (This could be if an update has been made to a track etc.)
 *
 * @param {String} kommune - the name of the municipality we want to check for updated metadata
 *
 */
const metadataSync = async kommune => {
  deviceready(async () => {
    await database().then(async db => {
      // Check if we need to create the table
      await db.executeSql('CREATE TABLE IF NOT EXISTS scooterMetadata (hash, location)', []);
      // We fetch the hash for the metadata of this "kommune"
      await $.get(`https://api.gomap.cloud/v1/scooter/metadata/${kommune}/hash`, data => {
        db.executeSql(
          'SELECT * FROM scooterMetadata WHERE location = ?',
          [data.location],
          res => {
            if (res.rows.length > 0) {
              // If we have an entry for this "kommune" stord on the internal database we compare the hash value to the one we got from the server
              // If they are different we need to update the metadata for this "kommune".
              if (res.rows.item(0).hash !== data.hash) {
                // If the saved hash is different from the one we got from the server we update the hash saved on the device
                db.executeSql(
                  'UPDATE scooterMetadata SET hash = ? WHERE location = ?',
                  [data.hash, data.location],
                  () => {
                    // Get metadata from the server
                    $.get(`https://api.gomap.cloud/v1/scooter/metadata/${kommune}`, metadata => {
                      if (!metadata) {
                        if (debug) console.warn(`Couldn't find any metadata for: ${kommune}`);
                      } else {
                        // Store the metadata as a text file on the local system
                        window.resolveLocalFileSystemURL(
                          cordova.file.dataDirectory,
                          dirEntry => {
                            dirEntry.getFile(
                              `${data.location}.txt`,
                              { create: true, exclusive: false },
                              fileEntry => {
                                fileEntry.createWriter(fileWriter => {
                                  // We dont need to do anything specific when the filewriter is complete, but its nice to have some debug options
                                  // eslint-disable-next-line
                                  fileWriter.onwriteend = () => {
                                    if (debug) console.warn(`Updating hash and metadata for ${data.location}!`);
                                  };
                                  // eslint-disable-next-line
                                  fileWriter.onerror = e => {
                                    if (debug) console.warn(`Unable to write to file: ${e}`);
                                  };
                                  // We create a blob out of the metadata and then writes it to a file
                                  const blob = new Blob([JSON.stringify(metadata)], { type: 'text/plain' });
                                  fileWriter.write(blob);
                                });
                              },
                              e => {
                                if (debug) console.warn(`Unable to create file: ${e}`);
                              },
                            );
                          },
                          e => {
                            if (debug) console.warn(`Unable to resolve local filesystem: ${e}`);
                          },
                        );
                      }
                    });
                  },
                  e => {
                    if (debug) console.warn(`SQL error occured: ${e.message}`);
                  },
                );
              } else if (debug) console.warn(`No update required for ${kommune} ...`);
            } else {
              // If we found no metadata entry for this "kommune" we create an entry on the internal database with the name and hash for this "kommune"
              db.executeSql(
                'INSERT INTO scooterMetadata (hash, location) VALUES (?, ?)',
                [data.hash, data.location],
                () => {
                  // Fetch metadata from server
                  $.get(`https://api.gomap.cloud/v1/scooter/metadata/${kommune}`, metadata => {
                    if (!metadata) {
                      if (debug) console.warn(`Couldn't find any metadata for: ${kommune}`);
                    } else {
                      // Write metadata to a file
                      window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
                        dirEntry.getFile(
                          `${data.location}.txt`,
                          { create: true, exclusive: false },
                          fileEntry => {
                            fileEntry.createWriter(
                              fileWriter => {
                                // eslint-disable-next-line
                                fileWriter.onwriteend = () => {
                                  if (debug) console.warn(`Updating hash and metadata for ${data.location}!`);
                                };
                                // eslint-disable-next-line
                                fileWriter.onerror = e => {
                                  if (debug) console.warn(`Unable to write to file: ${e}`);
                                };
                                const blob = new Blob([JSON.stringify(metadata)], { type: 'text/plain' });
                                fileWriter.write(blob);
                              },
                              e => {
                                if (debug) console.warn(`Unable to create file: ${e}`);
                              },
                            );
                          },
                          e => {
                            if (debug) console.warn(`Unable to resolve local filesystem: ${e}`);
                          },
                        );
                      });
                    }
                  });
                },
                e => {
                  if (debug) console.warn(`SQL error occured: ${e.message}`);
                },
              );
            }
          },
          e => {
            if (debug) console.warn(`SQL error occured: ${e.message}`);
          },
        );
      });
    });
  });
};

export default metadataSync;
