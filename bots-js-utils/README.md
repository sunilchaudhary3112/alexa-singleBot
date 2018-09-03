# Bots JS Utilities #

JS utilities for integrating with Intelligent Bots Cloud Service.

## Overview

JS Utilities include the following:

1. messageModel/MessageModel.js - to create IBCS message of Conversation Message Model.  This is also used in IBCS Custom Component SDK
1. messageModel/messageModelUtil.js - to transform IBCS message into text format suitable for text or speech based channels like Alexa.
1. util/botUtil.js - to do approximate string matching when dealing with speech that may not be perfectly translated to text
1. webhook/webhookUtil.js - to sign and send message to webhook channel and to verify messages from webhook channel

## JS Doc

[JS documentation for the Bots JS Utilities](/ext/source/apps/bots-js-utils/jsdoc/)

## Example Usage
Example usage of the JS utilities can be found in Alexa singlebot sample.

### messageModel/MessageModel.js

        const Joi = require('joi');
        const MessageModel = require('../bots-js-utils/lib/messageModel/MessageModel.js')(Joi);

        sendToAlexa(MessageModel.locationBotMessage(37.2900055, -121.906558));

### messageModel/messageModelUtil.js

        const messageModelUtil = require('../bots-js-utils/lib/messageModel/messageModelUtil.js');

        alexa_res.say(messageModelUtil.convertRespToText(respModel.messagePayload()));


### util/botUtil.js

        const botUtil = require('../bots-js-utils/lib/util/botUtil.js');

        var menuResponse = botUtil.approxTextMatch(input, _.keys(botMenuResponseMap), true, true, 7);


### webhook/webhookUtil.js

        const webhookUtil = require('../bots-js-utils/lib/webhook/webhookUtil.js');
        var additionalProperties = {
          "profile": {
            "clientType": "alexa"
          }
        };

        webhookUtil.messageToBotWithProperties(metadata.channelUrl, metadata.channelSecretKey, userId, messagePayload, additionalProperties, function(err) {
            if (err) {
                logger.info("Failed sending message to Bot");
                alexa_res.say("Failed sending message to Bot.  Please review your bot configuration.");
                alexa_res.send();
                PubSub.unsubscribe(userIdTopic);
            }
        });
