// define all constants the app needed here
// this file is shared and used by both background and content script

var constants = {
  storageKeys: {
    kExceptionTwitterHandlesKey: 'exception-twitter-handles',
    kUserOAuthToken: 'userOAuthToken',
    kUserLicense: 'userLicense',
    kUserVerifiedLicense: 'userVerifiedLicense',
    kUserPurchasedLifetimeIAP: 'userPurchasedLifetimeIAP',
    kUserRefreshPageWhenSave: 'userRefreshPageWhenSave'
  },

  trialSettings: {
    kTrialPeriodDays: 15,
    kLifetimeSKU: "lifetime",
    kExceptionsLimit: 3 // number of users limit for exception list when trial expired
  },

  sysSettings: {
    debug: false
  },

  messageKey: {
    kExceptions: 'msg-exception',
    kIntendToBuyIAP: 'msg-intend-buyiap',
    kExecuteGetRid: 'msg-execute-getrid',
    kNotifyUpdatedGetRidLimit: 'msg-notify-getrid-limit'
  },

  kTextAreaInitialValue: "Enter twitteruser1, twitteruser2. Case-insensitive."
}