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
    try {
        // U7CCHAUJE NIK

        let isStarted = false;
        const bot = controller.spawn({
            token: process.env.TOKEN,
            retry: true
        });
        bot.startRTM(async (err) => {
            if (err) {
                console.log('Error connecting bot to Slack:', err);
            }
        });

        controller.on('rtm_open', async (bot) => {
            console.log('** The RTM api just opened');
            if (isStarted) {
                return;
            }
            cronjobs.status();
            try {
                const teams = await new Promise((resolve, reject) => {
                    controller.storage.teams.all((err, res) => {
                        err ? reject(err) : resolve(res);
                    });
                });
                if (!teams.length) {
                    const { team } = await new Promise((resolve, reject) => {
                        bot.api.team.info({}, (err, res) => {
                            err ? reject(err) : resolve(res);
                        });
                    });
                    await botPromisify(controller.storage.teams.save, Object.assign({}, team, {token: process.env.TOKEN}));
                }
                const users = await new Promise((resolve, reject) => {
                    controller.storage.users.all((err, res) => {
                        err ? reject(err) : resolve(res);
                    });
                });
                await sheet.tryCreateNewSpreadSheet(users);
                for (let user of users) {
                    cronjobs.createCustomCronJob('30 12 * * 1-5', function () {
                        messages.ask(bot, user.id, controller);
                    });
                }
                isStarted = true;
                console.log('Started');
                // carefully, Cinderella, after midnight your app will turn into the pumpkin
            } catch (e) {
                console.error(e);
            }
        });

        controller.on('rtm_close', () => reconnect(bot));

        controller.hears(['calculate', 'schedule', 'log'], 'direct_message', (bot, message) => messages.ask(bot, message, controller));

        controller.hears(['Meeting', "MAT", "LL", "Other"], 'direct_message', messages.handleAnswer);

        controller.hears(['^start'], 'direct_message', (bot, message) => messages.onStart(bot, message, controller));

        controller.on(['direct_message', 'mention', 'direct_mention'], (bot, message) => messages.onDirectMessage(bot, message, controller));

        controller.on('interactive_message_callback', messages.interactiveMessageCb);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

module.exports = {
    listen,
};