function ensureEnabled(cb) {
    var tabUrl = document.createElement('a');
    tabUrl.href = window.location.href;;
    var pathParts = tabUrl.pathname.split('/');
    var org = pathParts[1];
    var repo = pathParts[2];
    var key = [pathParts[1], pathParts[2]].join('/');

    chrome.storage.sync.get(key, function(value) {
      var checked = !$.isEmptyObject(value) ? value[key] : false;
      if (checked) {
        cb();
      }
    });
}

ensureEnabled(function() {
	window.addEventListener('load', function() {
		$('body').append('<div id="fancybuttonid" style="display:none">' + chrome.runtime.id + '</div>');
	    $('head').append('<script type="text/javascript" src="' + chrome.extension.getURL('fancyButton.js') + '"></script>');
	    $('head').append('<link href="' + chrome.extension.getURL('fancyButton.css') + '" media="all" rel="stylesheet" />');
	}, false);
});