// Saves options to chrome.storage
const elById = (id) => document.getElementById(id);

const getElements = () => {
    const extIdInput = elById("extId");
    const awsRegionInput = elById("awsRegion");
    const awsAccessKeyIdInput = elById("awsAccessKeyId");
    const awsSecretAccessKeyInput = elById("awsSecretAccessKey");
    const emailInput = elById("email");
    const excludeInput = elById("exclude");

    return { 
        extIdInput, 
        awsRegionInput, 
        awsAccessKeyIdInput, 
        awsSecretAccessKeyInput,
        emailInput,
        excludeInput
    };
}

const saveOptions = () => {
    const { 
        extIdInput, 
        awsRegionInput, 
        awsAccessKeyIdInput, 
        awsSecretAccessKeyInput,
        emailInput,
        excludeInput
    } = getElements();
    
    const extId = extIdInput.value;
    const awsRegion = awsRegionInput.value;
    const awsAccessKeyId = awsAccessKeyIdInput.value;
    const awsSecretAccessKey = awsSecretAccessKeyInput.value;
    const email = emailInput.value;
    const exclude = excludeInput.value;

    chrome.storage.sync.set(
        { extId, awsRegion, awsAccessKeyId, awsSecretAccessKey, email, exclude },
        () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 750);
        }
    );
};
  
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    const { 
        extIdInput, 
        awsRegionInput, 
        awsAccessKeyIdInput, 
        awsSecretAccessKeyInput,
        emailInput,
        excludeInput
    } = getElements();

    chrome.storage.sync.get(
        { 
            extId: '',
            awsRegion: 'ap-northeast-2',
            awsAccessKeyId: '',
            awsSecretAccessKey: '',
            email: '',
            exclude: 'terraform-runner'
        },
        (items) => {
            extIdInput.value = items.extId;
            awsRegionInput.value = items.awsRegion;
            awsAccessKeyIdInput.value = items.awsAccessKeyId;
            awsSecretAccessKeyInput.value = items.awsSecretAccessKey;
            emailInput.value = items.email;
            excludeInput.value = items.exclude;
        }
    );
};
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);