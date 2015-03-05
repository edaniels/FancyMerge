var NAME = "contentscript";

window.addEventListener('load', main, false);

function main() {
    var fancyMergeBtn = $('<button class="button merge-branch-action primary" disabled>FancyMerge</button>');
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
                fancyMergeBtn.prop('disabled', request.data);
                break;
        }
    });

    chrome.runtime.sendMessage({
        action: 'canFancyMerge'
    });
}