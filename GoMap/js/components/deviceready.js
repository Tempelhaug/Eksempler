/**
 * Async helpermethod that listens for the deviceReady event. Gives us a shorthand method of checking if the device is ready, since we need to do this in almost every script
 * @module components/deviceReady
 */
const deviceready = async cb => {
  await document.addEventListener('deviceready', cb, false);
};

export default deviceready;
