const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const http = require('http');
const token = process.env.DISCORD_BOT_TOKEN;
const prefix = 'eew.';


/* HTTPSレスポンス */


http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('BOTは正常に稼働しています。\n');
}).listen(8080);


/* 準備完了 */


client.on('ready', () => {
    console.log('Botの起動が完了しました。');
    loadAlermChannels();
});


/* メッセージ受信 */


client.on('message', message => {
    try {
        if(message.author.bot)
            return;

        if(message.content.startsWith(prefix) && message.content.length > 1)
            command(message);
    } catch(e) {
        console.log(e);
    }
});


/* コマンド */


function command(message) {
    switch(message.content.split(' ')[0].slice(prefix.length)) {
        case 'help':
        command_help(message);
        break;

        case 'set':
        command_set(message);
        break;

        case 'unset':
        command_unset(message);
        break;
    }
}


function command_help(message) {
    try {
        message.channel.send({
            embed: {
                description: '**Alarmo BOT β - ヘルプ**',
                fields: [
                    {
                        name: prefix + 'help',
                        value: 'ヘルプを表示する'
                    },
                    {
                        name: prefix + 'set',
                        value: 'アラームチャンネルを設定する'
                    },
                    {
                        name: prefix + 'unset',
                        value: 'アラームチャンネルの設定を外す'
                    }
                ]
            }
        });
    } catch(e) {
        console.log(e);
    }
}


function command_set(message) {
    try {
        let ids = message.channel.guild.id + ':' + message.channel.id;
        let index = alermChannels.indexOf(ids);

        if(index == -1) {
            alermChannels.push(ids);
            message.channel.send({
                embed: {
                    description: 'アラームチャンネルを設定しました。'
                }
            });
        } else {
            message.channel.send({
                embed: {
                    description: '既にアラームチャンネルに設定されています。'
                }
            });
        }
    } catch(e) {
        console.log(e);
    }
}


function command_unset(message) {
    try {
        let ids = message.channel.guild.id + ':' + message.channel.id;
        let index = alermChannels.indexOf(ids);

        if(index != -1) {
            alermChannels.splice(index, 1);
            message.channel.send({
                embed: {
                    description: 'アラームチャンネルを解除しました。'
                }
            });
        } else {
            message.channel.send({
                embed: {
                    description: 'アラームチャンネルに設定されていません。'
                }
            });
        }
    } catch(e) {
        console.log(e);
    }
}


/* アラームチャンネル */


var alermChannels = [];


function loadAlermChannels() {
    
}


/* 終了処理 */


process.on('exit', () => {
    console.log('プログラムを終了しました。');
});


process.on('SIGINT', () => {
    process.exit(0);
});


/* ログイン処理 */


client.login(token)
    .then(() => {
        console.log('ログインが完了しました。');
    })
    .catch((e) => {
        console.log('ログインできませんでした。');
    });
