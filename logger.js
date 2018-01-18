// dependencies: constants.js

// one time fetch this flag
var _isDebug = constants.sysSettings.debug;

/**
 * Log message with parameters
 * @param {string} message (optional) Message to log
 * @param {...} optionalParams (optional) Variadic optional parameters
 */
function log(message=null, ...optionalParams) {
  if (_isDebug) {
    console.log(message, ...optionalParams);
  }
}