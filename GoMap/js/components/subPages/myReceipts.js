/* eslint-disable no-underscore-dangle */
import moment from 'moment';
import deviceready from '../deviceready';
import database from '../database';
import { myReceipts, translate } from '../translation';

/**
 * Sets up the receipts view, builds receipts and presents them as either active or expired.
 * @module components/subPages/myReceipts
 */
const receiptSetup = () => {
  deviceready(() => {
    database().then(db => {
      // This clickevent will change the visual representation of a button so that a user gets feedback on button press
      $('#activeReceiptsButton').click(() => {
        $('#activeReceiptsButton').addClass('btn-secondary');
        $('#activeReceiptsButton').removeClass('btn-outline-white');
        $('#expiredReceiptsButton').addClass('btn-outline-white');
        $('#expiredReceiptsButton').removeClass('btn-secondary');
        $('#active-receipts').removeClass('hidden');
        $('#expired-receipts').addClass('hidden');
      });

      // This clickevent will change the visual representation of a button so that a user gets feedback on button press
      $('#expiredReceiptsButton').click(() => {
        $('#activeReceiptsButton').removeClass('btn-secondary');
        $('#activeReceiptsButton').addClass('btn-outline-white');
        $('#expiredReceiptsButton').removeClass('btn-outline-white');
        $('#expiredReceiptsButton').addClass('btn-secondary');
        $('#active-receipts').addClass('hidden');
        $('#expired-receipts').removeClass('hidden');
      });
      $('#active-receipts').html('');

      // Helper method that translates text on the receipt page once the template has been loaded
      myReceipts();
      const myTransactions = [];
      const businessNames = [];
      const products = [];
      const durations = [translate('{TXT_DAYCARD}'), translate('{TXT_THREEDAYCARD}'), translate('{TXT_WEEKCARD}'), translate('{TXT_SEASONCARD}')];
      // Fethces the users transactions from the internal db, fetches info about businesses and products
      db.executeSql('SELECT * FROM receipts', [], res => {
        db.executeSql('SELECT name, businessId FROM businesses', [], businessRes => {
          db.executeSql('SELECT productCategoryId, productId FROM products', [], productRes => {
            for (let i = 0; i < productRes.rows.length; i += 1) {
              products.push(productRes.rows.item(i));
            }
            for (let j = 0; j < businessRes.rows.length; j += 1) {
              businessNames.push(businessRes.rows.item(j));
            }
            // Loops through the transactions for this user and fetches adds additional data to it, such as name of productcategory
            for (let i = 0; i < res.rows.length; i += 1) {
              const item = res.rows.item(i);
              // Since we split transactions into individual transactions on intermunicipal purchases, or with different recipients we need to check if the transaciton UUid exists in the transactions array
              if (myTransactions.findIndex(entry => entry.uuid === item.uuid) < 0) {
                // If myTransactions doesnt contain the uuid of the entry we're testing we add it to the myTransactions array and we add the name of the business for the transaciton,
                // what duratio it has(1 day, 3-day, 7-day or seasonal) and we add the name of the recipient for the card.
                myTransactions.push(item);
                myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].zone = businessNames[businessNames.findIndex(entry => entry.businessId === item.businessId)].name;
                myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].duration = products[products.findIndex(entry => entry.productId === item.productId)].productCategoryId;
                myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].recipientName = `${item.recipientFirstName} ${item.recipientLastName}`;
              } else {
                // If myTransactions contains the uuid we update the amount of that entry.
                myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].amount += item.amount;
                // If the business id of entry is different than the business id of item we are dealing with an intermunicipal card and we append the name of the other municipality to the receipt
                if (myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].businessId !== item.businessId) {
                  myTransactions[
                    myTransactions.findIndex(entry => entry.uuid === item.uuid)
                  ].zone += `<br />${businessNames[businessNames.findIndex(entry => entry.businessId === item.businessId)].name}`;
                }
                // If the recipient phoneNumber of the entry is different than the recipient phoneNumber of the item we have an additional recipient to this transactions and we append info on the user to the receipt
                if (myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].recipientPhoneNumber !== item.recipientPhoneNumber) {
                  myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].recipientName += `<br />${item.recipientFirstName} ${item.recipientLastName}`;
                  myTransactions[myTransactions.findIndex(entry => entry.uuid === item.uuid)].recipientPhoneNumber += `<br />+${item.recipientPhoneNumber}`;
                }
              }
            }
            // Loop through all transactions
            for (let i = 0; i < myTransactions.length; i += 1) {
              const startDate = moment(myTransactions[i].startDate);
              let endDate;
              let startAndEndDate;
              // let duration;
              let timeleft;
              let daysOrHoursText;
              let extraPadding = '';
              let timeleftPercent = 0;
              // Add the type of payment to this transaction
              let paymentMethod = translate('{TXT_PURCHASE_METHOD_SMS}');
              if (myTransactions[i].paymentType === 'cc') {
                paymentMethod = translate('{TXT_PURCHASE_METHOD_CC}');
              }
              const today = moment();
              // If the card type is 1-day we display remaining time in hours
              if (parseInt(myTransactions[i].duration, 10) - 1 === 0) {
                startAndEndDate = startDate.format('L');
                timeleft = Math.floor(
                  moment
                    .duration(
                      moment(startDate)
                        .endOf('day')
                        .diff(today),
                    )
                    .asHours(),
                );
                daysOrHoursText = translate('{TXT_HOURS}');
                if (timeleft > 10) {
                  extraPadding = 'ml-1';
                }
                timeleftPercent = timeleft / 24;
              }
              // For all other duration types we display it in days
              if (parseInt(myTransactions[i].duration, 10) - 1 === 1) {
                endDate = moment(myTransactions[i].startDate).add(2, 'days');
                startAndEndDate = `${startDate.format('L')} - ${endDate.format('L')}`;
                timeleft =
                  moment.duration(
                    moment.duration(
                      moment(endDate)
                        .endOf('day')
                        .diff(today, 'days'),
                    ),
                  )._milliseconds + 1;
                daysOrHoursText = translate('{TXT_DAYS}');
                timeleftPercent = timeleft / 3;
              }
              if (parseInt(myTransactions[i].duration, 10) - 1 === 2) {
                endDate = moment(myTransactions[i].startDate).add(6, 'days');
                startAndEndDate = `${startDate.format('L')} - ${endDate.format('L')}`;
                timeleft =
                  moment.duration(
                    moment.duration(
                      moment(endDate)
                        .endOf('day')
                        .diff(today, 'days'),
                    ),
                  )._milliseconds + 1;
                daysOrHoursText = translate('{TXT_DAYS}');
                timeleftPercent = timeleft / 7;
              }
              // For seasonal cards we display the amount of days until the last day of this year
              if (parseInt(myTransactions[i].duration, 10) - 1 === 3) {
                endDate = moment(myTransactions[i].startDate).endOf('year');
                startAndEndDate = `${startDate.format('L')} - ${endDate.format('L')}`;
                timeleft =
                  moment.duration(
                    moment.duration(
                      moment(endDate)
                        .endOf('day')
                        .diff(today, 'days'),
                    ),
                  )._milliseconds + 1;
                daysOrHoursText = translate('{TXT_DAYS}');
                timeleftPercent =
                  timeleft /
                  moment(startDate)
                    .endOf('year')
                    .dayOfYear();
              }
              // If timeleft is less than 0 it means the card has expired and we add it to the expired page. In this append we build the entire receipt entry for this transaction
              if (timeleft < 0) {
                $('#expired-receipts').append(`
                <br/>
                <div class="my-2" style="position: relative; width: auto">
                  <div class="receipt text-muted" style="opacity: 0.8;">
                    <div class="receipt-list" style="background-color: white;">
                      <h4 class="text-center font-weight-bold pt-3 mb-0 ml-5" id="cardDuration">${durations[parseInt(myTransactions[i].duration, 10) - 1]}
                        <span style="float:right;" class="mr-3"><a class="btn-link" href="#"><i class="fas fa-envelope fa-lg" style="color:black;"></i></a></span></h4>
                      <p class="text-center font-weight-bold pt-0">${startAndEndDate}</p>
                      <div class="text-center" id="municipalities" style="font-size: smaller;">
                        <p><b>${myTransactions[i].zone}</b></p>
                      </div>
                      <br />
                      <div class="row mt-2">
                        <br />
                      </div>
                      <div class="mx-3 mt-0">
                        <hr class="border-dark my-0" />
                        <div class="font-weight-bold text-muted">${translate('{TXT_FOR}')}:</div>
                        <div class="row ml-3">
                          <div class="col-12 col-md-4">
                            <div class="font-weight-bold">+${myTransactions[i].recipientPhoneNumber}</div>
                          </div>
                        <div class="col-12 col-md-8">
                          <div class="font-weight-bold">${myTransactions[i].recipientName}</div>
                        </div>
                      </div>
                      <hr class="border-dark my-0" />
                    </div>
                    <div class="row mx-4 mt-1">
                      <div class="col">
                        <div class="text-muted font-weight-bold" style="float: right !important;">NOK ${myTransactions[i].amount},-</div>
                      </div>
                    </div>
                    <div class="my-0 mx-4">
                      <p class="text-muted my-0" style="font-size:smaller;" id="paymentMethod">${paymentMethod}</p>
                      <p class="text-muted my-0" style="font-size:smaller;" id="purchaseDate">${translate('{TXT_PURCHASED}')} ${moment(myTransactions[i].purchaseDate).format('L')} ${moment(
                  myTransactions[i].purchaseDate,
                ).format('LT')}</p>
                    </div>
                    <br />
                    <div class="row mx-4">
                      <div class="col">
                        <div class="dark-logo-receipt my-0" style="height:75px;"></div>
                        <div class="text-muted my-0" style="font-size: smaller"></div>
                      </div>
                      <div class="col mx-3 mt-2">
                        <i class="scooter-icon-receipt" style="float: right;"></i>
                      </div>
                    </div>
                    <br />
                    <br />
                  </div>
                  <span class="overlay-text font-weight-bold text-uppercase">${translate('{TXT_EXPIRED}')}</span>
                </div>
                <br />
                <br />
                `);
                // If timeleft is bigger than 0 it means the card is still active and we add it to the list of active cards
              } else {
                $('#active-receipts').append(`<br/><br/><div class="receipt">
            <div class="receipt-list" style="background-color: white;">
              <h4 class="text-center font-weight-bold pt-3 mb-0 ml-5" id="cardDuration">${
                durations[parseInt(myTransactions[i].duration, 10) - 1]
              }<span style="float:right;" class="mr-3"><a class="btn-link" href="#"><i class="fas fa-envelope fa-lg" style="color:black;"></i> </a></span></h4>
              <p class="text-center font-weight-bold pt-0">${startAndEndDate}</p>
              <div class="text-center" id="municipalities" style="font-size: smaller;">
                <p>
                  <b>
                  ${myTransactions[i].zone}
                  </b>
                </p>
              </div>
              <br />
              <div class="row">
                <div class="col-7 mx-0 my-1">
                  <div class="progress md-progress" style="height: 35px; border-radius:0!important;">
                    <div
                      class="progress-bar progress-bar-striped-gomap secondary-color progress-bar-animated-gomap"
                      style="height: 35px; width: ${timeleftPercent * 100}%"
                      role="progressbar"
                      aria-valuenow="50"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style="border-radius:0!important;"
                    ></div>
                  </div>
                </div>
                <div class="col-1 px-0 py-0">
                  <h1 class="text-secondary font-weight-bold px-0 pt-0 pb-1">${timeleft}</h1>
                </div>
                <div class="col-4 py-0">
                  <p class="text-secondary font-weight-bold mt-1 ${extraPadding}" style="font-size: smaller text-uppercase">${daysOrHoursText} <br />${translate('{TXT_TIME_LEFT}')}</p>
                </div>
              </div>
              <div class="mx-3 mt-0">
                <hr class="border-dark my-0" />
                <div class="font-weight-bold text-muted">${translate('{TXT_FOR}')}:</div>
                <div class="row ml-3">
                  <div class="col-md-4 col-12">
                    <div class="font-weight-bold">+${myTransactions[i].recipientPhoneNumber}</div>
                  </div>
                  <div class="col-md-8 col-12">
                    <div class="font-weight-bold">${myTransactions[i].recipientName}</div>
                  </div>
                </div>
                <hr class="border-dark my-0" />
              </div>
              <div class="row mx-4 mt-1">
                <div class="col">
                  <div class="text-muted font-weight-bold" style="float: right !important;">NOK ${myTransactions[i].amount},-</div>
                </div>
              </div>
              <div class="my-0 mx-4">
                <p class="text-muted my-0" style="font-size:smaller;">${paymentMethod}</p>
                <p class="text-muted my-0" style="font-size:smaller;">${translate('{TXT_PURCHASED}')} ${moment(myTransactions[i].purchaseDate).format('L')} ${moment(
                  myTransactions[i].purchaseDate,
                ).format('LT')}</p>
              </div>
              <br />
              <div class="row mx-4">
                <div class="col">
                  <div class="dark-logo-receipt my-0" style="height:75px;"></div>
                  <div class="text-muted my-0" style="font-size: smaller"></div>
                </div>
                <div class="col mx-3 mt-2">
                  <i class="scooter-icon-receipt" style="float: right;"></i>
                </div>
              </div>
              <br />
              <br />
            </div>
          </div>`);
              }
            }
          });
        });
      });
    });
  });
};
export default receiptSetup;
