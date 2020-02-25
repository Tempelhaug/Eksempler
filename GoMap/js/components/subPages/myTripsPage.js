import moment from 'moment';
import deviceready from '../deviceready';
import database from '../database';
import { translate } from '../translation';

/**
 * Generates the myTrips page, will display the saved trips of this user as a clickable list with a preview image for the trip and all data stored for the trip.
 * @module components/subPages/myTripsPage
 */
const myTripsInit = () => {
  deviceready(() => {
    database().then(db => {
      if (db) {
        db.executeSql('SELECT * FROM savedTrips', [], res => {
          if (res.rows.length !== 0) {
            $('#my-saved-trip-list').html('');
            for (let i = 0; i < res.rows.length; i += 1) {
              const item = res.rows.item(i);
              let imageData;
              if (item.pictures) {
                imageData = JSON.parse(item.pictures);
                if (imageData) {
                  imageData = imageData.data;
                } else {
                  imageData = '';
                }
              } else {
                imageData = '';
              }
              const corruptText = 'IMAGEERROR';
              const startTime = moment(item.startTime);
              const endTime = moment(item.endTime);
              $('#my-saved-trip-list').append(
                `
                  <div class="my-2 show-trip" data-display="${item.guid}">
                    <div id="mapCard" class="card mx-auto" style="width:85%;">
                    <div class="view overlay mb-2 image-container" style="width: 100%; height:150px; display:block; position:relavitve; overlow:hidden;" data-name="${item.title}"  data-val="${
                  item.guid
                }">${corruptText}  
                    <img class="card-img-top" src="data:image/png;base64, ${imageData}" alt="">
                    <a><div class="mask rgba-white-slight"></div></a>
                  </div>

                  <div class="row">
                    <div class="col-12 text-center" style="position: relative;">
                      <h4 class="card-title text-center text-secondary font-weight-bold">${item.title}</h4>
                      <div style="position:absolute; right:30px; top:0;">
                        <a class="btn-link mr-2" href="#"><i class="fas fa-pencil-alt fa-xs editThisTrip" data-val="${item.guid}"></i></a>
                        <a class="btn-link" href="#"><i class="far fa-trash-alt fa-xs deleteThisTrip" data-val="${item.guid}"></i></a>
                      </div>
                    </div>
                    <div class="col-12">
                      <p class="font-weight-bold text-center">${moment(item.startTime).format('L')} ${moment(item.startTime).format('LT')}</p>
                    </div>
                    <div class="col-6 text-left mb-3">
                      <div class="ml-4" style="font-size:12px;"><i class="far fa-clock fa-xs"></i> ${translate('{TXT_DURATION}')}: ${moment.utc(endTime.diff(startTime)).format('HH:mm:ss')}</div>
                    </div>
                    <div class="col-6 text-right mb-3">
                      <div class="mr-4" style="font-size:12px;">${translate('{TXT_DISTANCE}')}: ${item.distance.toFixed(3)}km</div>
                    </div>
                  </div>`,
              );
            }
          }
        });
      }
    });
  });
};
export default myTripsInit;
