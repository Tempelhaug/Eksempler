/**
 * Sets up clickevents to toggle visible changes on clicks on the bottom nav,
 * change background color and image color so that the element that was clicked stands out from the rest of the bottom nav elements
 * @module views/bottomNav
 */
$('.btn-link').click(e => {
  // Clicker is the element that was clicked, and therefore wants to be highlighted
  const clicker = $(e.currentTarget);

  // If we clicked the item that is already active do nothing and return
  if (clicker.hasClass('active')) return;

  // If we didnt click the showsporlogg button we hide the sporlogg section
  if ($(e.currentTarget).attr('id') !== 'show-sporlogg' && $('.sporlogg-section').is(':visible')) {
    $('.sporlogg-section').slideToggle();
  }

  // Remove active class from all elements and set the color back to standard
  $('.btn-link')
    .removeClass('active')
    .children()
    .css('color', '#4d4d4d');

  // Do the same for the gomap-home button
  $('.gomap-home')
    .children()
    .removeClass('gomap-light')
    .addClass('gomap-dark');

  // Adds the active class and sets a differen backgroundcolor to the clicked element.
  clicker
    .addClass('active')
    .children()
    .css('color', '#fff');

  // If the clicked element was gomap-home we add the light version of the image by using the gomap-light class
  if (clicker.hasClass('gomap-home')) {
    clicker
      .children()
      .removeClass('gomap-dark')
      .addClass('gomap-light');
  }
});
