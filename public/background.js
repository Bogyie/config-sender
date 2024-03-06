chrome.runtime.onStartup.addListener(() => {

    chrome.storage.sync.get(
        { 
            extId: '',
            config: '',
        },
        (items) => {
            chrome.runtime.sendMessage(items.extId, {
                action: 'updateConfig',
                dataType: 'ini',
                data: items.config
            })
        }
    );
})