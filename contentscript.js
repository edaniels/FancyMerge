window.addEventListener('load', function() {
	$('body').append('<div id="fancybuttonid" style="display:none">' + chrome.runtime.id + '</div>');
    $('head').append('<script type="text/javascript" src="' + chrome.extension.getURL('fancyButton.js') + '"></script>');
}, false);