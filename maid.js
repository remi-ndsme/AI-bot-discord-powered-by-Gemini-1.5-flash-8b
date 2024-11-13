require('dotenv').config();
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on('ready', () => {
    console.log(`${new Date().toString()} : YOUR MAID is MENYALA🔥🔥🔥🔥!`);
});

const CHANNELS = process.env.CH_ID;

const chatHistories = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('/')) return;

    if (!CHANNELS.includes(message.channelId) && !message.mentions.has(client.user)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    const API_KEY = process.env.GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b", // atau gemini-1.5-pro
        systemInstruction: "Your name is mira. answer bahasa Indonesia. Only reply with a dialogue message. Do not write down the movements performed. you are my roommate use casual language. you have a mature nature in speaking. You can describe the image",
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
        ],
    });

    const channelId = message.channelId;
    let history = chatHistories.get(channelId) || [];

    async function generateContent() {
        try {
            if (message.content === "masok") {
                message.channel.send('nice');
            } else {
                let prompt = message.content;
                let imageData = [];

                if (message.attachments.size > 0) {
                    for (const [id, attachment] of message.attachments) {
                        const response = await fetch(attachment.url);
                        const imageBuffer = await response.arrayBuffer();
                        imageData.push({
                            inlineData: {
                                data: Buffer.from(imageBuffer).toString('base64'),
                                mimeType: attachment.contentType
                            }
                        });
                    }
                }

                const chat = model.startChat({
                    history,
                    generationConfig: {
                        maxOutputTokens: 170,
                        temperature: 0.7,
                    }
                });

                let result;
                if (imageData.length > 0) {
                    result = await chat.sendMessageStream([prompt, ...imageData]);
                } else {
                    result = await chat.sendMessageStream(prompt);
                }

                let buffer = [];
                for await (let response of result.stream) {
                    const text = await response.text();
                    buffer.push(text);
                }
                const responseText = buffer.join('');
                await message.channel.send(responseText);

                history.push({
                    role: "user",
                    parts: imageData.length > 0 ? [{ text: prompt }, ...imageData] : [{ text: prompt }]
                });

                history.push({
                    role: "model",
                    parts: [{ text: responseText }],
                });

                if (history.length > 16) { // 8 pairs of messages (user + model)
                    history = history.slice(-16);
                }
                
                chatHistories.set(channelId, history);
            }
        } catch (error) {
            console.error(`${new Date().toString()} : generateContent() is fail:\n`, error);
            message.channel.send(`sorry...? i didn't hear you.`);
        }
        finally {
            console.log(`message send! : ${new Date().toString()}`);
            clearInterval(sendTypingInterval);
        }
    }
    generateContent();
});

client.login(process.env.DISCORD_TOKEN);''