var NAME = "contentscript";

window.addEventListener('load', main, false);

function main() {
    var fancyMergeBtn = $('<button class="button merge-branch-action" disabled><span class="octicon octicon-git-merge"></span>\nFancyMerge</button>');
    fancyMergeBtn.click(function() {
        console.log('sending message');
    });
    $('.merge-message').prepend(fancyMergeBtn);

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

        if (!request.action) {
            return;
        }
        
        switch (request.action) {
            case 'canFancyMerge':
                fancyMergeBtn.prop('disabled', !request.data);
                if (request.data) {
                    fancyMergeBtn.addClass('primary');
                } else {
                    fancyMergeBtn.removeClass('primary');
                }
                break;
        }
    });

    chrome.runtime.sendMessage({
        action: 'canFancyMerge'
    });
}