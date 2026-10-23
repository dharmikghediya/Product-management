const test = require('node:test');
const assert = require('node:assert/strict');

const firebase = require('../config/firebase');

test('firebase module exposes initializeFirebase and sendPushNotification', () => {
    assert.equal(typeof firebase.initializeFirebase, 'function');
    assert.equal(typeof firebase.sendPushNotification, 'function');
});

test('sendPushNotification rejects empty tokens', async () => {
    const result = await firebase.sendPushNotification({
        token: '',
        title: 'Test title',
        body: 'Test body'
    });

    assert.deepEqual(result, {
        success: false,
        message: 'No FCM token provided'
    });
});
