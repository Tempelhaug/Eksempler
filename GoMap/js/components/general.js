import * as docCookies from 'doc-cookies';
import deviceready from './deviceready';
import sendFeedback from './apiAccess/sendFeedback';
import { translateFeedbackModal } from './translation';
/**
 * This script was planned to contain all opening of modals, but since many of the modals are opened from subpages and injected into elements on those subpages,
 * the only modal that is opened from this script is the submitFeedback modal, since its the only modal opened from the main view and the only modal that is not injected into a subpage
 * Also contains some logic for the statechanges on the sporlogg section.
 *
 * @module components/general
 */

deviceready(() => {
  const userdata = JSON.parse(docCookies.getItem('userData'));
  //* ********************* FEEDBACK ************** */
  // Inject the feedback-modal template into the main element
  $(document).on('click', '#feedback', () => {
    $.get('templates/modals/send-feedback-modal.html', tpl => {
      $('#main').append(tpl);
      // Translates the feedback modal
      translateFeedbackModal();
      $('#sendFeedbackModal').modal({
        show: true,
        backdrop: 'static',
      });

      // Binds a clickevent to the submitFeedback button, that checks if a feedback text has been entered, and if so attempts to send the feedback to the server, displays an error message if something went wrong
      $('#submitFeedback').click(() => {
        if ($('#feedbackMessage').val()) {
          sendFeedback($('#feedbackMessage').val, userdata.gomapUserAccountsId)
            .then(() => {
              $('#sendFeedbackModal').modal('hide');
              $('#sendFeedbackModal').on('hidden.bs.modal', () => {
                $('#sendFeedbackModal').remove();
              });
            })
            .catch(e => {
              if (e) {
                navigator.notification.alert('{TXT_ERR_SUBMITFEEDBACK}', '', '{ERR_SUBMIT_FEEDBACK_TITLE}');
              }
            });
        }
      });
    });
  });
  //* ************************************** */
});

// Clickevent that slides inn the sporlogg section
$('#show-sporlogg').click(() => {
  $('.sporlogg-section').slideToggle();
});

// Clickevent that toggles between normal sporlogg view and minimized sporlogg view
$('#sporlogg-button').click(() => {
  $('#sporlogg-button i').toggleClass('fa-chevron-up fa-chevron-down');
  $('#sporlogg').slideToggle();
  $('#sporlogg-small').slideToggle();
});
