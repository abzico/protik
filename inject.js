// dependency: constants.js, storage.js, api.js

var volatileIsGetRidLimit = false;  // aim to use this variable as short period as much as possible, re-read from storage for two keys (kUserPurchasedLifetimeAPI and kUserVerifiedLicense; former has higher priority)
var exceptionArray = [];

// find owner username first
var ownerHandleDom = document.querySelector('div.DashboardProfileCard-content span.username > b');
var ownerHandle = null;
if (ownerHandleDom != null) {
  ownerHandle = ownerHandleDom.innerHTML || ownerHandle.textContent;
  ownerHandle = ownerHandle.toLowerCase();
}

// get rid of tweets according to current limitation set
function getRid() {
  // query dom element (twitter card) that is not you, yes, only show your tweets
  var tweets = document.querySelectorAll('div.tweet');
  for (var i=0; i <tweets.length; i++) {
    var t = tweets[i];

    // find handle of such tweet
    var handleDom = t.querySelector('span.username > b');
    if (handleDom != null) {
      var handle = handleDom.innerHTML || handleDom.textContent;
      handle = handle.toLowerCase();
      if (handle != ownerHandle && !matchHandle(handle)) {
        t.remove();
      }
    }
  }
}

// check whether input handle matches any of exceptions
function matchHandle(handle) {
  var limit = volatileIsGetRidLimit ? constants.trialSettings.kExceptionsLimit : exceptionArray.length;
  for (var i=0; i<limit; i++) {
    if (handle == exceptionArray[i]) {
      return true;
    }
  }
  return false;
}

// parse raw exceptions as array 
function parseExceptionsAsArray(rawExceptions) {
  var tokens = rawExceptions.split(',');
  var retTokens = [];
  for (var i=0; i<tokens.length; i++) {
    var t = tokens[i].replace(' ', '');
    retTokens.push(t.toLowerCase());
  }
  return retTokens;
}

function updateGetRidLimitStatus() {
  // we need to read from two keys from storage
  // kUserPurchasedLifetimeAPI and kUserVerifiedLicense
  // the first one has higher priority
  loadUserPurchasedLifetimeIAP(function(purchased) {
    if (purchased && volatileIsGetRidLimit) {
      // no limit
      volatileIsGetRidLimit = false;
      // no need to check another one as this has higher priority
      console.log('volatileIsGetRidLimit: ' + volatileIsGetRidLimit);
    }
    else {
      // load kUserVerifiedLicense
      loadUserVerifiedLicense(function(verified) {
        volatileIsGetRidLimit = verified ? false : true;
        console.log('volatileIsGetRidLimit: ' + volatileIsGetRidLimit);
      });
    }
  });
}

// begin operation only if detect owner handle
if (ownerHandle != null) {
  // firstly try to load exception list
  loadExceptionsFromStorage(function(rawExceptions) {
    if (rawExceptions != null) {
      // parse exception into array
      exceptionArray = parseExceptionsAsArray(rawExceptions);
    }
  });

  // update getRid() limit status flag
  updateGetRidLimitStatus();

  // solution from https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
  // modified to fit our problem domain
  var observeDOM = (function(op){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // only listen to childlist, no need for subtree
            // this will trigger event just one time
            obs.observe( obj, { childList:true, subtree:false });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
        }
    };
  })();

  // observe for "See x new Tweets" bar shown up
  var newItemBarElem = document.querySelector('div.stream-container > div.stream-item.js-new-items-bar-container');
  if (newItemBarElem != null) {
    observeDOM(newItemBarElem, function() {
      // find a bar
      var newtweetBarButton = newItemBarElem.querySelector('button.new-tweets-bar');
      if (newtweetBarButton != null) {
        // click on it to expand
        newtweetBarButton.click();
        // now new elements added into DOM, getRid() will handle it
        // because we've listened to such event already
      }
    });
  }
  // observe for tweets as shown in stream
  observeDOM(document.getElementById('stream-items-id'), function() {
    getRid();
  });

  // listen to message sent by popup script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    // exception data
    if (request.key != null && request.key == constants.messageKey.kExceptions) {
      //sendResponse({ack: 'i got it!'});

      // parse raw exceptions as array, and set to array
      exceptionArray = parseExceptionsAsArray(request.message);

      // apply new exceptions right away
      getRid();
    }
    // user intends to buy iap
    else if (request.key != null && request.key == constants.messageKey.kIntendToBuyIAP) {
      //sendResponse({ack: 'i got that you wanna buy iap!'});

      // buy lifetie iap
      buyLifetimeIAP(function() {
        console.log('user cancelled iap widow, or failed to buy');
      }, function(response) {
        console.log('bought iap:', response);

        // save status to storage
        saveValueToStorage(constants.storageKeys.kUserPurchasedLifetimeIAP, true, function() {
          console.log('cant save purchasing status to storage');
        }, function() {
          console.log('saved purchasing status to storage.');
          // directly set limit flag
          volatileIsGetRidLimit = false;
          // immediately apply getRid()
          getRid();
        });
      });
    }
    // execute getRid()
    else if (request.key != null && request.key == constants.messageKey.kExecuteGetRid) {
      //sendResponse({ack: 'i got that you want to execute getRid()'});
      getRid();
    }
    // notified with updated of purchase iAP status
    else if (request.key != null && request.key == constants.messageKey.kNotifyUpdatedGetRidLimit) {
      //sendResponse({ack: 'i got that you have updated something that affects getRid() limit'});
      updateGetRidLimitStatus();
    }
  });
}