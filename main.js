const Discord = require('discord.js');
const fs = require('fs');
const http = require('http');
const request = require('request');
const client = new Discord.Client();
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
    loadAlarmChannels();
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

        case 'on':
        command_on(message);
        break;

        case 'off':
        command_off(message);
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


function command_on(message) {
    try {
        let ids = message.channel.guild.id + ':' + message.channel.id;
        let index = alarmChannels.indexOf(ids);

        if(index == -1) {
            alarmChannels.push(ids);
            recordAlarmChannels();
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


function command_off(message) {
    try {
        let ids = message.channel.guild.id + ':' + message.channel.id;
        let index = alarmChannels.indexOf(ids);

        if(index != -1) {
            alarmChannels.splice(index, 1);
            recordAlarmChannels();
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


var alarmChannels = [];


function loadAlarmChannels() {
    let data = fs.readFileSync('alarm_channels.txt', 'utf8');
    alarmChannels = data != '' ? data.split(',') : []
    console.log('アラームチャンネルを取得しました。');
}


function recordAlarmChannels() {
    fs.writeFileSync('alarm_channels.txt', alarmChannels.join(','), 'utf8');
    console.log('アラームチャンネルを記録しました。');
}


/* EEW受信 */


var latestEventTimestamp = null;


class EEWData {
    constructor() {
        // 速報の種類 | -1: 不明, 0: 予報, 1: 警報, 2: キャンセル報
        this.type = -1;

        // ソース名
        this.source = '';

        // 発生時刻 (Unixタイムスタンプ)
        this.timestamp = 0;

        // 発表時刻 (Unixタイムスタンプ)
        this.announceTimestamp = 0;

        // 震源地
        this.hypocenter = '';

        // 最大震度
        this.maxIntensity = '';

        // マグニチュード
        this.magnitude = 0;

        // 深さ
        this.depth = 0;

        // 緯度
        this.latitude = 0;

        // 経度
        this.longitude = 0;

        // 最終報かどうか
        this.isFinal = false;

        // 警報の対象地域 (都道府県)
        this.warnPrefectures = [];

        // 警報の対象地域 (気象庁の震央地名)
        this.warnJMAAreas = [];
    }
}


function analyzeEEWData(json) {
    try {
        let eewData = new EEWData();

        // 速報の種類
        eewData.type = 'Hypocenter' in json ? (!json['Warn'] ? 0 : 1) : 2;

        // ソース名
        eewData.source = json['Source']['String'];

        // 発生時刻 (Unixタイムスタンプ)
        eewData.timestamp = json['OriginTime']['UnixTime'];

        // 発表時刻 (Unixタイムスタンプ)
        eewData.announceTimestamp = json['AnnouncedTime']['UnixTime'];

        // 最終報かどうか
        eewData.isFinal = json['Type']['Detail'].substring(0, 2) == '最終';

        // 予報または警報
        if(eewData.type == 0 || eewData.type == 1) {
            // 震源地
            eewData.hypocenter = json['Hypocenter']['Name'];

            // 最大震度
            eewData.maxIntensity = json['MaxIntensity']['To'];

            // マグニチュード
            eewData.magnitude = json['Hypocenter']['Magnitude']['Float'];

            // 深さ
            eewData.depth = json['Hypocenter']['Location']['Depth']['Int'];

            // 緯度
            eewData.latitude = json['Hypocenter']['Location']['Lat'];

            // 経度
            eewData.longitude = json['Hypocenter']['Location']['Long'];
        }

        // キャンセル報
        if(eewData.type == 1) {
            // 警報の対象地域 (都道府県)
            eewData.warnPrefectures = json['WarnForecast']['LocalAreas'];

            // 警報の対象地域 (気象庁の震央地名)
            eewData.warnJMAAreas = json['WarnForecast']['Regions'];
        }

        return eewData;
    } catch(e) {
        console.log(e);
    }
}


function sendEEWMessage(eewData) {
    let embed;

    let date = new Date();
    date.setTime(eewData.timestamp * 1000);
    date.setHours(date.getHours() - 9);

    let announceDate = new Date();
    announceDate.setTime(eewData.announceTimestamp * 1000);
    announceDate.setHours(announceDate.getHours() - 9);

    let color = getColorByIntensity(eewData.maxIntensity);

    let maxIntensity = eewData.maxIntensity.replace('-', '弱').replace('+', '強');

    if(eewData.type == 0) {
        // 緊急地震速報 (予報)

        let descriptionTitle = '[' + date.getHours() + ':' + date.getMinutes() + '] ' + eewData.hypocenter + 'で最大震度' + maxIntensity + 'の地震';

        embed = {
            description: descriptionTitle,
            color: color,
            fields: [
                {
                    name: '震源地',
                    value: eewData.hypocenter,
                    inline: true
                },
                {
                    name: '最大震度',
                    value: maxIntensity,
                    inline: true
                },
                {
                    name: 'マグニチュード',
                    value: 'M' + eewData.magnitude,
                    inline: true
                },
                {
                    name: '発生時刻',
                    value: date.toLocaleDateString(),
                    inline: true
                },
                {
                    name: '緯度/経度',
                    value: eewData.latitude + '/' + eewData.longitude,
                    inline: true
                }
            ],
            timestamp: announceDate,
            footer: {
                text: eewData.source
            },
            title: '緊急地震速報 (予報)'
        };
    }

    if(eewData.type == 1) {
        // 緊急地震速報 (警報)

        let descriptionTitle = '**以下の地域では強い揺れに警戒してください。**';
        let descriptionIntensity = '__**' + eewData.warnPrefectures.join(' ') + '**__';

        embed = {
            description: descriptionTitle + '\n\n' + descriptionIntensity,
            color: color,
            fields: [
                {
                    name: '震源地',
                    value: eewData.hypocenter,
                    inline: true
                },
                {
                    name: '最大震度',
                    value: maxIntensity,
                    inline: true
                },
                {
                    name: 'マグニチュード',
                    value: 'M' + eewData.magnitude,
                    inline: true
                },
                {
                    name: '発生時刻',
                    value: date.toLocaleDateString(),
                    inline: true
                },
                {
                    name: '緯度/経度',
                    value: eewData.latitude + '/' + eewData.longitude,
                    inline: true
                }
            ],
            timestamp: announceDate,
            footer: {
                text: eewData.source
            },
            title: '緊急地震速報 (警報)'
        };
    }

    alarmChannels.forEach(val => {
        let ids = val.split(':');
        client.guilds.resolve(ids[0]).channels.resolve(ids[1]).send({ embed: embed });
    });
}


function getColorByIntensity(intensity) {
    switch(intensity) {
        case '1':
        return 0xffffff;

        case '2':
        return 0xafdfe4;

        case '3':
        return 0x0067c0;

        case '4':
        return 0xfffdd0;

        case '5-':
        return 0xffd400;

        case '5+':
        return 0xffb74c;

        case '6-':
        return 0xed1a3d;

        case '6+':
        return 0xa41919;

        case '7':
        return 0xf58f98;

        default:
        return 0x000000;
    }
}


setInterval(() => {
    // https://api.iedred7584.com/eew/Samples/Warn.json
    // https://api.iedred7584.com/eew/json
    request('https://api.iedred7584.com/eew/Samples/Warn.json', (err, res, body) => {
        if(err) {
            console.log('APIの接続に失敗しました。');
            return;
        }

        let json = JSON.parse(body);

        if(latestEventTimestamp != json['AnnouncedTime']['UnixTime']) {
            //if(latestEventTimestamp !== null) {
                // EEWデータを解析して送信
                let eewData = analyzeEEWData(json);
                sendEEWMessage(eewData);
            //}

            latestEventTimestamp = json['AnnouncedTime']['UnixTime'];
        }
    });
}, 5000);


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
