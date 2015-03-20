var FANCY_BTN_HTML = '<button class="btn merge-branch-action js-details-target fancy-btn"><span class="octicon octicon-circuit-board"></span>\nFancyMerge</button>';
var FANCY_SUBMIT_HTML = '<button type="submit" class="btn btn-primary fancy-btn" data-disable-with="Fancifying..."><span class="octicon octicon-circuit-board"></span>\nConfirm fancyMerge</button>';
var FILL_COMMITS_HTML = '<hr/><button class="btn btn-secondary"><span class="octicon octicon-circuit-board"></span>\nReplace Message with Combined Commits</button>';
var EXTENSION_ID = $('#fancybuttonid').text();
var NEW_LINE = '\n';

function toggle(target, val) {
    target.prop('disabled', !val);
    if (val) {
        target.addClass('btn-primary');
    } else {
        target.removeClass('btn-primary');
    }
}

function shouldShow() {
    return !!$('.branch-action-state-clean, .branch-action-state-dirty, .branch-action-state-unstable').length;
}

function addMergeButton() {
    var enabled = !!$('.branch-action-state-clean').length;
    var fancyMergeBtn = $(FANCY_BTN_HTML);
    toggle(fancyMergeBtn, enabled);
    $('.branch-action-state-clean, .branch-action-state-dirty, .branch-action-state-unstable').find('.merge-message .merge-branch-action')
        .replaceWith(fancyMergeBtn);
    return fancyMergeBtn;
}

function submitInterceptor(e, port) {
    e.preventDefault();
    port.postMessage({
        action: 'doFancyMerge',
        commitMessage: $('.merge-branch-form .merge-commit-message').val()
    })
}

function setupButtons(port) {
    var fancyMergeBtn = addMergeButton();
    var fancySubmitBtn = $(FANCY_SUBMIT_HTML);
    $('.merge-branch-form').removeAttr('data-remote');
    $('.merge-branch-form').on('submit', function(e) { submitInterceptor(e, port) });
    $('.commit-form-actions button:submit').replaceWith(fancySubmitBtn);

    // Skip for single commit PRs
    if (getCommitMessages().length === 1) {
        return;
    }

    var fillCommitsBtn = $(FILL_COMMITS_HTML);
    fillCommitsBtn.on('click', function(e) {
        e.preventDefault();
        var commitMessages = getCommitMessages();
        var newCommitMessage = $('.js-issue-title').text() + NEW_LINE + formatCommitMessages(commitMessages);
        $('.merge-branch-form .merge-commit-message').val(newCommitMessage);
    });
    fillCommitsBtn.insertAfter('.commit-form-actions');
}

function formatCommitMessages(commitMessages) {
    var result = '';
    $.each(commitMessages, function(idx, message) {
        result += NEW_LINE + '- ' + message;
    });
    return result;
}

function getCommitMessages() {
    var result = []
    var commitMessages = $('.commits-listing .commit .message');
    $.each(commitMessages, function(idx, message) {
        result.push(message.textContent);
    })
    return result;
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