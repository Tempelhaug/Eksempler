/* eslint-disable no-unused-expressions */
import deviceready from '../deviceready';
import db from '../database';
import businesses from '../apiAccess/getBusinesses';
import { translate } from '../translation';
/**
 * Builds the municipalInfo subpage
 * @module components/subPages/municipalInfoPages
 */
/**
 * @const {bool} Debug - a bool used for debugging purposes, if set to true this script will print debug messages, else if false will not print anything
 */
const Debug = true;

/**
 * Generates an object containing a list of all active municipality names and business Ids
 *
 * @returns {Promise} - returns a promise containing the generated object.
 */
export const municipalitiesListed = () => {
  const municipalitiesListedPromise = new Promise((resolve, reject) => {
    deviceready(() => {
      db().then(deviceDb => {
        deviceDb.executeSql(
          'SELECT * FROM businesses',
          [],
          result => {
            const listOfMunicipalities = [];
            const listOfMunicipalityNames = [];
            for (let i = 0; i < result.rows.length; i += 1) {
              const item = result.rows.item(i);
              if (!listOfMunicipalities.includes(item.businessId)) {
                listOfMunicipalities.push(item.businessId);
                listOfMunicipalityNames.push(item.name);
              }
            }
            const businessData = {
              id: listOfMunicipalities,
              name: listOfMunicipalityNames,
            };
            resolve(businessData);
          },
          e => {
            Debug ? console.warn(JSON.parse(e)) : '';
            reject();
          },
        );
      });
    });
  });
  return municipalitiesListedPromise;
};

/**
 * Sets up a list with the shield badge and name of all municipalities active in the system and adds a clickevent on each entry in the list
 * When an entry is clicked a modal will pop up with info on the clicked municipality.
 *
 * @param {Object} businessData - an object containing lists of all active municipality names and businessId's
 *
 */
export const setupList = businessData => {
  const businessId = businessData.id;
  const businessName = businessData.name;

  for (let i = 0; i < businessId.length; i += 1) {
    let itemName = businessName[i];

    // Extra check on municipalities with Æ, Ø or Å in their name to prevent issues with invalid characters
    if (businessName[i] === 'Røyrvik Kommune') {
      itemName = 'Royrvik Kommune';
    }
    if (businessName[i] === 'Snåsa Kommune') {
      itemName = 'Snasa Kommune';
    }
    // Adds margin to the bottom of the appended element if its not the last entry in the list
    if (i < businessId.length - 1) {
      $('#municipalList').append(
        `<div class="shield-badge inline-image" id="${businessId[i]}"><img src="${cordova.file.applicationDirectory}www/images/arms/${itemName}.png" class="img-fluid"><div class="shield-name inline-image-text font-weight-bold"><b>${businessName[i]}</b></div></div><hr>`,
      );
    } else {
      $('#municipalList').append(
        `<div class="shield-badge inline-image mb-3" id="${businessId[i]}"><img src="${cordova.file.applicationDirectory}www/images/arms/${itemName}.png" class="img-fluid"><div class="shield-name inline-image-text font-weight-bold"><b>${businessName[i]}</b></div></div>`,
      );
    }
  }

  // Adds clickevent to the shield-badge class (this class is added to the entire row, so that it is possible to also click the name of the municipality)
  $('.shield-badge')
    .off()
    .on('click', e => {
      businesses($(e.currentTarget)[0].id).then(data => {
        if (data && data.length > 0) {
          // Load the municiapl info modal template and add the data to the specific municipality to it
          $.get('templates/modals/municipal-info-modal.html', tpl => {
            $('#infoModal').append(tpl);
            $('#municipalInfoModalTitle').text(businessName[businessId.indexOf(parseInt($(e.currentTarget)[0].id, 10))]);

            $('#municipalInfoText').html(data[0].content);

            $('#municipalInfoModal').modal({
              show: true,
              backdrop: 'static',
            });
            translate('{BTN_TXT_OK}', '#municipalInfoModalDismiss');
            $('#municipalInfoModal').on('hidden.bs.modal', () => {
              $('#municipalInfoModal').remove();
            });
          });
        }
      });
    });
};
