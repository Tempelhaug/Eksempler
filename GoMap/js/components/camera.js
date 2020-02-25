/**
 * Camera functions, sets up methods that allows us to access the phones imagelibrary, and upload those images to the app.
 *
 * @module components/camera
 *
 */

/**
 * Sets the options for the image access. We encode all images to JPEG and sets the quality to medium(50) just to save space on the images.
 * @param {String} srcType - lets us know what source the image is coming from
 */
const setOptions = srcType => {
  return {
    quality: 50,
    destinationType: Camera.DestinationType.FILE_URI,
    // In this app, dynamically set the picture source, Camera or photo gallery
    sourceType: srcType,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    allowEdit: true,
    correctOrientation: true, // Corrects Android orientation quirks
  };
};

/**
 * Sets an image Uri so that we can store the selected images as a String in the inernal database and on the server.
 *
 * @param {String} selection - Sets what type of selection the image is for, for preview images or downscaled versions we only want a small image, otherwise we use the normal scale of the image
 */
const openImagePicker = selection => {
  const srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
  const options = setOptions(srcType);

  if (selection === 'picker-thmb') {
    // Downscale the image
    options.targetHeight = 100;
    options.targetWidth = 100;
  }

  navigator.camera.getPicture(
    imageUri => {
      console.log(imageUri);
    },
    error => {
      console.log('Error occured while opening the photoalbum:', error);
    },
    options,
  );
};
export default openImagePicker;
