import * as shotFactory from '../index';

shotFactory.init({
    concurrency: 5,
    callbackName: 'callPhantom',
    warmerUrl: 'http://google.com',
    width: 1000, // shot width
    height: 600 // shot height
}).then(_ => {
    shotFactory.getShot('http://yahoo.com').then(buffer => {
        console.log(buffer);
    });
});
