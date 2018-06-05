const main = require('../server/controllers/main');
const sheet = require('../server/controllers/spreadsheets');

const mongoose = require('mongoose');
const Token = mongoose.model('Token');
mongoose.Promise = Promise;
const {botPromisify, fieldsToJson, jsonToValues, textToJson, fieldsToText} = require('../lib/utils');

async function ask(bot, message, controller) {
    try {
        let user = await controller.storage.users.get(message.user);
        const token = await Token.findOne({id: message.user});
        console.log(user, token);
        if (!user || !token) {
            return onStart(bot, message, controller);
        }
        user = user.id;
        bot.startPrivateConversation({user}, async (err, conv) => {
            if (err) {
                throw err;
            }
            const values = await main.workflow(user);
            const fields = jsonToValues(values);
            conv.ask({
                attachments: [{
                    title: 'Check your settings now:',
                    callback_id: `${user}-suggest`,
                    attachment_type: 'default',
                    fields: fields,
                    actions: [{
                        "name": "ok",
                        "text": ":white_check_mark: OK",
                        "value": "flag",
                        "type": "button",
                        "confirm": {
                            "title": "Are you sure?",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    }, {
                        "text": "Change",
                        "name": "change",
                        "value": "change",
                        "style": "danger",
                        "type": "button",
                    }
                    ],
                }]
            },);
        });
    } catch (e) {
        console.error(e);
    }
}

async function onStart(bot, message, controller) {
    try {
        let user = await botPromisify(controller.storage.users.get, message.user);
        if (!user) {
            const resp = await botPromisify(bot.api.users.info, {user: message.user});
            user = resp.user;
            await controller.storage.users.save(user);
        }

        const {id} = user;
        const token = await Token.findOne({id});
        let answer = {
            text: 'Hello! Please use this link to connect your Jira and Google accounts',
            attachments: [{
                'name': 'authorize',
                'title': 'Authorize',
                'title_link': `${process.env.APP_URL}/auth?id=${id}`,
                'type': 'button',
            }],
        };
        if (token) {
            answer = {
                text: 'You are already subscribed.',
            }
        }
        bot.reply(message, answer);
    } catch (e) {
        console.error(e);
    }
}

async function handleAnswer(bot, message) {
    try {
        let values = textToJson(message.text);
        const fields = jsonToValues(values);
        let reply = {
            attachments: [{
                title: 'Is this ok?',
                callback_id: `${message.user}-suggest`,
                attachment_type: 'default',
                fields: fields,
                actions: [ {
                    "name": "ok",
                    "text": ":white_check_mark: OK",
                    "value": "flag",
                    "type": "button",
                }, {
                    "text": "Change",
                    "name": "change",
                    "value": "change",
                    "style": "danger",
                    "type": "button",
                }
                ],
            }]};
        bot.reply(message, reply);
    } catch (e) {
        bot.reply(message, {
            text: 'Error occured, try again or contact <@Nik>',
        });
        console.error(e);
    }
}

async function onDirectMessage(bot, message, controller) {
    try {
        let [user, token] = await Promise.all([
            botPromisify(controller.storage.users.get, message.user),
            Token.findOne({id: message.user}),
        ]);
        console.log(user, token);
        if (!user || !token) {
            return bot.reply(message, 'Type `start` to complete authorization');
        }
        console.log(`it's me, Jeremy`);
        return bot.reply(message, 'Type `calculate` to track your work, if you wish. It`s all how I can help you for now :C');
    } catch (e) {
        console.error(e);
    }
}

async function interactiveMessageCb(bot, message) {
    const ids = message.callback_id.split(/\-/);
    const user_id = ids[0];
    const action = ids[1];
    try {
        const payload = JSON.parse(message.payload);

        let values = fieldsToJson(message.original_message.attachments[0].fields);
        let reply;
        if (action == 'suggest' && payload.actions[0].name !== 'change') {

            reply = {
                text: 'Submitting to spreadsheet...',
            };
            bot.replyInteractive(message, reply);
            await sheet.updateRowSpreadsheet(values, user_id);
            bot.replyInteractive(message, {
                text: `<@${user_id}>, saved`,
            });
        } else {
            bot.replyInteractive(message, 'Enter your data in the following format: \n' + fieldsToText(values));
        }
    } catch (e) {
        bot.replyInteractive(message, {
            text: `<@${user_id}>, failed. Please, fill manually and contact admin`,
            attachments: [{
                'name': 'sheet',
                'title': 'Go to spreadsheet',
                'title_link': `https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}/edit`,
                'type': 'button',
            }],
        });
        console.error(e);
    }
}



module.exports = {
    ask,
    handleAnswer,
    onDirectMessage,
    interactiveMessageCb,
    onStart,
};
