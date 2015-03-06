window.addEventListener('load', function() {
	$('body').append('<div id="fancybuttonid" style="display:none">' + chrome.runtime.id + '</div>');
    $('head').append('<script type="text/javascript" src="' + chrome.extension.getURL('fancyButton.js') + '"></script>');
    $('head').append('<link href="' + chrome.extension.getURL('fancyButton.css') + '" media="all" rel="stylesheet" />');
}, false);