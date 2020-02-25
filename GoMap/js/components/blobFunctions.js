/**
 * Methods for handling blobs in the app. Since we want to store data as strings we use these methods to encode and decode blobs into base64 so that we can store a blob as a string.
 *
 * @module components/blobFunctions
 */

/**
 * Takes a string and turns it into a dataarray that we use for building blobs
 *
 * @param bin - a string of data we want to turn into a blob
 *
 * @returns returns an ArrayBuffer that contains the data of the blob we're decoding
 */
export const binStringToArrayBuffer = bin => {
  const { length } = bin;
  const buf = new ArrayBuffer(length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < length; i += 1) {
    arr[i] = bin.charCodeAt(i);
  }
  return buf;
};

/**
 * Takes a stringified blob an builds it into a blob again, so that we can use it as  a blob in the app
 *
 * @param {Object} encodedBlob - An object that contains several strings that describes a blob.
 *
 * @returns A blob based on the stringified blob we passed into this method
 */
export const decodeBlob = encodedBlob => {
  const arrayBuff = binStringToArrayBuffer(atob(encodedBlob.data));
  return new Blob([arrayBuff], { type: encodedBlob.type, size: encodedBlob.size });
};

/**
 * Turns a blob into a stringified object that we can store in the internal database, by setting up a promise that resolves when the blob has been turned into a base64 format
 *
 * @param {Blob} - a blob that we want ot stringify
 *
 * @returns A promise containing the stringified blob
 */
export const encodeBlob = blob => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = e => {
      const base64 = btoa(e.target.result || '');
      resolve({
        data: base64,
        type: blob.type,
        size: blob.size,
      });
    };
    reader.readAsBinaryString(blob);
  });
};
