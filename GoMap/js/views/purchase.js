import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as intlTelInput from 'intl-tel-input/build/js/intlTelInput';
import * as util from 'intl-tel-input/build/js/utils';
import * as docCookies from 'doc-cookies';
import moment from 'moment';
import map from './map';
import kommuner from '../../dataFiles/kommuner.json';
import database from '../components/database';
import deviceready from '../components/deviceready';
import sleep from '../components/sleep';
import { translate, translateGiftcardModal } from '../components/translation';

/**
 * Prepares the purchase view. Sets up all fields required for making a purchase and handles logic behind the purchase. Opens the map view and zooms to an appropriate level. Adds an overlay that shows the
 * border of each municipality.
 * In order to make a purhcase the user must choose atleast 1 municipality, 1 type of card and if its not a seasonsal card - the startdate for the card.
 * Logic handles what payment options are available, the limit for SMS payment is set using the smsMaxCharge variable
 * @module views/purchase
 */

// Make sure moment speaks our language before interpreting a date
moment.locale('nb');

// Local-global variables
let selectCount = 0;
let selectedZones = [];
let zoneNames = [];
let cardTypes = {};
let paymentInfo = {};
/**
 * @constant smsMaxCharge - If the total sum exceeds this amount it will no longer be possible to choose sms as a payment method
 */
const smsMaxCharge = 1000;

// menu states
let paymentWindowShown = false;

// Initial card type
let paymentType = 'cc';

// Setup the purcahse view
$('#purchase, #purchaseQuick').click(async () => {
  SpinnerDialog.show(null, null, true);
  // Reset variables
  selectCount = 0;
  selectedZones = [];
  zoneNames = [];
  cardTypes = {};

  // Show the purchase menu
  $('#purchase-menu-top').removeClass('hidden');
  // Show the purchase overview
  $('#purchase-menu-bottom').removeClass('hidden');
  // Hide the map menu buttons
  $('#fixed-top-menu').addClass('hidden');
  // Hide the bottom menu
  $('#fixed-bottom-menu').addClass('hidden');

  // zoom the map out
  map.setView([65.833472, 13.199444], 7);

  // We lock input to the app while the map zooms to prevent unwanted inputs
  await sleep(1000);

  // Set up database access
  deviceready(async () => {
    await database().then(async db => {
      /**
       * Get a list of all our scooter clients
       */
      db.executeSql('SELECT * FROM businesses', [], res => {
        const businesses = [];
        const selectableUnits = [];
        const incompatibleUnits = [];

        for (let i = 0; i < res.rows.length; i += 1) {
          const item = res.rows.item(i);

          // Push all businesses to the businesses array
          businesses.push(item);

          // Push unique municipality IDs to the selectable zones array
          if (!selectableUnits.includes(item.municipalitiId)) {
            selectableUnits.push(item.municipalitiId);
          }

          // Make a record of municipalities that have multiSelectCompat set to false
          if (item.multiSelectCompat === 'false' && !incompatibleUnits.includes(item.municipalitiId)) {
            incompatibleUnits.push(item.municipalitiId);
          }
        }

        /**
         * Populate the map with zones we sell scooter passes for
         */
        const zones = L.geoJSON(kommuner, {
          // Apply a filter to show only zones we have as clients
          filter: feature => {
            if (selectableUnits.includes(parseInt(feature.properties.kommunenummer, 10))) {
              return feature;
            }
            return false;
          },
          // Set initial zone layer styles
          style: {
            fill: true,
            fillColor: '#000',
            fillOpacity: 0.2,
            color: '#000',
          },
          // Per zone layer logic
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              translate('{TXT_CARD_PRICE_BASE}', '.card-price');
              translate('{TXT_PICK_PASS_TYPE}', '#product-name');
              $('#purchase-overview').removeClass('white-text secondary-color');
              $('#purchase-extras-button').addClass('btn-secondary');
              $('#purchase-extras-button').removeClass('purple lighten-2');
              $('#giftcard-code').addClass('disabled');
              $('#purchase-others').addClass('disabled');
              $('#select-date-menu').hide();

              paymentInfo = {};

              if (!feature.properties.selected) {
                layer.setStyle({
                  fillColor: '#C65D22',
                  fillOpacity: 0.7,
                });
                // !!! (DO NOT REMOVE THIS RULE OVERRIDE) !!!
                // eslint-disable-next-line
                feature.properties.selected = true;

                // Bind tooltip with municipaliti name on this layer
                layer.bindTooltip(feature.properties.navn[0].navn, { permanent: true }).openTooltip();

                // Increment selected zones
                selectCount += 1;
                if (selectCount > 0) {
                  $('#select-scooter-pass').slideDown();
                  $('#purchase-extras').slideDown();
                }

                // Add this zone to list of selected zones
                selectedZones.push(parseInt(feature.properties.kommunenummer, 10));
                zoneNames.push(feature.properties.navn[0].navn);

                businesses.forEach(business => {
                  const selectedId = parseInt(feature.properties.kommunenummer, 10);
                  const searchId = business.municipalitiId;

                  /**
                   * Reset all zones which have multiSelectCompat set to "true" when a
                   * zone is selected that has multiSelectCompat set to "false".
                   * -------------------
                   * Resets; state, style, counter, selectedZones and the unbinds tooltip
                   */
                  if (selectedId === searchId && business.multiSelectCompat === 'false') {
                    // Loop through all map layers
                    map.eachLayer(mapLayer => {
                      // Find the map layers we created earlier
                      if (mapLayer.feature && mapLayer.feature.properties.kommunenummer) {
                        const layerId = parseInt(mapLayer.feature.properties.kommunenummer, 10);
                        // Limit search to layers we have selected on the map
                        if (layerId !== selectedId && mapLayer.feature.properties.selected) {
                          // Reset the styles and states of each selected map layer
                          mapLayer.setStyle({
                            fillColor: '#000',
                            fillOpacity: 0.2,
                          });
                          selectCount -= 1;
                          selectedZones = [selectedId];
                          mapLayer.unbindTooltip();
                          // eslint-disable-next-line
                          mapLayer.feature.properties.selected = false;
                        }
                      }
                    });
                    zoneNames = [feature.properties.navn[0].navn];
                  }

                  /**
                   * Reset the selected zone which have multiSelectCompat set to "false" when a
                   * zone is selected that has multiSelectCompat set to "true" if any is selected.
                   * -------------------
                   * Resets; state, style, counter, selectedZones and the unbinds tooltip
                   */
                  if (selectedId === searchId && business.multiSelectCompat === 'true') {
                    // Loop through all the map layers
                    map.eachLayer(mapLayer => {
                      // Find the map layers we created earlier
                      if (mapLayer.feature && mapLayer.feature.properties.kommunenummer) {
                        const layerId = parseInt(mapLayer.feature.properties.kommunenummer, 10);
                        // Limit search to only units which can't be selected together, but currently are selected
                        if (incompatibleUnits.includes(layerId) && mapLayer.feature.properties.selected) {
                          // Reset the styles and states of each selected map layer
                          mapLayer.setStyle({
                            fillColor: '#000',
                            fillOpacity: 0.2,
                          });
                          selectCount -= 1;
                          selectedZones.splice(selectedZones.indexOf(layerId), 1);
                          zoneNames.splice(zoneNames.indexOf(mapLayer.feature.properties.navn[0].navn), 1);
                          mapLayer.unbindTooltip();
                          // eslint-disable-next-line
                          mapLayer.feature.properties.selected = false;
                        }
                      }
                    });
                  }
                });

                // Print a toast message that we added a new municipality
                window.plugins.toast.hide();
                window.plugins.toast.showWithOptions({
                  message: selectCount > 1 ? `${selectCount} ${translate('PURCHASE.TOAST.MUNICIPALITIES_SELECTED')}` : `${selectCount} ${translate('PURCHASE.TOAST.MUNICIPALITY_SELECTED')}`,
                  duration: 'long', // 2000 ms
                  position: 'center',
                  addPixelsY: 400,
                  styling: {
                    opacity: 0.5, // 0.0 (transparent) to 1.0 (opaque). Default 0.8
                    backgroundColor: '#000000', // make sure you use #RRGGBB. Default #333333
                    textColor: '#FFFFFF', // Ditto. Default #FFFFFF
                    textSize: 13, // Default is approx. 13.
                    cornerRadius: 50, // minimum is 0 (square). iOS default 20, Android default 100
                    horizontalPadding: 0, // iOS default 16, Android default 50
                    verticalPadding: -30, // iOS default 12, Android default 30
                  },
                });
              } else {
                layer.setStyle({
                  fillOpacity: 0.2,
                  fillColor: '#000',
                });
                // !!! (DO NOT REMOVE THIS RULE OVERRIDE) !!!
                // eslint-disable-next-line
                feature.properties.selected = false;

                // Remove tooltip
                layer.unbindTooltip();

                // Decrease selected zone count
                selectCount -= 1;
                if (selectCount < 1) {
                  $('#select-scooter-pass').slideToggle();
                  $('#purchase-extras').slideToggle();
                }

                // Remove this zone to list of selected zones
                selectedZones.splice(selectedZones.indexOf(parseInt(feature.properties.kommunenummer, 10)), 1);
                zoneNames.splice(zoneNames.indexOf(feature.properties.navn[0].navn), 1);
              }

              // Reset the layer styling when purchase mode is exited
              $('#purchase-menu-hide').click(() => {
                layer.setStyle({
                  fillOpacity: 0.2,
                  fillColor: '#000',
                });
                // !!! (DO NOT REMOVE THIS RULE OVERRIDE) !!!
                // eslint-disable-next-line
                feature.properties.selected = false;

                // Remove tooltip
                layer.unbindTooltip();
              });
            });
          },
        });

        // Add the selectable zones to the map
        zones.addTo(map);

        // Hide the spinner dialog
        SpinnerDialog.hide();

        // Remove the selectable zones from the map
        $('#purchase-menu-hide').click(() => {
          map.removeLayer(zones);
        });
      });
    });
  });
});

// Toggle showing the purchase method
$('#purchase-extras-button').click(() => {
  $('#purchase-payment-type').slideToggle(() => {
    $('#purchase-extras-button ')
      .children('.fas')
      .toggleClass('fa-chevron-up fa-chevron-down');
    paymentWindowShown = !paymentWindowShown;
  });
});

// Hide the purchase view
$('#purchase-menu-hide').click(() => {
  // Show the purchase menu
  $('#purchase-menu-top').addClass('hidden');
  // Show the purchase overview
  $('#purchase-menu-bottom').addClass('hidden');
  // Hide the map menu buttons
  $('#fixed-top-menu').removeClass('hidden');
  // Hide the bottom menu
  $('#fixed-bottom-menu').removeClass('hidden');

  // Hide the sub menus
  $('#select-scooter-pass').hide();
  $('#purchase-extras').hide();
  $('#select-date-menu').hide();

  // Reset temporary data
  selectCount = 0;
  selectedZones = [];
  zoneNames = [];
  cardTypes = {};
  paymentInfo = {};

  /**
   * Toggle active menu states
   */
  // Payment type selection window
  if (paymentWindowShown) {
    $('#purchase-payment-type').slideToggle();
    $('#purchase-extras-button ')
      .children('.fas')
      .toggleClass('fa-chevron-up fa-chevron-down');
  }

  // Reset menu states
  paymentWindowShown = false;

  /**
   * Reset default values and selections
   */
  translate('{TXT_CARD_PRICE_BASE}', '.card-price');
  translate('{TXT_PICK_PASS_TYPE}', '#product-name');

  $('#purchase-overview').removeClass('white-text secondary-color');
  $('#purchase-extras-button').addClass('btn-secondary');
  $('#purchase-extras-button').removeClass('purple lighten-2');
  $('#giftcard-code').addClass('disabled');
  $('#purchase-others').addClass('disabled');

  /**
   * Reset input menus and selections
   */
  $('input[name="paymentType"][value="sms"]')
    .prop('disabled', false)
    .closest('.row')
    .removeClass('grey lighten-3');
  $('input[name="paymentType"][value="cc"]')
    .prop('disabled', false)
    .closest('.row')
    .removeClass('grey lighten-3');
  $('input[name="paymentType"][value="cc"]').click();
});

// Toggle text for payment type
$('.paymentTypeSelect').change(e => {
  const val = $(e.currentTarget).val();

  if (val === 'sms') {
    translate('{TXT_INVOICE_PHONE}', '#paymentTypeSelect');
    paymentType = 'sms';
  } else {
    translate('{TXT_INVOICE_CARD}', '#paymentTypeSelect');
    paymentType = 'cc';
  }
});

// Product data
const populateProductData = () => {
  return new Promise(resolve => {
    deviceready(() => {
      database().then(db => {
        cardTypes = {};
        /**
         * Do a quick product analysis and sanity checking
         */
        selectedZones.forEach((entry, index) => {
          db.executeSql('SELECT * FROM products WHERE businessId IN (SELECT businessId FROM businesses WHERE municipalitiId = ?)', [entry], res => {
            // Get all products for this business
            for (let i = 0; i < res.rows.length; i += 1) {
              const item = res.rows.item(i);

              if (selectedZones.length > 1) {
                // Only select standardized, activated products from the DB
                if (item.isStandard === 'true' && item.isActive === 1) {
                  // Compare products for all businesses and products
                  if (item.productCategoryId in cardTypes) {
                    cardTypes[item.productCategoryId].count += 1;
                    cardTypes[item.productCategoryId].list.push(item.businessId);
                    cardTypes[item.productCategoryId].products.push(item);
                    cardTypes[item.productCategoryId].sum += (1 - item.discount / 100) * item.price;
                    cardTypes[item.productCategoryId].productIds.push(item.productId);
                  } else {
                    cardTypes[item.productCategoryId] = {
                      count: 1,
                      list: [item.businessId],
                      products: [item],
                      sum: (1 - item.discount / 100) * item.price,
                      productIds: [item.productId],
                    };
                  }
                }
              }

              if (selectedZones.length < 2) {
                if (item.isActive === 1) {
                  if (item.productCategoryId in cardTypes) {
                    cardTypes[item.productCategoryId].count += 1;
                    cardTypes[item.productCategoryId].list.push(item.businessId);
                    cardTypes[item.productCategoryId].products.push(item);
                  } else {
                    cardTypes[item.productCategoryId] = {
                      count: 1,
                      list: [item.businessId],
                      products: [item],
                    };
                  }
                }
              }

              if (index === selectedZones.length - 1) {
                resolve();
              }
            }
          });
        });
      });
    });
  });
};

let currentlySelectedDate;
/**
 * Initialize the datepicker, adds custom styling to indicate on the calendar how long a card is valid when selecting a det by highlighting the startdate and all dates until it expires
 */
const selectedDate = $('.datepicker').pickadate({
  monthsFull: [
    translate('DATEPICKER.FULL.JANUARY'),
    translate('DATEPICKER.FULL.FEBUARY'),
    translate('DATEPICKER.FULL.MARCH'),
    translate('DATEPICKER.FULL.APRIL'),
    translate('DATEPICKER.FULL.MAY'),
    translate('DATEPICKER.FULL.JUNE'),
    translate('DATEPICKER.FULL.JULY'),
    translate('DATEPICKER.FULL.AUGUST'),
    translate('DATEPICKER.FULL.SEPTEMBER'),
    translate('DATEPICKER.FULL.OCTOBER'),
    translate('DATEPICKER.FULL.NOVEMBER'),
    translate('DATEPICKER.FULL.DECEMBER'),
  ],
  monthsShort: [
    translate('DATEPICKER.SHORT.JANUARY'),
    translate('DATEPICKER.SHORT.FEBUARY'),
    translate('DATEPICKER.SHORT.MARCH'),
    translate('DATEPICKER.SHORT.APRIL'),
    translate('DATEPICKER.SHORT.MAY'),
    translate('DATEPICKER.SHORT.JUNE'),
    translate('DATEPICKER.SHORT.JULY'),
    translate('DATEPICKER.SHORT.AUGUST'),
    translate('DATEPICKER.SHORT.SEPTEMBER'),
    translate('DATEPICKER.SHORT.OCTOBER'),
    translate('DATEPICKER.SHORT.NOVEMBER'),
    translate('DATEPICKER.SHORT.DECEMBER'),
  ],
  weekdaysFull: [
    translate('DATEPICKER.FULL.MONDAY'),
    translate('DATEPICKER.FULL.TUESDAY'),
    translate('DATEPICKER.FULL.WEDNESDAY'),
    translate('DATEPICKER.FULL.THURSDAY'),
    translate('DATEPICKER.FULL.FRIDAY'),
    translate('DATEPICKER.FULL.SATURDAY'),
    translate('DATEPICKER.FULL.SUNDAY'),
  ],
  weekdaysShort: [
    translate('DATEPICKER.SHORT.MONDAY'),
    translate('DATEPICKER.SHORT.TUESDAY'),
    translate('DATEPICKER.SHORT.WEDNESDAY'),
    translate('DATEPICKER.SHORT.THURSDAY'),
    translate('DATEPICKER.SHORT.FRIDAY'),
    translate('DATEPICKER.SHORT.SATURDAY'),
    translate('DATEPICKER.SHORT.SUNDAY'),
  ],
  today: translate('DATEPICKER.TODAY'),
  clear: translate('DATEPICKER.CLEAR'),
  close: translate('DATEPICKER.CLOSE'),
  closeOnSelect: false,
  selectYears: 1,
  selectMonths: true,
  min: 0,
  onSet: e => {
    /**
     * When a date is selected we run some calculations to decide how many days and which days to highlight
     * The different productCategories decides how long a cards is valid:
     * 1 = 1day,
     * 2 = 3day,
     * 3 = 7day,
     * 4 = Rest of year. - Since this card is valid the rest of the year, the user doesnt get to choose a startdate, and the datepicker is hidden while this is the productcategory
     * @note the number: 86400000 is the amount of milliseconds pr day and is used because the datepicker uses milliseconds to label dates
     */
    if (e.clear === null) {
      currentlySelectedDate = moment()
        .startOf('day')
        .valueOf();
    } else if (e.select) {
      currentlySelectedDate = e.select;
    }
    const productCategory = paymentInfo.categoryId;
    $(`[data-pick=${currentlySelectedDate}]`).addClass('picker__day--selected');

    if (currentlySelectedDate) {
      if (productCategory === 1) {
        $(`[data-pick=${currentlySelectedDate}]`).addClass('picker__day--selected_singleDay');
        $(`[data-pick=${currentlySelectedDate}]`).removeClass('picker__day--selected');
      }
      if (productCategory === 2) {
        const dayOne = currentlySelectedDate + 86400000;
        const lastDay = dayOne + 86400000;
        $(`[data-pick=${dayOne}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${lastDay}]`).addClass('picker__day--selected_lastDay');
      }
      if (productCategory === 3) {
        const dayOne = currentlySelectedDate + 86400000;
        const dayTwo = dayOne + 86400000;
        const dayThree = dayTwo + 86400000;
        const dayFour = dayThree + 86400000;
        const dayFive = dayFour + 86400000;
        const lastDay = dayFive + 86400000;
        $(`[data-pick=${currentlySelectedDate}]`).addClass('picker__day--selected');
        $(`[data-pick=${dayOne}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${dayTwo}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${dayThree}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${dayFour}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${dayFive}]`).addClass('picker__day--selected_dayInTheMiddle');
        $(`[data-pick=${lastDay}]`).addClass('picker__day--selected_lastDay');
      }
    }
  },
});

// Find products of selected zones
$('#select-pass-type').click(async () => {
  // Hide any lingering toast messages
  window.plugins.toast.hide();

  await populateProductData().then(() => {
    /**
     * Load and inject the product selection template
     */
    $.get('templates/purchase.html', tpl => {
      $('body').append(tpl);
      $('#productList').html('');

      // Translate strings
      translate('{TXT_PICK_PASS_TYPE_HEADER}', '#productsModalTitle');
      translate('{BTN_TXT_CANCEL}', '.cancelButton');

      if (selectedZones.length < 2) {
        if (Object.keys(cardTypes).length > 0) {
          Object.keys(cardTypes).forEach((key, listIndex) => {
            const list = cardTypes[key];
            Object.keys(list.products).forEach((productKey, prodIndex) => {
              // We want a border on the bottom for every last product
              const lidx = listIndex === Object.keys(cardTypes).length - 1;
              const pidx = prodIndex === Object.keys(list.products).length - 1;

              // Append all products
              $('#productList').append(`
                <div class="row border-top ${lidx && pidx ? 'border-bottom' : ''} border-light p-3 select-product" data-disabled="false" data-productId="${
                list.products[productKey].productId
              }" data-price="${list.products[productKey].price}" data-name="${list.products[productKey].name}" data-category="${list.products[productKey].productCategoryId}">
                  <div class="col text-left font-weight-bold" style="font-size:14px;">${list.products[productKey].name}</div>
                  <div class="col text-right d-flex align-self-center justify-content-end" style="font-size:14px;">Kr ${list.products[productKey].price},-</div>
                </div>
              `);
            });
          });
        } else {
          $('#productList').append(`
            <div class="row p-3">
              <div class="col text-center font-weight-bold no-product-available"></div>
            </div>
          `);
          translate('{TXT_NO_PRODUCTS_AVAILABLE}', '.no-product-available');
        }
      } else {
        Object.keys(cardTypes).forEach((key, index) => {
          const list = cardTypes[key];
          // Append all products
          $('#productList').append(`
            <div class="row border-top ${index === Object.keys(cardTypes).length - 1 ? 'border-bottom' : ''} border-light p-3 select-product" data-productId="${JSON.stringify(
            list.productIds,
          )}" data-price="${list.sum}" data-name="${list.products[0].name}" data-disabled="${list.count < selectedZones.length ? 'true' : 'false'}" data-category="${
            list.products[0].productCategoryId
          }">
              <div class="col-6 text-left font-weight-bold ${list.count < selectedZones.length ? 'product-disabled' : ''}" style="font-size:14px;">${list.products[0].name}</div>
              <div class="col-6 text-right d-flex align-self-center justify-content-end ${list.count < selectedZones.length ? 'product-disabled' : ''}" style="font-size:14px;">Kr ${list.sum},-</div>
              ${list.count < selectedZones.length ? '<div class="col-12 red-text font-weight-bold text-center small-text unavailable"></div>' : ''}
            </div>
          `);
          translate('{TXT_PRODUCT_UNAVAILABLE}', '.unavailable');
        });
      }

      // Show the modal
      $('#productsModal').modal('show');

      // What happens when this modal is hidden?
      $('#productsModal').on('hidden.bs.modal', () => {
        $('#productList').html('');
        $('#productsModal').remove();
      });
    });
  });
});

$(document).on('click', '.select-product', e => {
  const startDate = selectedDate.pickadate('picker');
  const productId = $(e.currentTarget).data('productid');
  const name = $(e.currentTarget).data('name');
  const price = $(e.currentTarget).data('price');
  const disabled = $(e.currentTarget).data('disabled') === true;
  const categoryId = $(e.currentTarget).data('category');

  paymentInfo = {
    productId,
    name,
    price,
    paymentType,
    categoryId,
  };

  // Prevent any default actions from occuring from the mobile-side
  e.preventDefault();

  // Clear previously selected date
  startDate.clear('value');

  // Reset the purcahse text
  translate('{BTN_TXT_BUY_PASS}', '.paymentTextInfo');

  // The selected product is disabled. Warn the user
  if (disabled) {
    deviceready(() => {
      window.plugins.toast.hide();
      window.plugins.toast.showLongCenter('{TXT_PRODUCT_UNAVAILABLE}');
    });
    return;
  }

  /**
   * Maximum amount hit or exceeded for SMS, disable
   */
  $('input[name="paymentType"][value="sms"]')
    .prop('disabled', false)
    .closest('.row')
    .removeClass('grey lighten-3');
  if (price >= smsMaxCharge) {
    $('input[name="paymentType"][value="sms"]')
      .prop('disabled', true)
      .closest('.row')
      .addClass('grey lighten-3');
    $('input[name="paymentType"][value="cc"]').click();
  }

  // Update the price
  $('.card-price').text(`Kr ${price}`);

  // Update the name
  if (name.length > 12) {
    $('#product-name').text(`${name.substring(0, 12)}...`);
  } else {
    $('#product-name').text(name);
  }

  // Turn the button purple and text white
  $('#purchase-overview').addClass('white-text secondary-color');
  $('#purchase-extras-button').removeClass('btn-secondary');
  $('#purchase-extras-button').addClass('purple lighten-2');

  // Activate the hidden buttons
  $('#giftcard-code').removeClass('disabled');
  $('#purchase-others').removeClass('disabled');

  // Show the date selector for certain categories
  if (categoryId < 4) {
    $('#select-date-menu').slideDown();
  } else if ($('#select-date-menu').is(':visible')) {
    $('#select-date-menu').slideToggle();
  }

  // Hide the modal
  $('#productsModal').modal('hide');
});

// Giftcard
$('#giftcard-code').click(() => {
  $.get('templates/giftcard_modal.html', tpl => {
    $('body').append(tpl);
    translateGiftcardModal();

    $('#useGiftCard').click(() => {
      paymentInfo.giftcard = $('#giftcardCode').val();
    });

    $('#giftcardModal').modal('show');
    $('#giftcardModal').on('hidden.bs.modal', () => {
      $('#giftcardModal').remove();
    });
  });
});

// Purchase for more people
$('#purchase-others').click(() => {
  $.get('templates/multipass_modal.html', tpl => {
    $('body').append(tpl);

    translate('{BTN_TXT_CANCEL}', '.cancelButton');

    $('#multipassModal').modal('show');

    $('#multipassModal').on('hidden.bs.modal', () => {
      $('#multipassModal').remove();
    });

    $('#multipassPeopleInfo').on('hidden.bs.modal', () => {
      $('#multipassPeopleInfo').remove();
    });
  });
});

$(document).on('click', '.people-num-select', e => {
  const num = $(e.currentTarget).data('amount');
  $('#multipassModal').modal('hide');

  translate('{BTN_TXT_CANCEL}', '.cancelButton');
  translate('{BTN_TXT_OK}', '#submitPeople');

  $('.multipassPeople').html('');
  for (let i = 0; i < num; i += 1) {
    $('.multipassPeople').append(`
      <div class="addPerson mb-4">
        <input type="text" class="form-control fornavn" placeholder="Fornavn" />
        <input type="text" class="form-control etternavn" placeholder="Etternavn" />
        <input type="tel" class="form-control telefonnummer" placeholder="Mobilnummer" id="mobile${i}" />
        <div class="small-text font-weight-bold text-black text-center">En bekreftelse vil bli sendt på SMS til mottakeren</div>
      </div>
    `);

    const input = document.querySelector(`#mobile${i}`);
    // eslint-disable-next-line
    let iti;
    if (input) {
      iti = intlTelInput(input, {
        utilsScript: util,
        initialCountry: 'no',
        autoPlaceholder: 'off',
        geoIpLookup(success) {
          $.get('https://ipinfo.io', () => {}, 'jsonp').always(resp => {
            const countryCode = resp && resp.country ? resp.country : '';
            success(countryCode);
          });
        },
      });
    }
  }

  setTimeout(() => {
    $('#multipassPeopleInfo')
      .modal('show')
      .data('bs.modal')
      .handleUpdate();
  }, 800);
});

$(document).on('click', '#submitPeople', () => {
  paymentInfo.cards = [];

  // Loop through fields
  $('.addPerson').each((idx, el) => {
    const firstName = $(el)
      .find('.fornavn')
      .val();
    const lastName = $(el)
      .find('.etternavn')
      .val();
    const phoneNumber = $(el)
      .find('.telefonnummer')
      .val();

    const input = document.querySelector(`#mobile${idx}`);
    let iti;
    if (input) {
      iti = intlTelInput(input, {
        utilsScript: util,
        initialCountry: 'no',
        autoPlaceholder: 'off',
        geoIpLookup(success) {
          $.get('https://ipinfo.io', () => {}, 'jsonp').always(resp => {
            const countryCode = resp && resp.country ? resp.country : '';
            success(countryCode);
          });
        },
      });
    }

    // All fields are required
    if (firstName.length < 1 || lastName.length < 1 || phoneNumber.length < 1) {
      deviceready(() => {
        window.plugins.toast.hide();
        window.plugins.toast.showLongCenter(translate('{TXT_ALL_FIELDS_REQUIRED}'));
      });
      return;
    }

    // Make sure all phone numbers are valid
    if (!iti.isValidNumber()) {
      deviceready(() => {
        window.plugins.toast.hide();
        window.plugins.toast.showLongCenter(translate('{TXT_INVALID_PHONE_NUMBER}'));
      });
      return;
    }

    paymentInfo.cards.push({ firstName, lastName, phoneNumber: iti.getNumber() });

    if (idx === $('.addPerson').length - 1) {
      // Hide the information template
      $('#multipassPeopleInfo').modal('hide');

      paymentInfo.price *= idx + 1;

      // Update the price
      $('.card-price').text(`Kr ${paymentInfo.price}`);

      // Update purcahse text
      translate('{BTN_TXT_BUY_MULTIPLE_PASSES}', '.paymentTextInfo', { num: idx + 1 });

      /**
       * Maximum amount hit or exceeded for SMS, disable
       */
      $('input[name="paymentType"][value="sms"]')
        .prop('disabled', false)
        .closest('.row')
        .removeClass('grey lighten-3');
      if (paymentInfo.price >= smsMaxCharge) {
        $('input[name="paymentType"][value="sms"]')
          .prop('disabled', true)
          .closest('.row')
          .addClass('grey lighten-3');
        $('input[name="paymentType"][value="cc"]').click();
      }
    }
  });
});

$('#purchase-overview').click(() => {
  // Access the datepickers root element
  const startDate = selectedDate.pickadate('picker');

  // Include our own account ID in the purcahse info object
  paymentInfo.userAccountId = JSON.parse(docCookies.getItem('userData')).gomapUserAccountsId;

  // Make sure that we've actually selected a product before continuing
  if (Object.keys(paymentInfo).length < 4) {
    return;
  }

  // Make sure we select a date if we're not purchasing a seasonal pass
  if (startDate.get('value') === '' && paymentInfo.categoryId < 4) {
    deviceready(() => {
      window.plugins.toast.showLongCenter(translate('PURCHASE.TOAST.ERROR.NODATE'));
    });
    return;
  }

  /**
   * make sure the "deviceready" event has fired before passing data from the app to the server
   * and either get a paymentWindow, temporary message or error code in return
   */
  // Get the current date
  if (startDate.get('value')) {
    paymentInfo.startDate = moment(startDate.get('select', 'dd/mm/yyyy'), 'DD/MM/YYYY').format();
  } else {
    paymentInfo.startDate = null;
  }

  // Inject the payment details modal and accompanying logic
  $.get('templates/purchasedetails.html', tpl => {
    $('body').append(tpl);

    $('#purchaseOverview').html(
      `<div class="col-12 font-weight-bold">${paymentInfo.name} snøscooter i ${Object.keys(zoneNames)
        .map(key => zoneNames[key])
        .join(', ')} kommune for:</div>`,
    );

    // Append card information to the purchase overview
    if (typeof paymentInfo.cards === 'object') {
      Object.keys(paymentInfo.cards).forEach(card => {
        $('#purchaseOverview').append(`<div class="col-12">${paymentInfo.cards[card].firstName} ${paymentInfo.cards[card].lastName} - ${paymentInfo.cards[card].phoneNumber}</div>`);
      });
    } else {
      const userData = JSON.parse(docCookies.getItem('userData'));
      $('#purchaseOverview').append(`<div class="col-12">${userData.firstName} ${userData.lastName} - ${userData.phoneNumber}</div>`);
    }

    // Figure out how to set dates
    let toDate;
    if (paymentInfo.categoryId === 1) {
      translate('{TXT_OVERVIEW_DATE}', '#pOverviewDates', { fromDate: moment(paymentInfo.startDate).format('YYYY-MM-DD') }, true);
    }
    if (paymentInfo.categoryId === 2) {
      // Front the date and format it for display
      toDate = moment(paymentInfo.startDate)
        .add(2, 'days')
        .format('YYYY-MM-DD');

      // Translate the string
      translate('{TXT_OVERVIEW_DATES}', '#pOverviewDates', { fromDate: moment(paymentInfo.startDate).format('YYYY-MM-DD'), toDate }, true);
    }
    if (paymentInfo.categoryId === 3) {
      toDate = moment(paymentInfo.startDate)
        .add(6, 'days')
        .format('YYYY-MM-DD');

      // Translate the string
      translate('{TXT_OVERVIEW_DATES}', '#pOverviewDates', { fromDate: moment(paymentInfo.startDate).format('YYYY-MM-DD'), toDate }, true);
    }

    if (paymentInfo.categoryId === 4) {
      translate(
        '{TXT_OVERVIEW_DATES}',
        '#pOverviewDates',
        {
          fromDate: moment().format('YYYY-MM-DD'),
          toDate: moment()
            .endOf('year')
            .format('YYYY-MM-DD'),
        },
        true,
      );
    }

    // Translate strings
    translate('{TXT_PURCAHSE_DETAILS_HEADER}', '#purchaseDetailsTitle');
    translate('{BTN_TXT_CANCEL}', '.cancelButton');
    translate('{BTN_PURCHASE_AGREE}', '#agreePurchase');
    translate('{TXT_PURCHASE_HEADER_1}', '.purchaseHeader1');
    translate('{TXT_PURCHASE_HEADER_2}', '.purchaseHeader2');
    translate('{TXT_PURCHASE_INFO}', '.info-box', false, true);
    translate('{TXT_PURCHASE_INFO_1}', '.purchaseInfo1', false, true);
    translate('{TXT_PURCHASE_INFO_2}', '.purchaseInfo2', false, true);
    translate('{TXT_OVERVIEW_PRICE}', '#pOverviewPrice', { price: paymentInfo.price }, true);

    // Make sure the modal is removed from the DOM once "hidden"
    $('#purchaseDetails').on('hidden.bs.modal', () => {
      $('#purchaseDetails').remove();
      // eslint-disable-next-line
      console.log(paymentInfo);
    });

    // Show the modal
    $('#purchaseDetails').modal('show');
  });
});
