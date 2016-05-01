var Xray = require('x-ray');
var _ = require('lodash');
var md5 = require('md5');
var xray = Xray();
var twilio = require('twilio');
var smsClient = new twilio.RestClient('AC1ce15027fa09b6239f8c1179bedfd70f', 'd8914567316640b076881c096f1fc552');
var productCache = [];
var CLIENT_NUMBER = '+48732483530';
var MESSAGING_NUMBER = '+48691507867';
var SEARCH_URL = 'http://olx.pl/dom-ogrod/swidnica/?search[filter_float_price%3Afrom]=free&search[dist]=100';

function getProductData(callback) {

  console.log('start fetching');

  xray(SEARCH_URL,
    xray('#offers_table .offer', [{
      name: '.detailsLink strong',
      location: 'small.breadcrumb.x-normal span',
      link: '.detailsLink@href'
    }])

  )(function (err, data) {

    data = data.map(function (item) {
      return {
        name: item.name,
        location: item.location.trim(),
        id: md5(item.name),
        link: item.link
      }
    });

    if (_.isFunction(callback)) {
      callback(data);
    }
  });
}

function updateCache(data) {

  data.forEach(function (item) {
    var isEntryInCache = _.find(productCache, {id : item.id});

    if (!isEntryInCache) {
      item.isSend = false;
      productCache.push(item)
    }
  });

  console.log('catche updated');
  //console.log(productCache)

}


function validateProductToSend(item) {
  return !item.isSend;
}


function parseMessage(item) {
  return item.link;
}


function sendNotification() {
  [productCache[0]].forEach(function (item) {
    if (validateProductToSend(item)) {

      smsClient.sms.messages.create({
        to: MESSAGING_NUMBER,
        from: CLIENT_NUMBER,
        body: parseMessage(item)
      }, function(error, message) {

        if (!error) {
          console.log('sms send', item.id);
          sendSent((item.id));
        } else {
          console.log(error)
        }
      });
    }
  })
}


function sendSent (id) {

  productCache.forEach(function (product) {
    if (id === product.id) {
      product.isSend = true;
    }
  });

}


function processData() {

  getProductData(function (data) {
    updateCache(data || []);
    sendNotification()
  });
}

setInterval(processData, 1000 * 60);
processData();

