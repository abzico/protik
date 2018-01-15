// find owner username first
var ownerHandleDom = document.querySelector('div.DashboardProfileCard-content span.username > b');
var ownerHandle = null;
if (ownerHandleDom != null) {
  ownerHandle = ownerHandleDom.innerHTML || ownerHandle.textContent;
  ownerHandle = ownerHandle.toLowerCase();
}

var exceptionArray = [];
var kExceptionTwitterHandlesKey = 'exception-twitter-handles';

/**
 * Load exception list from storage, then return via callback.
 * Note: This function also exists on popup.js, as we can't just wait script on popup.js to be loaded, it's too late unless we want to remove all tweets :]
 * @param {function} callback Callback function in function(exceptionsString) { ... }, return null if nothing
 */
function loadExceptions(callback) {
  chrome.storage.sync.get(kExceptionTwitterHandlesKey, function(items) {
    callback(chrome.runtime.lastError ? null : items[kExceptionTwitterHandlesKey]);
  })
}

// get rid of tweets
function getRid() {
  // query dom element (twitter card) that is not you, yes, only show your tweets
  var tweets = document.querySelectorAll('div.tweet');
  for (var i=0; i < tweets.length; i++) {
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
  for (var i=0; i<exceptionArray.length; i++) {
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

// begin operation only if detect owner handle
if (ownerHandle != null) {
  // firstly try to load exception list
  loadExceptions(function(rawExceptions) {
    if (rawExceptions != null) {
      // parse exception into array
      exceptionArray = parseExceptionsAsArray(rawExceptions);
    }
  });

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
    // receive exceptions of twitter handle
    if (request[kExceptionTwitterHandlesKey] != null) {
      sendResponse({ack: 'i got it!'});

      // parse raw exceptions as array, and set to array
      exceptionArray = parseExceptionsAsArray(request[kExceptionTwitterHandlesKey]);

      // apply new exceptions right away
      getRid();
    }
  });
}