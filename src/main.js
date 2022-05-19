import axios from 'axios';
import { config } from 'dotenv';

config();

let currentRetriedCount = 0;
let onlyFiberAvailableResult = false;

const notifyInterval = setInterval(checkAvailability, 150 * 1000);

const turknetClient = axios.create({
    baseURL: 'https://turk.net',
    headers: {
        token: process.env.TURKNET_TOKEN
    }
});

const discordClient = axios.create({
    baseURL: 'https://discordapp.com',
    headers: {
        token: process.env.WEBHOOK_TOKEN
    }
})

async function checkAvailability() {
    try {
        const result = await turknetClient.put('/service/AddressServ.svc/CheckServiceAvailability', {
            Key: process.env.TURKNET_KEY,
            Value: process.env.TURKNET_VALUE
        });
        
        currentRetriedCount++;

        handleTurkNetSuccessResponse(res.data);
        console.log(`Data received from TurkNet API. (${currentRetriedCount})`);
    } catch (error) {
        sendNotificationToDiscord(`**[TürkNet API Error Handler: ${currentRetriedCount}]** API hata döndürdü. (${error})`);
    }
}

function handleTurkNetSuccessResponse(data) {
    if (data.ServiceResult.Code == -2 || (onlyFiberAvailableResult && !(data.Result.FiberServiceAvailablity.IsAvailable || data.Result.VAEFiberServiceAvailability.IsAvailable))) {
        sendNotificationToDiscord(`**[TürkNet API Response: ${currentRetriedCount}]** Bölgenizde TürkNet Fiber altyapısı yok.`);
        return;
    }

    let message = `**[TürkNet API Response: ${currentRetriedCount}]**\n<@${process.env.DISCORD_CLIENT_ID}> bölgenizde kullanılabilir hizmetler var.\n\n**HIZMETLER**\n`;

    if (data.Result.FiberServiceAvailablity.IsAvailable) {
        message += '*— Türk Net Fiber*\n';
    }

    if (data.Result.VAEFiberServiceAvailability.IsAvailable) {
        message += '*— Türk Telekom Fiber*\n';
    }

    if (data.Result.VDSLServiceAvailability.IsAvailable) {
        message += '*— VDSL*\n';
    }

    message += `\n**YAPA:** ${data.Result.YapaServiceAvailability.Description}`;

    clearInterval(notifyInterval);
    sendNotificationToDiscord(message);
}

async function sendNotificationToDiscord(message) {
    await discordClient.post(`/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
        content: message,
        username: process.env.WEBHOOK_USERNAME
    });
}
