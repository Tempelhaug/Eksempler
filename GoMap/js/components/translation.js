import Polyglot from 'node-polyglot';
import translation from '../../no-NB.json';

/**
 * This script handles translation of text in the app. Reads a language file and replaces the text of the elemnt supplied with corresponding translated text found in language file
 * Since this script can only translate text that has already been loaded into the app we cannot translate everything on startup
 * Because of this some of the text is translated on startup, while some functions run on request to translate elements when they have been loaded into the app.
 * There is also a helper class that we can call from anywhere in the system to translate text for things like toasts etc. that is not persistent in the app.
 *
 * @module components/translation
 *
 */
/**
 * @const language - This is the reference to the language file used for translation
 */
const language = translation;
/**
 * @const polyglot - Loads the language file and tells the script what phrases is available for translation
 */
const polyglot = new Polyglot({ phrases: language });

/* **************************************************************
 * **** THIS SCRIPT NEEDS TO BE UPDATED WHEN ADDING NEW TEXT ****
 * **************************************************************
 */

/**
 * All elements that are loaded on startup can be translated directly on startup
 */
$('#gomapRegister').text(polyglot.t('{BTN_TXT_REGISTER}'));
$('#gomapLogin').text(polyglot.t('{BTN_TXT_LOGIN}'));
$('#txt_login_title').text(polyglot.t('{TXT_LOGIN_TITLE}'));
$('#txt_login_welcome').text(polyglot.t('{TXT_LOGIN_WELCOME_BACK}'));
$('#txt_login_tip').text(polyglot.t('{TXT_LOGIN_TIP}'));
$('#loginCancel').text(polyglot.t('{BTN_TXT_CANCEL}'));
$('#loginSubmit').text(polyglot.t('{BTN_TXT_LOGIN}'));

// Purchase options
$('.purchase-header').text(polyglot.t('{TXT_BUY_PASS}'));
$('#select-pass-type').text(polyglot.t('{BTN_TXT_CHANGE}'));
$('#product-name').text(polyglot.t('{BTN_TXT_CHANGE}'));
$('#giftcard-code').text(polyglot.t('{TXT_GIFTCARD_CODE}'));
$('#purchase-others').text(polyglot.t('{TXT_BUY_FOR_OTHERS}'));

$('#paymentTypeSelect').text(polyglot.t('{TXT_INVOICE_CARD}'));
$('.paymentTextInfo').text(polyglot.t('{BTN_TXT_BUY_PASS}'));
$('.invoice-sms').text(polyglot.t('{TXT_PHONE_BILL}'));
$('.sms-limit').text(polyglot.t('{TXT_SMS_LIMIT}'));
$('.card-text').text(polyglot.t('{TXT_CARD}'));
$('.cancelButton').text(polyglot.t('{BTN_TXT_CANCEL}'));

/**
 * Translates text, modified by various attributes we send into the function, this allows us to just call the translate function  from anywhere and just pass what text we want to translate and what
 * type of elements/attributes etc. we want translated
 * @param string - The text we want to translate
 * @param el  optional - The element we want to attach the translation to
 * @param object optional - If we want to supply values to the translation or not
 * @param html optional - if we want to target html and not text
 * @param attribute optional - if we want to target a specific attribute
 *
 * @returns if we only pass a string attribute we return the translated string
 */
export const translate = (string, el = false, object = false, html = false, attribute = false) => {
  if (!el) {
    if (object && typeof object === 'object') {
      return polyglot.t(string, object);
    }
    return polyglot.t(string);
  }

  if (object && typeof object === 'object') {
    if (html) {
      return $(el).html(polyglot.t(string, object));
    }
    return $(el).text(polyglot.t(string, object));
  }

  if (attribute) {
    return $(el).attr(attribute, polyglot.t(string));
  }

  if (html) {
    return $(el).html(polyglot.t(string, object));
  }

  return $(el).text(polyglot.t(string));
};

// Login view
translate('{TXT_MOBILE_NUMBER}', '#phoneLogin', false, false, 'placeholder');

// Register view
translate('{TXT_MOBILE_NUMBER}', '#phoneRegister', false, false, 'placeholder');
translate('{TXT_REGISTER_TITLE}', '#registerTitle');
translate('{TXT_REGISTER_INTRO}', '#registerIntro');
translate('{TXT_REG_PCHOLDER_FIRST_NAME}', '#regFirstName', false, false, 'placeholder');
translate('{TXT_REG_PCHOLDER_LAST_NAME}', '#regLastName', false, false, 'placeholder');
translate('{TXT_REG_PCHOLDER_EMAIL}', '#regEmail', false, false, 'placeholder');
translate('{TXT_REG_TIP}', '#registerTip', false, true);
translate('{BTN_TXT_REGISTER2}', '#newRegistration');
translate('{BTN_TXT_CANCEL}', '#registerCancel');

// Menu options
translate('{TXT_BUY_SCOOTER_PASS}', '#buyScooterPass');
translate('{TXT_MY_ACCOUNT}', '#txt_my_account');
translate('{TXT_MY_RECEIPTS}', '#txt_my_receipts');
translate('{TXT_MY_TRIPS}', '#txt-my-trips');
translate('{TXT_MY_OFFLINE_MAPS}', '#txt_my_offline_maps');
translate('{TXT_RECEIVED_ALERTS}', '#txt_my_received_alerts');
translate('{TXT_SETTINGS}', '#txt_settings');
translate('{TXT_OTHER}', '#txt_other');
translate('{TXT_MUNICIPAL_INFOPAGES}', '#txt_municipal_infopages');
translate('{TXT_SEND_FEEDBACK}', '#txt_send_feedback');
translate('{TXT_LOG_OUT}', '#txt_log_out');
translate('{TXT_MY_OFFLINE_MAPS}', '.myOfflineMapsHeader');
translate('{TXT_DOWNLOAD_MAP_SECTION}', '#txt-download-map-section');
translate('{BTN_TXT_DOWNLOAD}', '#offline-save-button');
$('#offlineMapName').attr('placeholder', translate('{TXT_PLACEHOLDER_OFFLINE_MAP_NAME}'));

/**
 * Translates all text on the elements for the myReceiptsPage
 */
export const myReceipts = () => {
  $('.my-receipts-header').text(polyglot.t('{TXT_MY_RECEIPTS}'));
  translate('{BTN_TXT_ACTIVE}', '#activeReceiptsButton');
  translate('{BTN_TXT_EXPIRED}', '#expiredReceiptsButton');
};
/**
 * Translates all text on the elements for the myAlertsPage
 */
export const myAlerts = () => {
  translate('{TXT_RECEIVED_ALERTS}', '#txt_recieved_alerts');
  translate('{BTN_MUNICIPAL_FILTER}', '#municipalFilter');
};
/**
 * Translates all text on the elements for the MySettingsPage
 */
export const translateMySettings = () => {
  translate('{TXT_SETTINGS}', '#txt_settings');
  translate('{TXT_PROFILE}', '#txt_profile');
  translate('{TXT_EDIT_PROFILE}', '#edit-profile-button');
  translate('{TXT_EDIT_ALERTS}', '#edit-alerts-button');
  translate('{TXT_INFORMATION}', '#txt-information');
  translate('{TXT_HELP}', '#help-button');
  translate('{TXT_LEGEND}', '#legend-button');
  translate('{TXT_ABOUT}', '#about-button');
  translate('{TXT_TERMS}', '#terms-button');
};
/**
 * Translates all text on the elements for the MyProfilePage
 */
export const translateMyProfile = () => {
  translate('{BTN_SAVE}', '#saveProfileSettings');
  translate('{TXT_EDIT_PROFILE}', '#txt-edit-profile');
  translate('{TXT_NAME}', '#txt-name');
  translate('{TXT_LASTNAME}', '#txt-lastName');
  translate('{TXT_EMAIL}', '#txt-email');
  translate('{TXT_PHONE}', '#txt-phone');
};
/**
 * Translates all text on the elements for the MyAlertSettingsPage
 */
export const translateMyAlertSettings = () => {
  translate('{TXT_EDIT_ALERTS}', '#txt-edit-alerts');
  translate('{TXT_EDIT_ALERTS_INFO}', '#txt-edit-alerts-info');
  translate('{BTN_SAVE_SETTINGS}', '#saveAlertSettings');
};
/**
 * Translates all text on the elements for the AboutPage
 */
export const translateAboutPage = () => {
  translate('{TXT_ABOUT}', '#txt-about');
  translate('{TXT_ABOUT_GOMAP}', '#txt-about-gomap');
  translate('{TXT_CONTACT_CUSTOMERSERVICE}', '#txt-contact-customerservice');
  translate('{TXT_CONTACT_INFO}', '#txt-contact-info', false, 'html');
};
/**
 * Translates all text on the elements for the FeedbackModal
 */
export const translateFeedbackModal = () => {
  translate('{FEEDBACK_TITLE}', '#sendFeedbackModalTitle');
  translate('{FEEDBACK_TEXT}', '#sendFeedbackText', false, 'html');
  translate('{BTN_TXT_CANCEL}', '#cancelFeedback');
  translate('{BTN_TXT_SEND_FEEDBACK}', '#submitFeedback');
};
/**
 * Translates all text on the elements for the GiftcardModal
 */
export const translateGiftcardModal = () => {
  translate('{TXT_GIFTCARD_TITLE}', '#giftcardTitle');
  translate('{TXT_GIFTCARD}', '#giftcardCode', false, false, 'placeholder');
  translate('{BTN_TXT_CANCEL}', '.giftcardModalCancel');
  translate('{BTN_TXT_USE}', '#useGiftCard');
  translate('{TXT_INVALID_GIFTCARD_TITLE}', '#invalidGiftcardModalTitle');
  translate('{TXT_INVALID_GIFTCARD_TEXT}', '#invalidGiftcardText');
  translate('{BTN_TXT_TRY_AGAIN}', '#invalidGiftcardTryAgainButton');
};
/**
 * Translates all text on the elements for the VerificationModal
 */
export const translateVerificationModal = () => {
  translate('{VERIFICATION_TITLE}', '#verificationModalTitle');
  translate('{VERIFICATION_HINT}', '#verificationHint');
  translate('{TXT_PCHOLDER_VERIFY}', '#verificationCode', false, false, 'placeholder');
  translate('{VERIFICATION_TIP}', '#verificationTip', false, true);
  translate('{BTN_TXT_CANCEL}', '#verificationCancel');
  translate('{BTN_TXT_VERIFY}', '#submitVerification');
};
/**
 * Translates all text on the elements for the MyTripsPage
 */
export const translateMyTrips = () => {
  translate('{TXT_MY_TRIPS}', '#txt-my-trips-title');
  translate('{TXT_MY_TRIPS_INFO}', '#txt-my-trips-info');
  translate('{TXT_MY_TRIP_NO_TRIPS}', '#txt-no-trips-found');
};
/**
 * Translates all text on the elements for the GPS Modals
 */
export const translateGPSModals = () => {
  translate('GPS.NOTIFICATION.TITLE', '#gpsModeEndTitle');
  translate('GPS.NOTIFICATION.MESSAGE', '#gpsModeEndMessage');
  translate('{BTN_TXT_CANCEL}', '.cancelButton');
  translate('GPS.NOTIFICATION.BUTTONS.CONFIRM', '#stopGPS');

  translate('TRIP.NOTIFICATION.TITLE', '#saveTripModalTitle');
  translate('TRIP.NOTIFICATION.MESSAGE', '.saveTripMessage1');
  translate('TRIP.NOTIFICATION.MESSAGE2', '.saveTripMessage2', false, true);
  translate('TRIP.NOTIFICATION.BUTTONS.SAVE', '#saveTrip');
};
translate('GPS.TRACKER.HEADER', '.tracker-header');
translate('GPS.TRACKER.DISTANCE', '.distance-text');
translate('GPS.TRACKER.DURATION', '.duration-text');
translate('GPS.TRACKER.BUTTONS.START', '.gps-start');
translate('GPS.TRACKER.BUTTONS.END', '.gps-stop');

/**
 * @todo Set up system that allows for swapping of language files after fetching such file from the server
 */
