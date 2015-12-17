var PATH_DELIMITER = '/';
var ORGANIZATION_INDEX = 1;
var REPOSITORY_INDEX = 2;
var PULL_REQUEST_INDEX = 4;

var SERVER_URI = "http://localhost:11210/";

function createResourcePath(sender) {
	var senderUrl = document.createElement('a');
	senderUrl.href = sender.url;

	var prComponents = senderUrl.pathname.split(PATH_DELIMITER);
	var resource = [prComponents[ORGANIZATION_INDEX], prComponents[REPOSITORY_INDEX], prComponents[PULL_REQUEST_INDEX]];
	return resource.join(PATH_DELIMITER);
}

function canFancyMerge(port) {
	var resource = createResourcePath(port.sender);
	$.get(SERVER_URI + resource, function(resp) {
		port.postMessage({
            action: 'canFancyMerge',
            result: resp
        });	
	});
}

function doFancyMerge(port, commitMessage) {
	var resource = createResourcePath(port.sender);
	var payload = {
		'commitMessage': commitMessage
	};
	$.post(SERVER_URI + resource, payload, function(resp, ignored, jqXHR) {
		port.postMessage({
            action: 'doFancyMerge',
            result: resp,
            jqXHR: jqXHR
        });
	});
}

chrome.runtime.onConnectExternal.addListener(function(port) {
	port.onMessage.addListener(function(request) {

		if (!request.action) {
			return;
		}

		switch (request.action) {
			case 'canFancyMerge': 
				canFancyMerge(port);
				break;
			case 'doFancyMerge':
				doFancyMerge(port, request.commitMessage);
				break;
		}
	});
});

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
	    	conditions: [ new chrome.declarativeContent.PageStateMatcher(
	    		{
	      			css: ['.repository-content']
	      		}
      		)],
			actions: [new chrome.declarativeContent.ShowPageAction()]
    	}]);
  	});
});