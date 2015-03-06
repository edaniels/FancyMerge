function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    lastFocusedWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    var url = tab.url;
    callback(url);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var tabUrl;
  getCurrentTabUrl(function(url) {
    var tabUrl = document.createElement('a');
    tabUrl.href = url;
    var pathParts = tabUrl.pathname.split('/');
    var org = pathParts[1];
    var repo = pathParts[2];
    var key = [pathParts[1], pathParts[2]].join('/');

    chrome.storage.sync.get(key, function(value) {
      var checked = !$.isEmptyObject(value) ? value[key] : false;
      $('#enableFancyMerge').attr('checked', checked);
    });

    $('#enableFancyMerge').change(function() {
      var checked = $('#enableFancyMerge').is(":checked");
      var store = {};
      store[key] = checked;
      chrome.storage.sync.set(store);
    });
  });
});
