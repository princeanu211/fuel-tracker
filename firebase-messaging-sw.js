// Service Worker for Fuel Tracker - Enhanced Background Notifications
var CACHE_NAME = 'fuel-tracker-v1';

// Install event
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'CHECK_REMINDERS') {
        var reminders = event.data.reminders || [];
        var today = new Date().toISOString().slice(0, 10);
        
        reminders.forEach(function(r) {
            if (r.done) return;
            if (r.dueDate === today) {
                self.registration.showNotification('⚠️ Reminder Due Today - ' + r.vehicleName, {
                    body: r.message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛽</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>',
                    tag: 'reminder-' + r.id,
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                });
            } else if (r.dueDate < today) {
                self.registration.showNotification('🚨 OVERDUE - ' + r.vehicleName, {
                    body: r.message + ' (Due: ' + r.dueDate + ')',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛽</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚨</text></svg>',
                    tag: 'overdue-' + r.id,
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200]
                });
            }
        });
    }
});

// Handle notification click - open the app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({type: 'window'}).then(function(clientList) {
            // If app is already open, focus it
            for (var i = 0; i < clientList.length; i++) {
                if (clientList[i].url.indexOf('fuel-tracker') !== -1 || clientList[i].url.indexOf('index') !== -1) {
                    return clientList[i].focus();
                }
            }
            // Otherwise open new window
            return self.clients.openWindow('./');
        })
    );
});