"use strict";

const assert = require('assert');
const Joi = require('joi');
const MessageModel = require('../../lib/messageModel/MessageModel')(Joi);
const messageModelUtil = require('../../lib/messageModel/messageModelUtil');

describe('TextMessageConversionToText', function() {

  it('Simple Text', function() {
    var textMsg = MessageModel.textConversationMessage("Hello can I help you?");
    var convertedTextMsg = messageModelUtil.convertRespToText(textMsg);
    assert.equal(convertedTextMsg.trim(),'Hello can I help you?');
  });

  it('Text with Actions', function() {
    var actionLabels = ['Menu', 'Start over', 'Agent'];
    var actions = actionLabels.map(function(label, index){
      return MessageModel.postbackActionObject(label, null, {index: index, label: label});
    });
    var textMsg = MessageModel.textConversationMessage("Hello can I help you?", actions);
    var convertedTextMsg = messageModelUtil.convertRespToText(textMsg);
    console.log(convertedTextMsg);
    assert.equal(convertedTextMsg.trim(),'Hello can I help you? You can choose from the following options: Menu, Start over, Agent.');
  });

  it('Text with Global Actions', function() {
    var actionLabels = ['Menu', 'Start over', 'Agent'];
    var actions = actionLabels.map(function(label, index){
      return MessageModel.postbackActionObject(label, null, {index: index, label: label});
    });
    var textMsg = MessageModel.textConversationMessage("Hello can I help you?");
    textMsg = MessageModel.addGlobalActions(textMsg, actions);
    var convertedTextMsg = messageModelUtil.convertRespToText(textMsg);
    console.log(convertedTextMsg);
    assert.equal(convertedTextMsg.trim(),'Hello can I help you? The following global actions are available: Menu, Start over, Agent.');
  });

});
