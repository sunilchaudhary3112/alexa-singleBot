"use strict";

const {describe, it} = require('mocha');
const supertest = require('supertest');
const request = require('request');
const sinon = require('sinon');
const _ = require('underscore');
var app = require('../app.js');
var port = 4001;
const config = {
  root: __dirname,
  port: port,
  logLevel: 'INFO',
  logger: console,
  basicAuth: null,
  sslOptions: null
};
var express_app = app.init(config);
express_app.listen(port);

var setAlexaConfig = function(config, callback){
  request.put({
    uri: 'http://localhost:' + port + '/config',
    body: config,
    json: true,
    timeout: 60000,
    followAllRedirects: true,
    followOriginalHttpMethod: true,
    callback: function (err, response, body) {
      if (!err) {
        callback();
      } else {
        console.log("setAlexaConfig Body", body);
        console.log("setAlexaConfig Error", err);
        callback();
      }
    }
  });
};

var stubWebhookResponse = function(signature, responseFilename) {
  return function(a1, a2, a3) {
    /*console.log(a1);
    console.log(a2);
    console.log(a3);*/
    var botResp = require(responseFilename);
    request.post({
      uri: 'http://localhost:' + port + '/singleBotWebhook/messages',
      headers: {'X-Hub-Signature': signature},
      body: botResp,
      json: true,
      timeout: 60000,
      followAllRedirects: true,
      followOriginalHttpMethod: true,
      callback: function (err, response, body) {
        if (!err) {
          return;
        } else {
          console.log("stubWebhookResponse Body", body);
          console.log("stubWebhookResponse Err", err);
          return;
        }
      }
    });
  };
};

var stub;

describe('Basic', function(blockDone) {


    it('Simple Test', function(done) {
      supertest(express_app)
        .get('/alexa/app')
        .expect(404, done);
    });

    it('Bot Response', function(done){
      supertest(express_app)
        .post('/singleBotWebhook/messages')
        .set('X-Hub-Signature','sha256=fc43accdce5eeb187a09ee29a76b6ea949db7ea5003659fdd26b9794e24b3423')
        .send(require('./orderPizzaBotResp.json'))
        .expect(200, function(){
          done();
          blockDone();
        });
    });
});

describe('Command', function(){

  before(function(done) {
    // runs before all tests in this block
    setAlexaConfig({
      channelSecretKey: 'DpfWJJeOODF9Jf5uKXOe3bDFnTqIc45k'
    }, function(){
      stub = sinon.stub(app, 'sendWebhookMessageToBot').callsFake(
        stubWebhookResponse(
          'sha256=fc43accdce5eeb187a09ee29a76b6ea949db7ea5003659fdd26b9794e24b3423',
          './orderPizzaBotResp.json')
      );
      done();
    });
  });

  it('Order Pizza', function(done){
      supertest(express_app)
        .post('/alexa/app')
        .send(require('./orderPizzaReq.json'))
        .expect(200, require('./orderPizzaResp.json'), function(err, incomingMessage) {
          if (err) {
            console.log(incomingMessage.headers);
            console.log(incomingMessage.text);
            done(err);
          } else {
            done();
          }
        });
    });

});



describe('FinBot show transactions', function(blockDone){

  before(function(done) {
    // runs before all tests in this block
    setAlexaConfig({
      channelSecretKey: '8SJBdy5EBGIBk5jsyq53uipIV5fPVewu'
    }, function(){
      stub.restore();

      stub = sinon.stub(app, 'sendWebhookMessageToBot').callsFake(
        stubWebhookResponse(
          'sha256=bf0b9a775cbcdd6baa22b0719476b0e3dce11283b08ce0e9f89e1b8f5c7fef15',
          './finBot_showTransactionsBotResp.json')
      );

      done();
    });
  });

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_showTransactionsReq.json'))
      .expect(200, require('./finBot_showTransactionsResp.json'), function(err, incomingMessage) {
        if (err) {
          console.log(incomingMessage.headers);
          console.log(incomingMessage.text);
          done(err);
        } else {
          done();
        }
        blockDone();
      });
  });

});


describe('FinBot credit card', function(blockDone){

  before(function(done) {
    // runs before all tests in this block
      stub.restore();

      stub = sinon.stub(app, 'sendWebhookMessageToBot').callsFake(
        stubWebhookResponse(
          'sha256=c6c541a69e410101c016c030132386c6be41cd9ea72e26a2550ed6b4b0f32501',
          './finBot_creditCardBotResp.json')
      );
      done();
  });

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_creditCardReq.json'))
      .expect(200, require('./finBot_creditCardResp.json'), function(err, incomingMessage) {
        if (err) {
          console.log(incomingMessage.headers);
          console.log(incomingMessage.text);
          done(err);
        } else {
          done();
        }
        blockDone();
      });
  });

});


describe('FinBot debits', function(blockDone){

  before(function(done) {
    // runs before all tests in this block
    stub.restore();

    stub = sinon.stub(app, 'sendWebhookMessageToBot').callsFake(
      function() {
        stubWebhookResponse(
          'sha256=f8fb24c3c7cff841fa16834641f3f8267a8694b3894cd4d959b1895b0a940e11',
          './finBot_debitsBotResp1.json')();
        stubWebhookResponse(
          'sha256=a239fd1d15719b233bbcbdc8a25af2103050250af219d038570aceffbf9f31d9',
          './finBot_debitsBotResp2.json')();
      }
    );
    done();
  });

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_debitsReq.json'))
      .expect(200)
      .end(function(err, res){
        var resp1 = require('./finBot_debitsResp.json');
        if (_.isEqual(resp1,res.body)){
          console.log('matched expected response 1');
          done();
        } else {
          var resp2 = require('./finBot_debitsResp_outOfOrder.json');
          if (_.isEqual(resp2,res.body)){
            console.log('matched expected response 2');
            done();
          } else {
            console.log('did not match either responses');
            console.log(JSON.stringify(res.body));
            var diff = JSON.stringify(_.omit(res.body, function(v,k) { return resp1[k] === v; }));
            done(new Error(diff));
          }
        }
      });
  });

});


describe('FinBot card 6 uber', function(blockDone){

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_card6UberReq.json'))
      .expect(200, require('./finBot_card6UberResp.json'), function(err, incomingMessage) {
        if (err) {
          console.log(incomingMessage.headers);
          console.log(incomingMessage.text);
          done(err);
        } else {
          done();
        }
        blockDone();
      });
  });
});


describe('FinBot card return', function(blockDone){

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_cardReturnReq.json'))
      .expect(200, require('./finBot_debitsResp.json'), function(err, incomingMessage) {
        if (err) {
          console.log(incomingMessage.headers);
          console.log(incomingMessage.text);
          done(err);
        } else {
          done();
        }
        blockDone();
      });
  });

});

describe('FinBot lets Travel', function(blockDone){

  it('Execute', function(done){
    supertest(express_app)
      .post('/alexa/app')
      .send(require('./finBot_card1LetsTravelReq.json'))
      .expect(200, require('./finBot_card1LetsTravelResp.json'), function(err, incomingMessage) {
        if (err) {
          console.log(incomingMessage.headers);
          console.log(incomingMessage.text);
          done(err);
        } else {
          done();
        }
        blockDone();
      });
  });

});
