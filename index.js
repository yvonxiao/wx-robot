const {Wechaty,Contact} = require('wechaty');
const request = require('request');
const config = require('getconfig');
const log4js = require('log4js');
log4js.configure({
    appenders:config.appenders
});
const logger = log4js.getLogger('system');

const bot = Wechaty.instance({profile:'./profile/wx_local_0'});

var contactMap = new Map(),collectContactNum=3;
var chatIdArr=[];

var letRobotWork = 1;

bot.on('scan',(url,code)=>{
        logger.info(`Scan QR Code to login: ${code}\n${url}`)
        if (!/201|200/.test(String(code))) {
            notify('wx-robot%20scan','![logo]('+url+')');
        }
    }).on('login',user => {
        logger.info(`User ${user.name()} logined`);
    })
    .on('error',e=>{
        logger.error(e);
        bot.say('error:'+e.message);
        notify('wx-robot%20error',e.message);
    })
    .on('logout',user => logger.info(`${user.name()} logouted`))
    .on('message',m => {
        if(m.room()) return;
        if(m.self()){
            if(m.content()=='system-on'){
                letRobotWork = 1;
                logger.info('robot start to work');
                return;
            }
            if(m.content()=='system-off'){
                letRobotWork = 0;
                logger.info('robot stop working');
                return;
            }
            return;
        }
        if(!letRobotWork) return;
        try{
            if(!m.from()) return;
            let contact = m.from();
            let fromContactId = contact.id;
            if(!~chatIdArr.indexOf(fromContactId)){
                if("老肖"==contact.name()  ||  contact.personal()){
                    let msgContent = m.content();
                    if(msgContent!='聊天'){
                        m.say(`${contact.name()}你好，小肖不在，我是助理机器人，有事请留言，主人回来我会提醒他，谢谢，祝您开心\n想和本助理聊天请回复'聊天'`);
                    }else{
                        chatIdArr.push(fromContactId);
                        m.say('知无不言，言无不尽');
                    }
                }
            }else{
                request.post('http://www.tuling123.com/openapi/api',{
                    form:{
                        key:config.tuling_key,info:m.content(),loc:'上海市',userid:fromContactId
                    }
                },function(err,httpResponse,body){
                    let resultJson = JSON.parse(body);
                    if(resultJson && resultJson.code=='100000'){
                        m.say(resultJson.text);
                    }else{
                        m.say('本助理开小差了...');
                    }
                })

            }

        }catch(e){
            logger.error(e);
            notify('wx-robot%20error',e.message);
        }
    });
bot.init().catch(e=>{
    logger.error(e);
    bot.quit();
    process.exit(-1);
});

function notify(msg,desp){
    request.get(config.notifyer+'?text='+msg+'&desp='+desp);
}

async function collectContacts(){
    let contactList = await Contact.findAll();

    if(contactList.length==contactMap.size){
        collectContactNum--;
    }else{
        let contact;
        for(let i = 0;i<contactList.length;i++){
            contact = contactList[i];
            contactMap.set(contact.id,{name:contact.name(),personal:contact.personal()})
        }
    }

    if(collectContactNum>0){
        setTimeout(collectContacts,7000);
    }else{
        logger.info('finish collect contacts job');
    }
}
