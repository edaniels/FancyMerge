var NAME = "contentscript";

window.addEventListener('load', main, false);

function toggle(target, val) {
    target.prop('disabled', !val);
    if (val) {
        target.addClass('primary');
    } else {
        target.removeClass('primary');
    }
}

function main() {

    var show = !!$('.branch-action-state-clean, .branch-action-state-dirty').length;
    if (!show) {
        return;
    }

    var enabled = !!$('.branch-action-state-clean').length;
    var fancyMergeBtn = 
        $('<button class="button merge-branch-action" disabled><span class="octicon octicon-git-merge"></span>\nFancyMerge</button>');
    fancyMergeBtn.click(function() {
        console.log('sending message');
    });
    toggle(fancyMergeBtn, enabled);
    $('.branch-action-state-clean .merge-message, .branch-action-state-dirty .merge-message').prepend(fancyMergeBtn);

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

        if (!request.action) {
            return;
        }
        
        switch (request.action) {
            case 'canFancyMerge':
                // fancyMergeBtn.prop('disabled', !request.data);
                // if (request.data) {
                //     fancyMergeBtn.addClass('primary');
                // } else {
                //     fancyMergeBtn.removeClass('primary');
                // }
                break;
        }
    });

    chrome.runtime.sendMessage({
        action: 'canFancyMerge'
    });
}