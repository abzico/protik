// define all constants the app needed here
// this file is shared and used by both background and content script

var constants = {
  storageKeys: {
    kExceptionTwitterHandlesKey: 'exception-twitter-handles',
    kUserOAuthToken: 'userOAuthToken',
    kUserLicense: 'userLicense',
    kIsGetRidLimit: 'userIsGetRidLimit'
  },

  trialSettings: {
    kTrialPeriodDays: 15,
    kLifetimeSKU: "lifetime",
    kExceptionsLimit: 3 // number of users limit for exception list when trial expired
  },

  messageKey: {
    kExceptions: 'msg-exception',
    kIntendToBuyIAP: 'msg-intend-buyiap',
    kExecuteGetRid: 'msg-execute-getrid'
  },

  kTextAreaInitialValue: "Enter twitteruser1, twitteruser2. Case-insensitive."
}