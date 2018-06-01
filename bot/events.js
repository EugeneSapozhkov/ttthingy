'use strict';

const mongoose = require('mongoose');
const Token = mongoose.model('Token');
mongoose.Promise = Promise;

const {botPromisify} = require('../lib/utils');
const messages = require('../lib');
const cronjobs = require('../lib/cronjobs');
const sheet = require('../server/controllers/spreadsheets');
const main = require('../server/controllers/main');

function reconnect(bot) {
    console.log('** The RTM api just closed, reopening');
    // reconnect after closing
    bot.startRTM(function (err) {
        if (err) {
            console.log('Error connecting bot to Slack:', err);
        } else {
            console.log('RESTARTED');
        }
    });
}

async function listen(controller) {
    // U7BSKA3AN NIK
    // U9PGXKCE8 TANYA

    let isStarted = false;
    const bot = controller.spawn({
        token: process.env.TOKEN,
        retry: true
    });
    const team = await botPromisify(controller.storage.teams.get, 'T0831CCKU');
    if (!team) {
        await botPromisify(controller.storage.teams.save, {
            'id': 'T0831CCKU',
            'domain': 'dagbladetua',
            'token': process.env.TOKEN
        });
    }
    bot.startRTM((err) => {
        if (err) {
            console.log('Error connecting bot to Slack:', err);
        }
    });

    controller.on('rtm_open', async (bot) => {
        console.log('** The RTM api just opened');
        if (isStarted) {
            return;
        }
        try {
            await bot.api.im.open({user: 'U7BSKA3AN'}, (err, res) => {
                bot.send({
                    channel: res.channel.id,
                    user: {
                        id: 'U7BSKA3AN'
                    },
                    text: 'Запустился',
                }, (err) => err && console.log(err));
            });
            isStarted = true;
            const users = await new Promise((resolve, reject) => {
                controller.storage.users.all((err, res) => {
                    err ? reject(err) : resolve(res);
                });
            });
            for (let user of users) {
                cronjobs.createCustomCronJob('0 17 * * 1-5', function() {
                    messages.ask(bot, user.id);
                });
            }
            // carefully, Cinderella, after midnight your app will turn into the pumpkin
        } catch (e) {
            console.error(e);
        }
    });

    controller.on('rtm_close', () => reconnect(bot));

    controller.hears(['calculate', 'schedule', 'log'], 'direct_message', (bot, message) => messages.ask(bot, message.user));

    controller.hears(['Meeting', "MAT", "LL", "Other"], 'direct_message', messages.handleAnswer);

    controller.hears(['^start'], 'direct_message', (bot, message) => messages.onStart(bot, message, controller));

    controller.on(['direct_message', 'mention', 'direct_mention'], (bot, message) => messages.onDirectMessage(bot, message, controller));

    controller.on('interactive_message_callback', messages.interactiveMessageCb);
}

module.exports = {
    listen,
};