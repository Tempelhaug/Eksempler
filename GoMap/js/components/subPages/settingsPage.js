import editProfile from './editProfile';
import { translateMyProfile, translateMyAlertSettings, translateAboutPage, translate } from '../translation';
import alertSettings from './alertSettings';

/**
 * This scripts sets up buttonevents on the settings page to enable navigation between the different subpages we can naviget to on the settingsPage
 * All settingssubpages are injected into the settingsSubpage element.
 * @module components/subPages
 */

// Adds a clickevent that allows us to return to the settingspage from any of the subpages we can navigate to from the settingspage.
$(document).on('click', '.backToSettings', () => {
  $('#settingsMain').removeClass('hidden');
  $('#settingsSubPage').addClass('hidden');
  // Clears the settingsSubpage to prevent issues with multiple pages being visible
  $('#settingsSubPage').html('');
});

/**
 * Sets up the editprofile subpage, by injecting the edit-profile-page template into the settinsSubpage element, building the editProfile subpage and then translates the page
 */
$(document).on('click', '#edit-profile-button', () => {
  $.get('templates/subPages/edit-profile-page.html', tpl => {
    $('#settingsSubPage').append(tpl);
    $('#settingsSubPage').removeClass('hidden');
    $('#settingsMain').addClass('hidden');
    // Builds the editProfile page
    editProfile();
    // Translates the profile page
    translateMyProfile();
  });
});

/**
 * Sets up the editAlerts subpage, by injecting the alerts-page template into the settingsSubPage element, translates the page and then builds the alertSettings page.
 */
$(document).on('click', '#edit-alerts-button', () => {
  $.get('templates/subPages/alerts-page.html', tpl => {
    $('#settingsSubPage').html(tpl);
    $('#settingsSubPage').removeClass('hidden');
    $('#settingsMain').addClass('hidden');
    // Translates the alertSettingsPage
    translateMyAlertSettings();
    // Builds the alertSettingspage
    alertSettings();
  });
});

/**
 * Sets up the about page, by injecting the about-page template into the settingsSubpage element, then translates it
 */
$(document).on('click', '#about-button', () => {
  $.get('templates/subPages/about-page.html', tpl => {
    $('#settingsSubPage').append(tpl);
    $('#settingsSubPage').removeClass('hidden');
    $('#settingsMain').addClass('hidden');
    // Translate the about page
    translateAboutPage();
  });
});

/**
 * Sets up the legend page by injecting the legents-page template into the settingsSubpage element and translates the header.
 */

$(document).on('click', '#legend-button', () => {
  $.get('templates/subPages/legends-page.html', tpl => {
    $('#settingsSubPage').append(tpl);
    $('#settingsSubPage').removeClass('hidden');
    $('#settingsMain').addClass('hidden');
    translate('{TXT_LEGEND}', '#txt-municipal-infopages');
  });
});
