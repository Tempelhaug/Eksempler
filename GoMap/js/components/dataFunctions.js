/* eslint-disable no-unused-expressions */
/* eslint-disable no-console */
import * as docCookies from 'doc-cookies';
import db from './database';
import gateways from './apiAccess/getGateways';
import transactions from './apiAccess/getTransactions';
import businesses from './apiAccess/getBusinesses';
import productCategories from './apiAccess/getProductCategories';
import products from './apiAccess/getProducts';
import subscriptionData from './apiAccess/getSubscriptions';
import pushChannelData from './apiAccess/getPushChannels';
import alerts from './apiAccess/getAlerts';
import deviceready from './deviceready';

/**
 * Sets up the internal database tables required to run the app. Will generate the necessary tables on launch if  they dont already exist and fetch data from the server and injects it into the tables.
 * On a set interval it will try to generate the tables and fetch the data, to ensure that the user has updated info stored in the app.
 * @module components/dataFunctions
 * @todo -  As is this method will run at start and at set intervals, and clears all tables it sets up before fetching data.
 *          If there is no connection we wont get updated data but the tables will be cleared anyway.
 *          Need to implement a check so that we wont clear a table unless we have updated data to insert into that table.

 */

/**
 * @constant {bool} Debug - Used for debugging purposes, if true will print a debug message on all DB operations run in this script
 */
const Debug = false;

// Not a constant since we have the option of updating the userData at a later stage.
let userData = JSON.parse(docCookies.getItem('userData'));

/**
 * We use the various api helper method to fetch data from the server, by creating tables if they dont exist and purge existing data from them, before inserting the data fetched from the server.
 *
 */
document.addEventListener('deviceready', () => {
  db().then(database => {
    if (database) {
      // Update products
      products()
        .then(data => {
          if (data) {
            database.executeSql(
              'CREATE TABLE IF NOT EXISTS products (productId INTEGER, name STRING, price INTEGER, info STRING, isActive INTEGER, interKommunal INTEGER, discount INTEGER, businessId INTEGER, productCategoryId INTEGER, isStandard STRING)',
              [],
            );
            database.executeSql('DELETE FROM products', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO products (productID, name, price, info, isActive, interKommunal, discount, businessId, productCategoryId, isStandard) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [entry.productId, entry.name, entry.price, entry.info, entry.isActive, entry.interKommunal, entry.discount, entry.businessId, entry.productCategoryId, entry.isStandard],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
            Debug ? console.info('[Products sync] Data updated.') : '';
          } else {
            Debug ? console.warn('[Products sync] Failed to get data from the server.') : '';
          }
        })
        .catch(() => {
          Debug ? console.warn('[Products sync] Failed to get data from the server.') : '';
        });

      // Update product categories
      productCategories()
        .then(data => {
          if (data) {
            database.executeSql('CREATE TABLE IF NOT EXISTS productCategories (productCategoryId INTEGER, categoryName STRING, durationTimeHours INTEGER)', []);
            database.executeSql('DELETE FROM productCategories', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO productCategories (productCategoryId, categoryName, durationTimeHours) VALUES (?,?,?)',
                [entry.productCategoryId, entry.categoryName, entry.durationTimeHours],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
            Debug ? console.info('[ProductCategory sync] Data updated.') : '';
          } else {
            Debug ? console.warn('[ProductCategory sync] Failed to get data from the server.') : '';
          }
        })
        .catch(() => {
          Debug ? console.warn('[ProductCategory sync] Failed to get data from the server.') : '';
        });
      // Uppdate available businesses
      businesses()
        .then(data => {
          if (data) {
            database.executeSql('CREATE TABLE IF NOT EXISTS businesses (businessId INTEGER, name STRING, municipalitiId INTEGER, borders STRING, multiSelectCompat STRING)', []);
            database.executeSql('DELETE FROM businesses', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO businesses (businessId, name, municipalitiId, borders, multiSelectCompat) VALUES (?,?,?,?,?)',
                [entry.businessId, entry.name, entry.municipalitiId, entry.borders, entry.multiSelectCompatible],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
            Debug ? console.info('[Business sync] Data updated.') : '';
          } else {
            Debug ? console.warn('[Business sync] Failed to get data from the server.') : '';
          }
        })
        .catch(() => {
          Debug ? console.warn('[Business sync] Failed to get data from the server.') : '';
        });

      // Update payment gateways
      gateways()
        .then(data => {
          if (data) {
            database.executeSql(
              'CREATE TABLE IF NOT EXISTS gateways (paymentControllerId INTEGER, name STRING, enabled STRING, environment STRING, gateway STRING, businessId INTEGER, productTypeId INTEGER)',
              [],
            );
            database.executeSql('DELETE FROM gateways', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO gateways (paymentControllerId, name, enabled, environment, gateway, businessId, productTypeId) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [entry.paymentControllerId, entry.name, entry.enabled, entry.environment, entry.gateway, entry.businessId, entry.productTypeId],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
            Debug ? console.info('[Gateways sync] Data updated.') : '';
          } else {
            Debug ? console.warn('[Gateways sync] Failed to get data from the server.') : '';
          }
        })
        .catch(() => {
          Debug ? console.warn('[Gateways sync] Failed to get data from the server.') : '';
        });

      // Create tables that needs userdata to function properly, so that they are ready when we have userdata
      database.executeSql(
        'CREATE TABLE IF NOT EXISTS savedTrips (guid STRING, startTime STRING, endTime STRING, title STRING, pictures STRING, trackData STRING, distance STRING, isSynced INTEGER)',

        [],
      );
      database.executeSql(
        'CREATE TABLE IF NOT EXISTS userData (createTime STRING, language STRING, userId STRING, birthdate STRING, email STRING, firstName STRING, gender STRING, lastName STRING, phone STRING)',
        [],
      );
      database.executeSql('CREATE TABLE IF NOT EXISTS messages (pushMessageId INTEGER, title STRING, message STRING, pushChannelId STRING, channelName STRING)', []);
      database.executeSql('CREATE TABLE IF NOT EXISTS messageSubscriptions (pushChannelId INTEGER)', []);
      database.executeSql('CREATE TABLE IF NOT EXISTS activePushChannels (channelName, pushChannelId)', []);
      database.executeSql(
        'CREATE TABLE IF NOT EXISTS receipts (transactionsScooterId INTEGER, uuid STRING, amount INTEGER, startDate STRING, paymentType STRING, productId INTEGER, env STRING, recipientFirstName STRING, recipientLastName STRING, recipientPhoneNumber STRING, interkommunalt STRING, gifted STRING, businessId INTEGER, purchaseDate STRING)',
        [],
      );

      /**
       * ******************************
       * ******************************
       * Automatic data sync
       * ******************************
       * ******************************
       */
      // Products
      setInterval(() => {
        products()
          .then(data => {
            if (data) {
              database.executeSql(
                'CREATE TABLE IF NOT EXISTS products (productId INTEGER, name STRING, price INTEGER, info STRING, isActive STRING, interKommunal STRING, discount INTEGER, businessId INTEGER, productCategoryId INTEGER, isStandard STRING)',
                [],
              );
              database.executeSql('DELETE FROM products', []);
              database.executeSql('VACUUM', []);
              data.forEach(entry => {
                database.executeSql(
                  'INSERT INTO products (productID, name, price, info, isActive, interKommunal, discount, businessId, productCategoryId, isStandard) VALUES (?,?,?,?,?,?,?,?,?,?)',
                  [entry.productId, entry.name, entry.price, entry.info, entry.isActive, entry.interKommunal, entry.discount, entry.businessId, entry.productCategoryId, entry.isStandard],
                  () => {},
                  e => {
                    Debug ? console.warn(JSON.stringify(e)) : '';
                  },
                );
              });
              Debug ? console.info('[Products sync] Data updated.') : '';
            } else {
              Debug ? console.warn('[Products sync] Failed to get data from the server.') : '';
            }
          })
          .catch(() => {
            Debug ? console.warn('[Products sync] Failed to get data from the server.') : '';
          });
      }, 60000);

      // ProductCategories
      setInterval(() => {
        productCategories()
          .then(data => {
            if (data) {
              database.executeSql('CREATE TABLE IF NOT EXISTS productCategories (productCategoryId INTEGER, categoryName STRING, durationTimeHours STRING)', []);
              database.executeSql('DELETE FROM productCategories', []);
              database.executeSql('VACUUM', []);
              data.forEach(entry => {
                database.executeSql(
                  'INSERT INTO productCategories (productCategoryId, categoryName, durationTimeHours) VALUES (?,?,?)',
                  [entry.productCategoryId, entry.categoryName, entry.durationTimeHours],
                  () => {},
                  e => {
                    Debug ? console.warn(JSON.stringify(e)) : '';
                  },
                );
              });
              Debug ? console.info('[ProductCategory sync] Data updated.') : '';
            } else {
              Debug ? console.warn('[ProductCategory sync] Failed to get data from the server.') : '';
            }
          })
          .catch(() => {
            Debug ? console.warn('[ProductCategory sync] Failed to get data from the server.') : '';
          });
      }, 60000);
      // Gateways
      setInterval(() => {
        gateways()
          .then(data => {
            if (data) {
              database.executeSql(
                'CREATE TABLE IF NOT EXISTS gateways (paymentControllerId INTEGER, name STRING, enabled STRING, environment STRING, gateway STRING, businessId INTEGER, productTypeId INTEGER)',
                [],
              );
              database.executeSql('DELETE FROM gateways', []);
              database.executeSql('VACUUM', []);
              data.forEach(entry => {
                database.executeSql(
                  'INSERT INTO gateways (paymentControllerId, name, enabled, environment, gateway, businessId, productTypeId) VALUES (?,?,?,?,?,?,?)',
                  [entry.paymentControllerId, entry.name, entry.enabled, entry.environment, entry.gateway, entry.businessId, entry.productTypeId],
                  () => {},
                  e => {
                    Debug ? console.warn(JSON.stringify(e)) : '';
                  },
                );
              });
              Debug ? console.info('[Gateways sync] Data updated.') : '';
            } else {
              Debug ? console.warn('[Gateways sync] Failed to get data from the server.') : '';
            }
          })
          .catch(() => {
            Debug ? console.warn('[Gateways sync] Failed to get data from the server.') : '';
          });
      }, 60000);

      // Businesses
      setInterval(() => {
        businesses()
          .then(data => {
            if (data) {
              database.executeSql('CREATE TABLE IF NOT EXISTS businesses (businessId INTEGER, name STRING, municipalitiId INTEGER, borders STRING, multiSelectCompat STRING)', []);
              database.executeSql('DELETE FROM businesses', []);
              database.executeSql('VACUUM', []);
              data.forEach(entry => {
                database.executeSql(
                  'INSERT INTO businesses (businessId, name, municipalitiId, borders, multiSelectCompat) VALUES (?,?,?,?,?)',
                  [entry.businessId, entry.name, entry.municipalitiId, entry.borders, entry.multiSelectCompatible],
                  () => {},
                  e => {
                    Debug ? console.warn(JSON.stringify(e)) : '';
                  },
                );
              });
              Debug ? console.info('[Business sync] Data updated.') : '';
            } else {
              Debug ? console.warn('[Business sync] Failed to get data from the server.') : '';
            }
          })
          .catch(() => {
            Debug ? console.warn('[Business sync] Failed to get data from the server.') : '';
          });
      }, 60000);

      // The following operations are userSpecific, so we need to check if we have userdata before we run them
      if (userData) {
        setInterval(() => {
          // Fetches this users transactions
          transactions(userData.gomapUserAccountsId)
            .then(data => {
              if (data) {
                database.executeSql(
                  'CREATE TABLE IF NOT EXISTS receipts (transactionsScooterId INTEGER, uuid STRING, amount INTEGER, startDate STRING, paymentType STRING, productId INTEGER, env STRING, recipientFirstName STRING, recipientLastName STRING, recipientPhoneNumber STRING, interkommunalt STRING, gifted STRING, businessId INTEGER, purchaseDate STRING)',
                  [],
                );
                database.executeSql('DELETE FROM receipts', []);
                database.executeSql('VACUUM', []);
                data.forEach(entry => {
                  database.executeSql(
                    'INSERT INTO receipts (transactionsScooterId, uuid, amount, startDate, paymentType, productId, env, recipientFirstName, recipientLastName, recipientPhoneNumber, interkommunalt, gifted, businessId, purchaseDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      entry.transactionsScooterId,
                      entry.transactionsScooterUUID,
                      entry.amount,
                      entry.startDate,
                      entry.paymentType,
                      entry.productId,
                      entry.env,
                      entry.firstName,
                      entry.lastName,
                      entry.recipientPhoneNumber,
                      entry.interkommunal,
                      entry.gifted,
                      entry.businessId,
                      entry.transactionDate,
                    ],
                    () => {},
                    e => {
                      Debug ? console.warn(JSON.stringify(e)) : '';
                    },
                  );
                });
                Debug ? console.info('[Receipts sync] Data updated.') : '';
              } else {
                Debug ? console.warn('[Receipts sync] Failed to get data from the server.') : '';
              }
            })
            .catch(() => {
              Debug ? console.warn('[Receipts sync] Failed to get data from the server.') : '';
            });
        }, 60000);
      }
    }
  });
});

/**
 * Fetches data that is specific for each user. We fetch the updated userData from the userData cookie, in case the user has updated their userData in the app.
 */
const userDataRequired = () => {
  // The userdata cookie can change at runtime, i.e if a user updates their userdata on the editprofile page, so we update the userData field in this script to ensure we have the latest userData stored in the app
  userData = JSON.parse(docCookies.getItem('userData'));

  /**
   * Is the user a Premium user?
   * TODO: MISSING PREMIUM USER CHECK
   */

  // Store userdata on a local db
  deviceready(() => {
    db().then(database => {
      database.executeSql('DELETE FROM userData', []);
      database.executeSql('VACUUM', []);
      database.executeSql(
        'INSERT INTO userData (createTime, language, userId, birthdate, email, firstName, gender, lastName, phone) VALUES (?,?,?,?,?,?,?,?,?)',
        [userData.createTime, userData.language, userData.gomapUserAccountsId, userData.birthDate, userData.email, userData.firstName, userData.gender, userData.lastName, userData.phoneNumber],
        () => {},
        e => {
          Debug ? console.warn(JSON.stringify(e)) : '';
        },
      );
      // Fetches and stores messages from the pushChannel the user is subscribed to
      alerts(userData.gomapUserAccountsId).then(data => {
        if (data) {
          database.executeSql('DELETE FROM messages', []);
          database.executeSql('VACUUM', []);
          data.forEach(entry => {
            if (entry.length > 0) {
              entry.forEach(messageEntry => {
                database.executeSql(
                  'INSERT INTO messages (pushMessageId, title, message, pushChannelId, channelName) VALUES (?,?,?,?,?)',
                  [messageEntry.pushMessagesId, messageEntry.title, messageEntry.message, messageEntry.pushChannelId, messageEntry.channelName],
                  () => {},
                );
              });
            }
          });
        }
      });

      // Fetches the channels the user is Subscribed to.
      subscriptionData(userData.gomapUserAccountsId)
        .then(data => {
          if (data) {
            database.executeSql('DELETE FROM messageSubscriptions', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO messageSubscriptions (pushChannelId) VALUES (?)',
                [entry.pushChannelId],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
          }
        })
        .catch(e => {
          console.log('[GoMap] Subscription error occured:', e);
        });
      // Fetches pushchanneldata for the pushChannels the user is subscribed to.
      pushChannelData()
        .then(data => {
          if (data) {
            database.executeSql('DELETE FROM activePushChannels', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO activePushChannels (channelName, pushChannelId) VALUES (?,?)',
                [entry.channelName, entry.pushChannelId],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
          }
        })
        .catch(e => {
          console.log('[GoMap] Push channel data error occured:', e);
        });
      // Store transactiondata for this user, so that we can display receipts in the app
      transactions(userData.gomapUserAccountsId)
        .then(data => {
          if (data) {
            database.executeSql('DELETE FROM receipts', []);
            database.executeSql('VACUUM', []);
            data.forEach(entry => {
              database.executeSql(
                'INSERT INTO receipts (transactionsScooterId, uuid, amount, startDate, paymentType, productId, env, recipientFirstName, recipientLastName, recipientPhoneNumber, interkommunalt, gifted, businessId, purchaseDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  entry.transactionsScooterId,
                  entry.transactionsScooterUUID,
                  entry.amount,
                  entry.startDate,
                  entry.paymentType,
                  entry.productId,
                  entry.env,
                  entry.firstName,
                  entry.lastName,
                  entry.recipientPhoneNumber,
                  entry.interkommunal,
                  entry.gifted,
                  entry.businessId,
                  entry.transactionDate,
                ],
                () => {},
                e => {
                  Debug ? console.warn(JSON.stringify(e)) : '';
                },
              );
            });
            Debug ? console.info('[Receipts sync] Data updated.') : '';
          } else {
            Debug ? console.warn('[Receipts sync] Failed to get data from the server.') : '';
          }
        })
        .catch(() => {
          Debug ? console.warn('[Receipts sync] Failed to get data from the server.') : '';
        });
    });
  });
};
export default userDataRequired;
