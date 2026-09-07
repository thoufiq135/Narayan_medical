const {TelegramBot}=require("node-telegram-bot-api")
const bot = new TelegramBot("8620681112:AAHMCN37sm3kTQsM2Z2j6O12gYoKcqF2hNk",{
    polling:false
})
module.exports=bot