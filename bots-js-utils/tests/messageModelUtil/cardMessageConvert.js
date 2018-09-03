"use strict";

const assert = require('assert');
const Joi = require('joi');
const MessageModel = require('../../lib/messageModel/MessageModel')(Joi);
const messageModelUtil = require('../../lib/messageModel/messageModelUtil');

describe('CardMessageConversionToText', function() {

  it('Simple Text', function() {
    var cardContents = [{title: 'HAWAIIAN CHICKEN', description: 'grilled chicken, ham, pineapple and green bell peppers'},
                        {title: 'PEPPERONI', description: 'Classic marinara sauce with authentic old-world style pepperoni.'},
                        {title: 'BACON SPINACH ALFREDO', description: 'Garlic Parmesan sauce topped with bacon, mushrooms and roasted spinach with a salted pretzel crust.'}];
    var cards = cardContents.map(function(content, index){
      return MessageModel.cardObject(content.title, content.description);
    });
    var cardMsg = MessageModel.cardConversationMessage('horizontal',cards);
    var convertedCardMsg = messageModelUtil.convertRespToText(cardMsg);
    console.log(convertedCardMsg);
    assert.equal(convertedCardMsg.trim(),'You can choose from the following cards for more information: Card HAWAIIAN CHICKEN, Card PEPPERONI, Card BACON SPINACH ALFREDO.');
  });


});
