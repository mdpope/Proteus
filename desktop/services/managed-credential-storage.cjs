// Mock Keychain is only for synthetic UI smoke tests. Never pass it to managed auth.
module.exports.managedCredentialStorage=(app,safeStorage)=>app.commandLine.hasSwitch('use-mock-keychain')?{isEncryptionAvailable:()=>false}:safeStorage;
