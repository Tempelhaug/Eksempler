import PerfectScrollbar from 'perfect-scrollbar';
/**
 * Sets up the sideNav, and adds various clickevents so that the sidebar behaves as we want, closing when its supposed to etc.
 * @module views/sideNav
 */

$('#menu').sideNav({
  edge: 'left', // Choose the horizontal origin
  closeOnClick: false, // Closes side-nav on &lt;a&gt; clicks, useful for Angular/Meteor
  // breakpoint: 1440, // Breakpoint for button collapse
  // MENU_WIDTH: 240, // Width for sidenav
  timeDurationOpen: 300, // Time duration open menu
  timeDurationClose: 200, // Time duration open menu
  timeDurationOverlayOpen: 50, // Time duration open overlay
  timeDurationOverlayClose: 200, // Time duration close overlay
  easingOpen: 'easeOutQuad', // Open animation
  easingClose: 'easeOutCubic', // Close animation
  showOverlay: true, // Display overflay
  showCloseButton: false, // Append close button into siednav
});

const removeSidebarFade = () => {
  $('#sidenav-overlay').remove();
  $('.drag-target').remove();
};
const sideNavScrollbar = document.querySelector('.custom-scrollbar');
// eslint-disable-next-line
const ps = new PerfectScrollbar(sideNavScrollbar);

// Offline maps button clicked
$('#myOfflineMaps').click(() => {
  removeSidebarFade();
  $('#menu').sideNav('hide');
  $('#map').addClass('hidden');
  $('#offlineMaps').removeClass('hidden');
});

// A subpage button was clikced -- attach this class to any button that opens up a subpage, hides map and maprelated menus + hides the navbar
$('.subPage').click(() => {
  removeSidebarFade();
  $('#menu').sideNav('hide');
  $('#map').addClass('hidden');
  // Hide the map menu buttons
  $('#fixed-top-menu').addClass('hidden');
  // Hide the bottom menu
  $('#fixed-bottom-menu').addClass('hidden');
});

// Back button was pressed and we want to show just  the map again -- Attach this class to any button that sends us back to the map-view
$(document).on('click', '.backToMap', () => {
  $('#map').removeClass('hidden');
  $('#subPages').html('');
  // Show the map menu buttons
  $('#fixed-top-menu').removeClass('hidden');
  // Show the bottom menu
  $('#fixed-bottom-menu').removeClass('hidden');
});

setInterval(() => {
  $('.drag-target').remove();
}, 1000);
