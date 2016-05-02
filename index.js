var Xray = require('x-ray');
var _ = require('lodash');
var md5 = require('md5');
var express = require('express');
var nexmo = require('easynexmo');

var app = express();
var xray = Xray();
var productCache = [];
var CLIENT_NUMBER = '48732231043';
var MESSAGING_NUMBER = '48691507867';
var SEARCH_URL = 'http://olx.pl/dom-ogrod/swidnica/?search[filter_float_price%3Afrom]=free&search[dist]=100';


nexmo.initialize(process.env.NEXMO_KEY, process.env.NEXMO_SECRET);

console.log('nexmo initialize', process.env.NEXMO_KEY, process.env.NEXMO_SECRET)

app.get('/', function (req, res) {
  res.send('');
});

app.listen(process.env.PORT || 5000, function () {
  console.log('Example app listening on port 3000!');
});

function getProductData(callback) {

  console.log('start fetching');

  xray(SEARCH_URL,
    xray('#offers_table .offer', [{
      name: '.detailsLink strong',
      location: 'small.breadcrumb.x-normal span',
      link: '.detailsLink@href'
    }])

  )(function (err, data) {

    data = (data||[]).map(function (item) {
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
  productCache.forEach(function (item) {
    if (validateProductToSend(item)) {

      nexmo.sendTextMessage(
        CLIENT_NUMBER,
        MESSAGING_NUMBER,
        parseMessage(item),
        function(error, message) {

        if (!error) {
          console.log('sms send', item.id);
          sendSent(item.id);
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

getProductData(function (data) {
  updateCache(data || []);

  productCache.forEach(function (item) {
    item.isSend = true;
  })
});

