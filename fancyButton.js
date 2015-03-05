var FANCY_BTN_HTML = '<button class="button merge-branch-action js-details-target"><span class="octicon octicon-circuit-board"></span>\nFancyMerge</button>';
var FANCY_SUBMIT_HTML = '<button type="submit" class="button primary" data-disable-with="Fancifying..."><span class="octicon octicon-circuit-board"></span>\nConfirm fancyMerge</button>';
var EXTENSION_ID = $('#fancybuttonid').text();
main();

function toggle(target, val) {
    target.prop('disabled', !val);
    if (val) {
        target.addClass('primary');
    } else {
        target.removeClass('primary');
    }
}

function addButton() {
    var fancyMergeBtn = $(FANCY_BTN_HTML);
    var show = !!$('.branch-action-state-clean, .branch-action-state-dirty').length;
    if (!show) {
        return;
    }
    var enabled = !!$('.branch-action-state-clean').length;
    toggle(fancyMergeBtn, enabled);
    $('.branch-action-state-clean .merge-message, .branch-action-state-dirty .merge-message').prepend(fancyMergeBtn);
    return fancyMergeBtn;
}

function submitInterceptor(e, port) {
    e.preventDefault();
    port.postMessage({
        action: 'doFancyMerge',
        commitMessage: $('.merge-branch-form .merge-commit-message').text()
    })
}

function main() {

    var port = chrome.runtime.connect(EXTENSION_ID, {});

    var fancyMergeBtn = addButton();
    var classicSubmitBtn = $('.merge-branch-form button:submit').get(0).cloneNode(true);
    var classicDataRemote = $('.merge-branch-form').attr('data-remote');
    var fancySubmitBtn = $(FANCY_SUBMIT_HTML);

    $('.button.merge-branch-action').on('click', function(e) {
        var mergeStrategy;
        if (e.target === fancyMergeBtn.get(0)) {
            mergeStrategy = 'fancy';
        } else {
            mergeStrategy = 'classic';
        }

        switch (mergeStrategy) {
            case 'fancy':
                $('.merge-branch-form').removeAttr('data-remote');
                $('.merge-branch-form').on('submit', function(e) { submitInterceptor(e, port) });
                $('.merge-branch-form button:submit').replaceWith(fancySubmitBtn);
                break;
            case 'classic':
                $('.merge-branch-form').attr('data-remote', classicDataRemote);
                $('.merge-branch-form').off('submit');
                $('.merge-branch-form button:submit').replaceWith(classicSubmitBtn);
                break;
        }
    });

    port.onMessage.addListener(function(message) {

        if (!message.action) {
            return;
        }
        
        switch (message.action) {
            case 'canFancyMerge':
                // fancyMergeBtn.prop('disabled', !request.data);
                // if (request.data) {
                //     fancyMergeBtn.addClass('primary');
                // } else {
                //     fancyMergeBtn.removeClass('primary');
                // }
                break;

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

    // port.postMessage({
    //     action: 'canFancyMerge'
    // });
}