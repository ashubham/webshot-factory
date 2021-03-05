# webshot-factory
[![Build Status](https://travis-ci.org/ashubham/webshot-factory.svg?branch=master)](https://travis-ci.org/ashubham/webshot-factory)
[![npm version](https://badge.fury.io/js/webshot-factory.svg)](https://badge.fury.io/js/webshot-factory)

<img src="https://github.com/ashubham/webshot-factory/raw/master/assets/webshot-factory.png" align="right" alt="Webshot Factory" />

screenshots at scale based on headless chrome.

## Basic Concept

- `Webshot-factory` creates a number of headless-chrome worker instances which take screenshots in round robin. Thus, can be horizontally scaled to provide good throughput.
- Includes a debug status page to monitor the worker instances.
- Can be used for batch report generation.
- Or to take a number of screenshots in general.
- Written in Typescript (types bundled).

## Installation

```
npm i webshot-factory
```

## Usage

```javascript
import * as shotFactory from 'webshot-factory';

await shotFactory.init({
    // Number of worker threads (chrome instances) to run.
    // A shot is assigned to a worker in round robin.
    concurrency: 10,

    // The callback method to be exposed on the window, 
    // which would be called by the application
    // Shot will be taken when callback is called.
    // This was 'callPhantom' in PhantomJS.
    callbackName: '',

    // A cache warmer url, 
    // so that workers can cache the webpage scripts.
    warmerUrl: 'http://google.com',
    width: 1000, // shot width
    height: 600, // shot height
    timeout: 60000, // timeout (millis) to wait for shot.
    webshotDebugPort: 3030 // Port where the status page is served.
    // To use Puppeteer with a different version of Chrome or Chromium,
    chromeExecutablePath: '/path/to/Chrome'
});

// Once initialized, just call getShot and
// a shot will be scheduled on a worker
// chrome instance.
shotFactory.getShot('http://yahoo.com').then(buffer => {
    // Do whatever with the buffer, can be used to email to recipients.
    console.log(buffer);
    // Or can be saved to a file.
    // Using the `fs` module.
    fs.createWriteStream('shot.png')
        .write(buffer)
        .end();
});
```

## Status Page

`Webshot-factory` includes a status page to check the status of the running chrome instance workers.

Visit: `http://<host>:<webshotDebugPort>/status`

Note: The default port is `3030`.

To check the status and debug any problems. The page looks like this:

<img src="https://github.com/ashubham/webshot-factory/raw/master/assets/webshot-debug-page.png" alt="Webshot Factory status" />


