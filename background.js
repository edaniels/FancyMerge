var PATH_DELIMITER = '/';
var ORGANIZATION_INDEX = 1;
var REPOSITORY_INDEX = 2;
var PULL_REQUEST_INDEX = 4;

function createResourcePath(sender) {
	var senderUrl = document.createElement('a');
	senderUrl.href = sender.url;

	var prComponents = senderUrl.pathname.split(PATH_DELIMITER);
	var resource = [prComponents[ORGANIZATION_INDEX], prComponents[REPOSITORY_INDEX], prComponents[PULL_REQUEST_INDEX]];
	return resource.join(PATH_DELIMITER);
}

function canFancyMerge(sender) {
	var resource = createResourcePath(sender);
	console.log('Checking if can fancy merge for ' + resource);
	$.get("http://localhost:8080/" + resource, function(resp) {
		if (resp.status === 'ok') {
			chrome.tabs.sendMessage(sender.tab.id, {
	            action: 'canFancyMerge',
	            data: resp.canFancyMerge
	        });
		}
	});
}

function doFancyMerge(sender) {
	var resource = createResourcePath(sender);
	console.log('Checking if can fancy merge for ' + resource);
	$.get("http://localhost:8080/" + resource, function(resp) {
		if (resp.status === 'ok') {
			chrome.tabs.sendMessage(sender.tab.id, {
	            action: 'canFancyMerge',
	            data: resp.canFancyMerge
	        });
		}
	});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	console.log(request);

	if (!request.action) {
		return;
	}

	switch (request.action) {
		case 'canFancyMerge': 
			canFancyMerge(sender);
			break;
	}
});