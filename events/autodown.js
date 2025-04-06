const { Events, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const streamPipeline = promisify(require('stream').pipeline);

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Get the content and check for URLs
    const content = message.content;
    
    // Define regex patterns for different platforms
    const regEx_tiktok = /(^https:\/\/)((vm|vt|www|v)\.)?(tiktok|douyin)\.com\//;
    const regEx_youtube = /(^https:\/\/)((www)\.)?(youtube|youtu)(PP)*\.(com|be)\//;
    const regEx_facebook = /(^https:\/\/)(\w+\.)?(facebook|fb)\.(com|watch)\/((story\.php|page\.\w+)(\?|\/))?(story_fbid=|\w+\/)/;
    const regEx_reelfb = /^https:\/\/(?:www\.)?facebook\.com\/(reel|share)\/\d+(?:\?mibextid=[\w\d]+)?$/i;
    const regEx_fbwatch = /^https:\/\/fb\.watch\/\w+\/(\?\w+=\w+)?$/;
    const regEx_threads = /(^https:\/\/)((www)\.)?(threads)\.(net)\//;
    const regEx_instagram = /^\u0068\u0074\u0074\u0070\u0073\u003a\/\/(www\.)?instagram\.com\/(reel|p)\/\w+\/\w*/;
    const regEx_capcut = /(^https:\/\/)((www)\.)?(capcut)\.(com)\//;
    const regEx_twitter = /(^https:\/\/)((www|mobile|web)\.)?(twitter|x)\.(com)\//;
    
    // Stores download info for reactions
    const downloadInfo = new Map();
    
    // Function to convert seconds to HH:MM:SS format
    function convertSecondsToHMS(seconds) {
      const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const remainingSeconds = String(Math.floor(seconds % 60)).padStart(2, '0');
      return `${hours}:${minutes}:${remainingSeconds}`;
    }
    
    // Function to download the resource and return an attachment
    async function downloadResource(url, filename) {
      const tempPath = path.join(__dirname, '..', 'temp', filename);
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      await streamPipeline(response.data, fs.createWriteStream(tempPath));
      return new AttachmentBuilder(tempPath, { name: filename });
    }
    
    // TikTok Handler
    if (regEx_tiktok.test(content)) {
      try {
        const platform = content.includes("tiktok") ? "TIKTOK" : "DOUYIN";
        const response = await axios.post('https://www.tikwm.com/api/', { url: content });
        const data = response.data.data;
        
        let attachments = [];
        if (data.images) {
          // Handle slideshow
          for (const imageUrl of data.images) {
            const filename = `tiktok_image_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
            attachments.push(await downloadResource(imageUrl, filename));
          }
        } else {
          // Handle video
          const filename = `tiktok_video_${Date.now()}.mp4`;
          attachments.push(await downloadResource(data.play, filename));
        }
        
        const botMsg = await message.reply({
          content: `[ ${platform} ] - Auto Download\n──────────────────\n📝 𝗧𝗶𝗲̂𝘂 𝗱𝗲̂̀: ${data.title}\n❤️ 𝗟𝘂̛𝗼̛̣𝘁 𝘁𝗶𝗺: ${data.digg_count}\n🔎 𝗟𝘂̛𝗼̛̣𝘁 𝘅𝗲𝗺: ${data.play_count}\n💬 Comments: ${data.comment_count}\n🔁 Shares: ${data.share_count}\n⏳ Duration: ${data.duration} seconds\n👤 𝗕𝗼̛̉𝗶: ${data.author.nickname} (${data.author.unique_id})\n🎵 𝗡𝗵𝗮̣𝗰: ${data.music_info.author}\n──────────────────\n👉 React with "✅" if you want to download the audio`,
          files: attachments
        });
        
        // Store music URL for reaction handler
        downloadInfo.set(botMsg.id, {
          url: data.music,
          type: 'audio',
          user: message.author.id
        });
        
        // Add the reaction for user to click
        await botMsg.react('✅');
        
        // Set up reaction collector
        const filter = (reaction, user) => {
          return reaction.emoji.name === '✅' && user.id === message.author.id;
        };
        
        const collector = botMsg.createReactionCollector({ filter, time: 60000 });
        collector.on('collect', async () => {
          const info = downloadInfo.get(botMsg.id);
          if (info) {
            const audioFilename = `tiktok_audio_${Date.now()}.mp3`;
            const audioAttachment = await downloadResource(info.url, audioFilename);
            await message.reply({
              content: `[ MP3 DOWNLOAD ] - 𝗗𝗮̃ 𝘁𝗮̉𝗶 𝘁𝗵𝗮̀𝗻𝗵 𝗰𝗼̂𝗻𝗴📉\n\n🎶 Nhạc mày đây\n✏️ 𝗧𝗵𝗮̉ 𝗺𝗲̣ 𝗺𝗮̀𝘆 𝗶𝗰𝗼𝗻 𝗱𝗲̂̉ 𝘁𝗮̉𝗶 𝗱𝗲̂ 𝗻𝗵𝗮́ "✅"`,
              files: [audioAttachment]
            });
          }
          collector.stop();
        });
        
        collector.on('end', () => {
          downloadInfo.delete(botMsg.id);
        });
      } catch (error) {
        console.error("TikTok download error:", error);
        message.reply("❌ Failed to download the TikTok content. Please try again later.");
      }
    }
    
    // YouTube Handler
    else if (regEx_youtube.test(content)) {
      try {
        const info = await ytdl.getInfo(content);
        const formatvd = ytdl.chooseFormat(info.formats, { quality: '18' });
        const formatmp3 = ytdl.chooseFormat(info.formats, { quality: '140' });
        const formattedTime = convertSecondsToHMS(info.videoDetails.lengthSeconds);
        const convertedTime = moment(info.videoDetails.uploadDate).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
        
        // Download the video
        const videoFilename = `youtube_video_${Date.now()}.mp4`;
        const tempPath = path.join(__dirname, '..', 'temp', videoFilename);
        
        const videoStream = ytdl(content, { format: formatvd });
        await streamPipeline(videoStream, fs.createWriteStream(tempPath));
        const videoAttachment = new AttachmentBuilder(tempPath, { name: videoFilename });
        
        const botMsg = await message.reply({
          content: `[ YOUTUBE ] - Auto Download\n\n📝 Title: ${info.videoDetails.title}\n⏳ Duration: ${formattedTime}\n👤 Channel: ${info.videoDetails.ownerChannelName}\n📅 Upload date: ${convertedTime}\n🔎 Views: ${info.videoDetails.viewCount}\n──────────────────\n👉 React with "✅" if you want to download the audio`,
          files: [videoAttachment]
        });
        
        // Store audio URL for reaction handler
        downloadInfo.set(botMsg.id, {
          url: content,
          format: formatmp3,
          type: 'youtube',
          user: message.author.id
        });
        
        await botMsg.react('✅');
        
        // Set up reaction collector
        const filter = (reaction, user) => {
          return reaction.emoji.name === '✅' && user.id === message.author.id;
        };
        
        const collector = botMsg.createReactionCollector({ filter, time: 60000 });
        collector.on('collect', async () => {
          const info = downloadInfo.get(botMsg.id);
          if (info && info.type === 'youtube') {
            try {
              const audioFilename = `youtube_audio_${Date.now()}.mp3`;
              const tempAudioPath = path.join(__dirname, '..', 'temp', audioFilename);
              
              const audioStream = ytdl(info.url, { format: info.format });
              await streamPipeline(audioStream, fs.createWriteStream(tempAudioPath));
              
              const audioAttachment = new AttachmentBuilder(tempAudioPath, { name: audioFilename });
              
              await message.reply({
                content: `[ MP3 DOWNLOAD ] - 𝗗𝗮̃ 𝘁𝗿𝗶́𝗰𝗵 𝘅𝘂𝗮̂́𝘁 𝗮̂𝗺 𝘁𝗵𝗮𝗻𝗵\n\n🎶 𝗗𝗮̂𝘆 𝗹𝗮̀ 𝗮̂𝗺 𝘁𝗵𝗮𝗻𝗵 𝗯𝗮̣𝗻 𝘆𝗲̂𝘂 𝗰𝗮̂̀𝘂\n✏️ 𝗗𝗮̂𝘆 𝗹𝗮̀ 𝘁𝗶́𝗻𝗵 𝗻𝗮̆𝗻𝗴 𝘁𝘂̛̣ 𝗱𝗼̣̂𝗻𝗴 𝘁𝗮̉𝗶 𝘅𝘂𝗼̂́𝗻𝗴 𝗮̂𝗺 𝘁𝗵𝗮𝗻𝗵 𝗸𝗵𝗶 𝗯𝗮̣𝗻 𝘁𝗵𝗮̉ 𝗶𝗰𝗼𝗻 "✅"`,
                files: [audioAttachment]
              });
            } catch (error) {
              console.error("Đéo tải được âm thanh:", error);
              message.reply("❌ Đéo tải được YTB.");
            }
          }
          collector.stop();
        });
        
        collector.on('end', () => {
          downloadInfo.delete(botMsg.id);
        });
      } catch (error) {
        console.error("video như cặc đéo tải được:", error);
        message.reply("❌ nặng quá địt cụ.");
      }
    }
    
    // Twitter/X Handler
    else if (regEx_twitter.test(content)) {
      try {
        // You'd need to replace this with your actual Twitter API integration
        const response = await axios.get(`https://api.example.com/twitter-dl?url=${content}`);
        const data = response.data.result;
        
        const videoFilename = `twitter_video_${Date.now()}.mp4`;
        const videoAttachment = await downloadResource(data.HD, videoFilename);
        
        const botMsg = await message.reply({
          content: `[ TWITTER ] - Auto Download\n\n📝 Description: ${data.desc}\n──────────────────\n👉 React with "✅" if you want to download the audio`,
          files: [videoAttachment]
        });
        
        // Store audio URL for reaction handler
        downloadInfo.set(botMsg.id, {
          url: data.audio,
          type: 'audio',
          user: message.author.id
        });
        
        await botMsg.react('✅');
        
        // Set up reaction collector
        const filter = (reaction, user) => {
          return reaction.emoji.name === '✅' && user.id === message.author.id;
        };
        
        const collector = botMsg.createReactionCollector({ filter, time: 60000 });
        collector.on('collect', async () => {
          const info = downloadInfo.get(botMsg.id);
          if (info) {
            const audioFilename = `twitter_audio_${Date.now()}.mp3`;
            const audioAttachment = await downloadResource(info.url, audioFilename);
            
            await message.reply({
              content: `[ MP3 DOWNLOAD ] - Audio extracted\n\n🎶 Here's the audio you requested\n✏️ This is an automatic feature that downloads the audio when you react with "✅"`,
              files: [audioAttachment]
            });
          }
          collector.stop();
        });
        
        collector.on('end', () => {
          downloadInfo.delete(botMsg.id);
        });
      } catch (error) {
        console.error("Twitter download error:", error);
        message.reply("❌ Failed to download the Twitter content. Please try again later.");
      }
    }
    
    // Add handlers for other platforms (Facebook, Instagram, etc.)
    // using similar patterns as above
    
    // Facebook Handler (simplified)
    else if (regEx_facebook.test(content) || regEx_reelfb.test(content) || regEx_fbwatch.test(content)) {
      message.reply("Facebook video download functionality detected. Implementation requires Facebook API credentials.");
      // Full implementation would be similar to the TikTok and YouTube handlers
    }
    
    // Instagram Handler (simplified)
    else if (regEx_instagram.test(content)) {
      message.reply("Instagram content download functionality detected. Implementation requires Instagram API integration.");
      // Full implementation would be similar to the TikTok and YouTube handlers
    }
    
    // Threads Handler (simplified)
    else if (regEx_threads.test(content)) {
      message.reply("Threads content download functionality detected. Implementation requires API integration.");
      // Full implementation would be similar to the TikTok and YouTube handlers
    }
    
    // CapCut Handler (simplified)
    else if (regEx_capcut.test(content)) {
      message.reply("CapCut template download functionality detected. Implementation requires API integration.");
      // Full implementation would be similar to the TikTok and YouTube handlers
    }
  }
};
