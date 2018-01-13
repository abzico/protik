var textArea = null;
var exceptionList = [];
var kTextAreaInitialValue = "// Enter twitteruser1, twitteruser2. Case-insensitive.\r\n";
var kExceptionTwitterHandlesKey = 'exception-twitter-handles';

/**
 * Load exception list from storage, then return via callback.
 * @param {function} callback Callback function in function(exceptionsString) { ... }, return null if nothing
 */
function loadExceptions(callback) {
  chrome.storage.sync.get(kExceptionTwitterHandlesKey, function(items) {
    callback(chrome.runtime.lastError ? null : items[kExceptionTwitterHandlesKey]);
  })
}

/**
 * Send message to content scripts openning twitter-url tabs.
 * Yeah, we want all twitter tabs to take effective right when one tab 
 * @param {string} key  Message key to send to content scripts
 * @param {string} message Message to send to content scripts
 * @param {function} callback Callback when all things are done. It's in function() { ... }. Default is null.
 */
function sendMessageToAllContentScripts(key, message, callback=null) {
  // we will send message to all twitter tab
  // so each one can update their filtering behavior accordingly
  chrome.tabs.query({url: 'https://twitter.com/*'}, function(tabs) {
    for (var i=0; i<tabs.length; i++) {
      var msg = {};
      msg[key] = message;
      chrome.tabs.sendMessage(tabs[i].id, msg, function(response) {
        if (response != null) {
          console.log(response.ack);
        }
      });
    }

    if (callback) {
      callback();
    }
  });
}

// save exception list of twitter handles as entered in textarea
function saveExceptions() {
  // get value in textarea
  var items = {};
  items[kExceptionTwitterHandlesKey] = stripCommentLines(textArea.value);
  chrome.storage.sync.set(items, function() {
    if (chrome.runtime.lastError != null) {
      console.log('failed to save to storage');
    }
    else {
      console.log('successfully saved to storage');

      // now send message to notify all twitter tabs
      sendMessageToAllContentScripts(kExceptionTwitterHandlesKey, textArea.value, function() {
        window.close();
      });
    }
  });
}

function stripCommentLines(message) {
  // only // and \r\n at the back
  var regex = /^\/\/[\s\S\w\W\d\D]*[\r\n]+/g;
  var strip =  message.replace(regex, '');
  console.log('strip:' + strip);
  return strip;
}

document.addEventListener('DOMContentLoaded', () => {
  textArea = document.getElementById('textarea-exceptions');

  // check if we have existing exception list
  loadExceptions(function(exsString) {
    if (exsString != null) {
      // set loaded value to text area
      textArea.value = kTextAreaInitialValue + exsString;
    }
  });

  // save exceptions string to storage when users click on save button
  document.getElementById('save-button').addEventListener('click', saveExceptions, false);
});
