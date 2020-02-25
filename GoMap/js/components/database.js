/**
 * @module components/database
 */
/**
 * Helper method that initializes a new database object, so that we can access the same instance of the database accross the entire app,
 *  by calling this method we dont create dubplicates of the database.
 *
 * @returns A promise containing the database object
 */
const database = () => {
  return new Promise((resolve, reject) => {
    document.addEventListener('deviceready', () => {
      const db = window.sqlitePlugin.openDatabase({
        name: 'my.db',
        location: 'default',
      });

      if (!db) {
        reject();
      } else {
        resolve(db);
      }
    });
  });
};
export default database;
