const {
    initializeFirebase,
    registerFcmToken,
    sendPushNotification,
    getRegisteredTokens
} = require('./firebase');

module.exports = {
    initializeFirebase,
    registerFcmToken,
    getRegisteredTokens,
    sendPushNotification
};
