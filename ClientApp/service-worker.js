importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.4/workbox-sw.js');
import { skipWaiting, clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import * as googleAnalytics from 'workbox-google-analytics';


skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

googleAnalytics.initialize(); // Google Analytics - enable offline

var app = {
    "clientVersion": "1.0.0-3978",
}
var CACHE_NAME = 'teamatical-cache-v' + app.clientVersion;
var cacheWhitelist = [CACHE_NAME, 'google-fonts-stylesheets', 'google-fonts-webfonts'];

self.addEventListener('activate', function (event)
{
    event.waitUntil(
        caches.keys().then(function (cacheNames)
        {
            return Promise.all(
                cacheNames.map(function (cacheName)
                {
                    if (cacheWhitelist.indexOf(cacheName) === -1 && !cacheName.startsWith('workbox-'))
                    {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .catch(function(res) { console.log(1, 'err', res) })
    );
});

//Cache JavaScript and CSS
registerRoute(/\.(?:js|css)$/, new StaleWhileRevalidate());

//Cache ICO/JSON
registerRoute(new RegExp('(?:https:\/\/.*)?\/favicon.ico'), new CacheFirst({}), 'GET');
registerRoute(new RegExp('(?:https:\/\/.*)?\/manifest.json'), new CacheFirst({}), 'GET');


//Cache External Resources
registerRoute(/^https:\/\/www\.googletagmanager\.com\/gtm\.js/, new CacheFirst({}), 'GET');
registerRoute('https://www.google-analytics.com/plugins/ua/ec.js', new CacheFirst({}), 'GET');
registerRoute('https://js.stripe.com/v3/', new CacheFirst({}), 'GET');


// Cache the Google Fonts stylesheets with a stale while revalidate strategy.
registerRoute(
    /^https:\/\/fonts\.googleapis\.com/,
    new CacheFirst({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200]
            })
        ]
    })
);


// Cache the Google Fonts webfont files with a cache first strategy for 1 year.
registerRoute(
    /^https:\/\/fonts\.gstatic\.com/,
    new CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxAgeSeconds: 60 * 60 * 24 * 365,
            }),
        ],
    })
);

