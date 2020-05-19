const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const http = require('http');
const token = process.env.DISCORD_BOT_TOKEN;
const prefix = '!';


/* HTTPSレスポンス */


http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('BOTは正常に稼働しています。\n');
}).listen(8080);


/* 準備完了 */


client.on('ready', () => {
    console.log('Botの起動が完了しました。');
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
    switch(message.content.split(' ')[0].slice(1)) {
        case 'help':
        command_help(message);
        break;
    }
}


function command_help(message) {
    try {
        message.channel.send(message.content);
    } catch(e) {
        console.log(e);
    }
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
