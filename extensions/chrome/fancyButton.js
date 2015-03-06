var FANCY_BTN_HTML = '<button class="button merge-branch-action js-details-target fancy-btn"><span class="octicon octicon-circuit-board"></span>\nFancyMerge</button>';
var FANCY_SUBMIT_HTML = '<button type="submit" class="button primary fancy-btn" data-disable-with="Fancifying..."><span class="octicon octicon-circuit-board"></span>\nConfirm fancyMerge</button>';
var EXTENSION_ID = $('#fancybuttonid').text();

function toggle(target, val) {
    target.prop('disabled', !val);
    if (val) {
        target.addClass('primary');
    } else {
        target.removeClass('primary');
    }
}

function shouldShow() {
    return !!$('.branch-action-state-clean, .branch-action-state-dirty').length;
}

function addMergeButton() {
    var enabled = !!$('.branch-action-state-clean').length;
    var fancyMergeBtn = $(FANCY_BTN_HTML);
    toggle(fancyMergeBtn, enabled);
    $('.merge-branch-action').replaceWith(fancyMergeBtn);
    return fancyMergeBtn;
}

function submitInterceptor(e, port) {
    e.preventDefault();
    port.postMessage({
        action: 'doFancyMerge',
        commitMessage: $('.merge-branch-form .merge-commit-message').text()
    })
}

function setupButtons(port) {
    var fancyMergeBtn = addMergeButton();
    var fancySubmitBtn = $(FANCY_SUBMIT_HTML);
    $('.merge-branch-form').removeAttr('data-remote');
    $('.merge-branch-form').on('submit', function(e) { submitInterceptor(e, port) });
    $('.merge-branch-form button:submit').replaceWith(fancySubmitBtn);
}

function main() {

    if (!shouldShow()) {
        return;
    }

    var port = chrome.runtime.connect(EXTENSION_ID, {});

    port.onMessage.addListener(function(message) {

        if (!message.action) {
            return;
        }
        
        switch (message.action) {
            case 'doFancyMerge':
                if (message.result.status === 'ok') {
                    message.jqXHR.getResponseHeader = function() {
                        return document.location.href;
                    }
                    $('.js-merge-pull-request').trigger('ajaxSuccess', [message.jqXHR, null, {updateContent: {}}]);
                } else {
                    $('.js-merge-pull-request').trigger('ajaxError', {responseText: message.result.error});
                }
                break;
        }
    });

    setupButtons(port);
}

main();