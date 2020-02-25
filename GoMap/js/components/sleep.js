/**
 * @module components/sleep
 */
/**
 * Helper method that sets up a timeout that lasts the given amount of milliseconds
 *
 * @param milliseconds - the amount of milliseconds we want the sleep to last.
 *
 * @returns A promise that resolve when the timeout completes
 */
const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

export default sleep;
