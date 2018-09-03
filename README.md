# Sample Alexa Skill (singleBot)

Creating an Alexa skill called *singleBot* along with a Webhook channel lets you chat with a specific bot.

## Requirements

Set up a developer account in the Amazon Developer Portal. Choose **Alexa Skills Kit**.

## Configuring the singleBot Skill

### Create a Webhook Channel

In the Bot Builder, create a webhook channel for your bot:

1. In the Create Channel dialog, enter the outgoing Webhook URL as `https://bots-samples-nodejs:8889/ext/apps/alexa-singleBot/singleBotWebhook/messages`. This URL is where your bot will send its responses back to the Alexa singleBot skill.
1. Keep the Secret Key and Webhook URL close by because you need to add them to the `app.js` file. Also, remember to set the amazon skill id (to be created in the next step).  For example:



        var metadata = {
        waitForMoreResponsesMs: 200,
        amzn_appId: "amzn1.ask.skill.b6a603ad-5f3f-471e-b509-922ddc2aded9",
        channelSecretKey: 'RpBrYK14O48vQXxDMOpYw32j7q8O8B8J',
        channelUrl: 'http://bots-connectors:8000/connectors/v1/tenants/5c82a414-e2d0-45fd-b6a2-8ca3b9c09161/listeners/webhook/channels/E8D22577-3F91-487F-9018-1D6E884DED1A'
        };


1. Restart the `bots-samples-nodejs` container.

### Add the Skill Information

1. Open the [Amazon Developer Console](https://developer.amazon.com/edw/home.html#/).
1. Choose **Alexa Skills Kit**.
1. Select **Custom Interaction Model** as the Skill Type:
1. Enter singleBot for the name.
1. Enter singlebot (or any name that you want to use to invoke this skill) as the Invocation Name.
1. Select **No** for the Audio Player option.
### Define the Interaction Model
Next, add the CommandBot intent, which sends a voice text to the configured bot, by clicking [here](/ext/source/apps/alexa-singleBot/config/intent.json) and then copying and pasting the intent schema into the Developer Console

Help Alexa understand the CommandBot intent by adding utterances. Click [here](/source/apps/alexa-singleBot/config/utterances.txt) and then copy and paste the utterances into the Developer Console.
### Configure the Endpoint
1. Choose **HTTPS**
1. Choose **North America**.
1. Enter the HTTPS ngrok URL for port 8888 that's appended with `ext/apps/alexa-singleBot/alexa/app`. For example: `https://<ngrok URL for port 8888>/ext/apps/alexa-singleBot/alexa/app`
1. Choose **No** for Account Linking
### Select the SSL Certificate
Choose **My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority**.

## Testing the singleBot Skill in the Amazon Developer Console
To test the skill, enter the following utterances in the as an utterance in the Service Simulator and then click **Ask singleBot**.

 - show my balances
 - credit card


For each  utterance, the Service Simulator window displays the response in JSON.  To hear Alexa speak the response, enter the response as text or SSML and then click **Listen**. The SSML is as follows:


    "show my balances"
    ==> "ssml": "<speak>For which account do you want your balance? The following are your choices: checking, savings, credit card,</speak>"

    "credit card"
    ==> "ssml": "<speak>The balance in your credit card account (4352-3423-1234-5239) is $-208.88 Your remaining credit is $4791.12</speak>"


## Testing singleBot on an Echo Device
If your Echo device is logged to the same user account that accesses the Developer Console, then  the singleBot skill will enabled in your Amazon Echo. Try out the same utterances, but start each one with  "Alexa ask singleBot..." If Alexa can't understand you, or your Echo's light ring is turned off,  start over by saying, "Alexa ask singleBot..." For example:

    "Alexa ask single Bot show my balances"
    ==> "ssml": "<speak>For which account do you want your balance? The following are your choices: checking, savings, credit card,</speak>"

    "credit card"
    ==> "ssml": "<speak>The balance in your credit card account (4352-3423-1234-5239) is $-208.88 Your remaining credit is $4791.12</speak>"

    "Alexa stop" or "stop" to end the interaction

If Alexa continually misunderstands you, take a look at the  `bots-samples-nodejs` log to see which of your commands were picked up by Alexa and sent to the bot and which weren't.  
**Note**: Alexa might have trouble with some interactions, like  following a web link or saying a number. Alexa spells out numbers  (22 becomes twenty-two), which might be problematic if your bot is expecting a cardinal number. Also, Alexa won't wait for a result when web services are slow. When this happens, Alex will state that your skill takes too long to respond.
