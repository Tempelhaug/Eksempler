import database from './database';
import deviceready from './deviceready';
/**
 * Fetches map metadata from the server and inserts it into the local database
 * @module components/scooterMetadata
 */

const scooterMetadata = municipality => {
  const scooterMetadataPromise = new Promise((reject, resolve) => {
    deviceready(() => {
      database().then(db => {
        if (db) {
          // Make sure the table exists
          db.executeSql('CREATE TABLE IF NOT EXISTS scooterMetadata (hash, location)', []);

          // Fetches metadata for the current municipality
          $.get(`https://api.gomap.cloud/v1/scooter/metadata/${municipality}/hash`, data => {
            if (!data) {
              reject('No data returned from API end-point.');
            } else {
              db.executeSql(
                'SELECT * FROM scooterMetadata WHERE location = ?',
                [data.location],
                res => {
                  // Compare stored hash
                  if (res.rows.length > 0) {
                    // Get new data on hash change
                    if (res.rows.item(0).hash !== data.hash) {
                      db.executeSql(
                        'UPDATE scooterMetadata SET hash = ? location = ?',
                        [data.hash, data.location],
                        () => {
                          $.get(`https://api.gomap.cloud/v1/scooter/metadata/${municipality}`, metadata => {
                            if (!metadata) {
                              reject('No data returned from API end-point.');
                            } else {
                              window.resolveLocalFileSystemURL(
                                cordova.file.dataDirectory,
                                dirEntry => {
                                  dirEntry.getFile(
                                    `${data.location}.txt`,
                                    { create: true, exclusive: false },
                                    fileEntry => {
                                      fileEntry.createWriter(fileWriter => {
                                        // eslint-disable-next-line no-param-reassign
                                        fileWriter.onwriteend = () => {
                                          const msg = `Updating hash and metadata for ${data.location}!`;
                                          resolve(msg);
                                        };
                                        // eslint-disable-next-line no-param-reassign
                                        fileWriter.onerror = e => {
                                          reject(`Unable to write to file: ${e}`);
                                        };
                                        const blob = new Blob([JSON.stringify(metadata)], { type: 'text/plain' });
                                        fileWriter.write(blob);
                                      });
                                    },
                                    e => {
                                      reject(`Unable to create file: ${e}`);
                                    },
                                  );
                                },
                                e => {
                                  reject(`Unable to resolve local filesystem: ${e}`);
                                },
                              );
                            }
                          });
                        },
                        e => {
                          reject(`SQL error occured: ${e.message}`);
                        },
                      );
                    } else {
                      const noUpdateMsg = `No update required for ${municipality}`;
                      resolve(noUpdateMsg);
                    }
                  } else {
                    // Add a new record for new locations
                    db.executeSql(
                      'INSERT INTO scooterMetadata (hash, location) VALUES (?,?)',
                      [data.hash, data.location],
                      () => {
                        $.get(`https://api.gomap.cloud/v1/scooter/metadata/${municipality}`, metadata => {
                          if (!metadata) {
                            reject('No data returned from API end-point.');
                          } else {
                            window.resolveLocalFileSystemURL(
                              cordova.file.dataDirectory,
                              dirEntry => {
                                dirEntry.getFile(
                                  `${data.location}.txt`,
                                  { create: true, exclusive: false },
                                  fileEntry => {
                                    fileEntry.createWriter(fileWriter => {
                                      // eslint-disable-next-line no-param-reassign
                                      fileWriter.onwriteend = () => {
                                        const msg = `Updating hash and metadata for ${data.location}!`;
                                        resolve(msg);
                                      };
                                      // eslint-disable-next-line no-param-reassign
                                      fileWriter.onerror = e => {
                                        reject(`Unable to write to file: ${e}`);
                                      };
                                      const blob = new Blob([JSON.stringify(metadata)], { type: 'text/plain' });
                                      fileWriter.write(blob);
                                    });
                                  },
                                  e => {
                                    reject(`Unable to create file: ${e}`);
                                  },
                                );
                              },
                              e => {
                                reject(`Unable to resolve local filesystem: ${e}`);
                              },
                            );
                          }
                        });
                      },
                      e => {
                        reject(`SQL error occured: ${e.message}`);
                      },
                    );
                  }
                },
                e => {
                  reject(`SQL error occured: ${e.message}`);
                },
              );
            }
          });
        } else {
          reject('No database connection');
        }
      });
    });
  });
  return scooterMetadataPromise;
};
export default scooterMetadata;
