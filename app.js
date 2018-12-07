// https://cdn.app.compendium.com/uploads/user/e7c690e8-6ff9-102a-ac6d-e4aebca50425/e6ee15e8-2e68-4a1a-adad-eac941a469d4/File/e27ca2881658e082d08652472cfc24ce/adding_alexa_as_a_channel_in_your_chatbot_v3.pdf

const alexa = require("alexa-app");
const _ = require("underscore");
const express = require('express');
const bodyParser = require('body-parser');
const PubSub = require('pubsub-js');
const Joi = require('joi');
const MessageModel = require('./bots-js-utils/lib/messageModel/MessageModel.js')(Joi);
const messageModelUtil = require('./bots-js-utils/lib/messageModel/messageModelUtil.js');
const botUtil = require('./bots-js-utils/lib/util/botUtil.js');
const webhookUtil = require('./bots-js-utils/lib/webhook/webhookUtil.js');

PubSub.immediateExceptions = true;

module.exports = function () {
  var self = this;

  //replace these settings to point to your webhook channel
  var metadata = {
    allowConfigUpdate: true, //set to false to turn off REST endpoint of allowing update of metadata
    waitForMoreResponsesMs: 200,  //milliseconds to wait for additional webhook responses
              // amzn1.ask.skill.df22d270-6bc3-4a37-8e53-b8d7a1f1717f
    amzn_appId: "amzn1.ask.skill.16dc364c-7062-4783-b951-708d5c0f181f",
    channelSecretKey: 'iYy1r1bdy5NaNgXUrt0TVvtU9JZ7LiLl',
    channelUrl: 'https://b2b34218.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/70DD6A24-8916-4162-9518-AD7C786AC922'        
    // channelUrl: 'https://b2b34218.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/E78A0816-F388-4C3E-AF93-1D1C543E931A'    
    // channelUrl: 'https://e87476aa.ngrok.io/connectors/v1/tenants/chatbot-tenant/listeners/webhook/channels/AE1803AB-3A46-4A40-A34A-13B4989C5DD5'
  };

  this.randomIntInc = function (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
  };

  this.setConfig = function (config) {
    metadata = _.extend(metadata, _.pick(config, _.keys(metadata)));
  }

  // expose this function to be stubbed
  this.sendWebhookMessageToBot = function (channelUrl, channelSecretKey, userId, messagePayload, additionalProperties, callback) {
    webhookUtil.messageToBotWithProperties(channelUrl, channelSecretKey, userId, messagePayload, additionalProperties, callback);
  };

  this.init = function (config) {

    var app = express();
    var alexaRouter = express.Router();
    alexaRouter.use(bodyParser.json());
    app.use('/alexa', alexaRouter);
    var logger = (config ? config.logger : null);
    if (!logger) {
      logger = console;
    }

    if (metadata.channelUrl && metadata.channelSecretKey) {
      logger.info('Alexa singleBot - Using Channel:', metadata.channelUrl);
    }

    // compile the list of actions, global actions and other menu options
    function menuResponseMap(resp, card) {
      var responseMap = {};

      function addToMap(label, type, action) {
        responseMap[label] = { type: type, action: action };
      }

      if (!card) {
        if (resp.globalActions && resp.globalActions.length > 0) {
          resp.globalActions.forEach(function (gAction) {
            addToMap(gAction.label, 'global', gAction);
          });
        }
        if (resp.actions && resp.actions.length > 0) {
          resp.actions.forEach(function (action) {
            addToMap(action.label, 'message', action);
          });
        }
        if (resp.type === 'card' && resp.cards && resp.cards.length > 0) {
          resp.cards.forEach(function (card) {
            //special menu option to navigate to card detail
            addToMap('Card ' + card.title, 'card', { type: 'custom', value: { type: 'card', value: card } });
          });
        }
      } else {
        if (card.actions && card.actions.length > 0) {
          card.actions.forEach(function (action) {
            addToMap(action.label, 'message', action);
          });
        }
        //special menu option to return to main message from the card
        addToMap('Return', 'cardReturn', { type: 'custom', value: { type: 'messagePayload', value: resp } });
      }
      return responseMap;
    }

    if (metadata.allowConfigUpdate) {
      app.put('/config', bodyParser.json(), function (req, res) {
        let config = req.body;
        logger.info(config);
        if (config) {
          self.setConfig(config);
        }
        res.sendStatus(200).send();
      });
    }

    app.post('/singleBotWebhook/messages', bodyParser.json({
      verify: webhookUtil.bodyParserRawMessageVerify
    }), function (req, res) {
      const userID = req.body.userId;
      if (!userID) {
        return res.status(400).send('Missing User ID');
      }
      if (webhookUtil.verifyMessageFromBot(req.get('X-Hub-Signature'), req.rawBody, req.encoding, metadata.channelSecretKey)) {
        res.sendStatus(200);
        logger.info("Publishing to", userID);
        PubSub.publish(userID, req.body);
      } else {
        res.sendStatus(403);
      }
    });

    var alexa_app = new alexa.app("app");

    alexa_app.intent("CommandBot", {},
      function (alexa_req, alexa_res) {

        var command = alexa_req.slot("command");
        var session = alexa_req.getSession();
        var userId = session.get("userId");
        if (!userId) {
          //userId = session.details.userId;
          userId = session.details.user.userId;
          if (!userId) {
            userId = self.randomIntInc(1000000, 9999999).toString();
          }
          session.set("userId", userId);
        }
        alexa_res.shouldEndSession(false);
        if (metadata.channelUrl && metadata.channelSecretKey && userId && command) {
          const userIdTopic = userId;
          var respondedToAlexa = false;
          var additionalProperties = {
            "profile": {
              "clientType": "alexa"
            }
          };
          var sendToAlexa = function (resolve, reject) {
            if (!respondedToAlexa) {
              respondedToAlexa = true;
              logger.info('Prepare to send to Alexa');
              //alexa_res.send();
              resolve();
              PubSub.unsubscribe(userIdTopic);
            } else {
              logger.info("Already sent response");
            }
          };
          // compose text response to alexa, and also save botMessages and botMenuResponseMap to alexa session so they can be used to control menu responses next
          var navigableResponseToAlexa = function (resp) {
            var respModel;
            if (resp.messagePayload) {
              respModel = new MessageModel(resp.messagePayload);
            } else {
              // handle 1.0 webhook format as well
              respModel = new MessageModel(resp);
            }
            var botMessages = session.get("botMessages");
            if (!Array.isArray(botMessages)) {
              botMessages = [];
            }
            var botMenuResponseMap = session.get("botMenuResponseMap");
            if (typeof botMenuResponseMap !== 'object') {
              botMenuResponseMap = {};
            }
            botMessages.push(respModel.messagePayload());
            session.set("botMessages", botMessages);
            session.set("botMenuResponseMap", Object.assign(botMenuResponseMap || {}, menuResponseMap(respModel.messagePayload())));
            let messageToAlexa = messageModelUtil.convertRespToText(respModel.messagePayload());
            logger.info("Message to Alexa (navigable):", messageToAlexa)
            alexa_res.say(messageToAlexa);
          };

          var sendMessageToBot = function (messagePayload) {
            logger.info('Creating new promise for', messagePayload);
            return new Promise(function (resolve, reject) {
              var commandResponse = function (msg, data) {
                logger.info('Received callback message from webhook channel');
                var resp = data;
                logger.info('Parsed Message Body:', resp);
                if (!respondedToAlexa) {
                  navigableResponseToAlexa(resp);
                } else {
                  logger.info("Already processed response");
                  return;
                }
                if (metadata.waitForMoreResponsesMs) {
                  _.delay(function () {
                    sendToAlexa(resolve, reject);
                  }, metadata.waitForMoreResponsesMs);
                } else {
                  sendToAlexa(resolve, reject);
                }
              };
              var token = PubSub.subscribe(userIdTopic, commandResponse);
              self.sendWebhookMessageToBot(metadata.channelUrl, metadata.channelSecretKey, userId, messagePayload, additionalProperties, function (err) {
                if (err) {
                  logger.info("Failed sending message to Bot");
                  alexa_res.say("Failed sending message to Bot.  Please review your bot configuration.");
                  reject();
                  PubSub.unsubscribe(userIdTopic);
                }
              });
            });
          };
          var handleInput = function (input) {
            var botMenuResponseMap = session.get("botMenuResponseMap");
            if (typeof botMenuResponseMap !== 'object') {
              botMenuResponseMap = {};
            }
            var menuResponse = botUtil.approxTextMatch(input, _.keys(botMenuResponseMap), true, true, 7);
            var botMessages = session.get("botMessages");
            //if command is a menu action
            if (menuResponse) {
              var menu = botMenuResponseMap[menuResponse.item];
              // if it is global action or message level action
              if (['global', 'message'].includes(menu.type)) {
                var action = menu.action;
                session.set("botMessages", []);
                session.set("botMenuResponseMap", {});
                if (action.type === 'postback') {
                  var postbackMsg = MessageModel.postbackConversationMessage(action.postback);
                  return sendMessageToBot(postbackMsg);
                } else if (action.type === 'location') {
                  logger.info('Sending a predefined location to bot');
                  return sendMessageToBot(MessageModel.locationConversationMessage(37.2900055, -121.906558));
                }
                // if it is navigating to card detail
              } else if (menu.type === 'card') {
                var selectedCard;
                if (menu.action && menu.action.type && menu.action.type === 'custom' && menu.action.value && menu.action.value.type === 'card') {
                  selectedCard = _.clone(menu.action.value.value);
                }
                if (selectedCard) {
                  if (!Array.isArray(botMessages)) {
                    botMessages = [];
                  }
                  var selectedMessage;
                  if (botMessages.length === 1) {
                    selectedMessage = botMessages[0];
                  } else {
                    selectedMessage = _.find(botMessages, function (botMessage) {
                      if (botMessage.type === 'card') {
                        return _.some(botMessage.cards, function (card) {
                          return (card.title === selectedCard.title);
                        });
                      } else {
                        return false;
                      }
                    });
                  }
                  if (selectedMessage) {
                    //session.set("botMessages", [selectedMessage]);
                    session.set("botMenuResponseMap", menuResponseMap(selectedMessage, selectedCard));
                    let messageToAlexa = messageModelUtil.cardToText(selectedCard, 'Card');
                    logger.info("Message to Alexa (card):", messageToAlexa)
                    alexa_res.say(messageToAlexa);
                    return alexa_res.send();
                  }
                }
                // if it is navigating back from card detail
              } else if (menu.type === 'cardReturn') {
                var returnMessage;
                if (menu.action && menu.action.type && menu.action.type === 'custom' && menu.action.value && menu.action.value.type === 'messagePayload') {
                  returnMessage = _.clone(menu.action.value.value);
                }
                if (returnMessage) {
                  //session.set("botMessages", [returnMessage]);
                  session.set("botMenuResponseMap", _.reduce(botMessages, function (memo, msg) {
                    return Object.assign(memo, menuResponseMap(msg));
                  }, {}));
                  //session.set("botMenuResponseMap", menuResponseMap(returnMessage));
                  _.each(botMessages, function (msg) {
                    let messageToAlexa = messageModelUtil.convertRespToText(msg);
                    logger.info("Message to Alexa (return from card):", messageToAlexa);
                    alexa_res.say(messageToAlexa);
                  })
                  return alexa_res.send();
                }
              }
            } else {
              var commandMsg = MessageModel.textConversationMessage(command);
              return sendMessageToBot(commandMsg);
            }
          };
          return handleInput(command);
        } else {
          _.defer(function () {
            alexa_res.say("I don't understand. Could you please repeat what you want?");
            //alexa_res.send();
          });
        }
        //return false;
      }
    );

    alexa_app.intent("AMAZON.StopIntent", {},
      function (alexa_req, alexa_res) {
        alexa_res.shouldEndSession(true);
      }
    );

    alexa_app.launch(function (alexa_req, alexa_res) {
      var session = alexa_req.getSession();
      session.set("startTime", Date.now());
      alexa_res.say("Welcome to SingleBot. ");
    });

    alexa_app.pre = function (alexa_req, alexa_res, alexa_type) {
      logger.debug(alexa_req.data.session.application.applicationId);
      // change the application id
      if (alexa_req.data.session.application.applicationId != metadata.amzn_appId) {
        logger.error("fail as application id is not valid");
        alexa_res.fail("Invalid applicationId");
      }
      logger.info(JSON.stringify(alexa_req.data, null, 4));
      if (!metadata.channelUrl || !metadata.channelSecretKey) {
        var message = "The singleBot cannot respond.  Please check the channel and secret key configuration.";
        alexa_res.fail(message);
        logger.info(message);
      }
    };
    //alexa_app.express(alexaRouter, "/", true);
    alexa_app.express({ router: alexaRouter, checkCert: false });

    app.locals.endpoints = [];
    app.locals.endpoints.push({
      name: 'webhook',
      method: 'POST',
      endpoint: '/singleBotWebhook/messages'
    });
    app.locals.endpoints.push({
      name: 'alexa',
      method: 'POST',
      endpoint: '/alexa/app'
    });

    return app;
  };

  return this;

}();


