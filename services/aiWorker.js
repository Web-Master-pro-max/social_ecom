const { Post, Product, Banner } = require('../models');
const { generatePostContent, generateBannerContent, downloadImage } = require('./aiService');

const POST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day
const BANNER_INTERVAL_MS = 3 * 7 * 24 * 60 * 60 * 1000; // 3 weeks

async function createAutonomousPost() {
  try {
    const aiBotId = parseInt(process.env.AI_BOT_ID);
    if (!aiBotId || isNaN(aiBotId)) {
      console.log('AI Worker: AI Bot ID not set yet, skipping post generation.');
      return;
    }

    console.log('AI Worker: Waking up to generate a new post...');
    
    // Fetch a random product to potentially link
    const products = await Product.findAll();
    const randomProduct = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : null;

    const postData = await generatePostContent(randomProduct);
    
    if (!postData || !postData.content) {
      console.log('AI Worker: Failed to generate post content.');
      return;
    }

    console.log('AI Worker: Generated content:', postData.content);
    
    let mediaUrls = [];
    if (postData.imageTopic && !randomProduct) {
      console.log('AI Worker: Downloading image for topic:', postData.imageTopic);
      const imageUrl = await downloadImage(postData.imageTopic);
      mediaUrls.push(imageUrl);
    }

    await Post.create({
      sellerId: aiBotId,
      content: postData.content,
      media: mediaUrls,
      productId: randomProduct ? randomProduct.id : null
    });

    console.log('AI Worker: Successfully published new post!');
  } catch (error) {
    console.error('AI Worker Error:', error);
  }
}

async function createAutonomousBanner() {
  try {
    console.log('AI Worker: Waking up to generate new homepage banners...');
    const bannerData = await generateBannerContent(3);
    const bannersList = bannerData?.banners || (bannerData?.title ? [bannerData] : []);

    if (!bannersList || bannersList.length === 0) return;

    for (const b of bannersList) {
      console.log('AI Worker: Generated banner title:', b.title);
      const imageUrl = await downloadImage(b.imageTopic || b.title);

      await Banner.create({
        title: b.title,
        subtitle: b.subtitle || '',
        image: imageUrl,
        link: 'products.html',
        isActive: true
      });
    }

    console.log(`AI Worker: Successfully published ${bannersList.length} new AI homepage banners!`);
  } catch (error) {
    console.error('AI Worker Banner Error:', error);
  }
}

function startAiWorker() {
  console.log(`AI Worker: Started background job. Post interval: 1 day, Banner interval: 3 weeks.`);
  
  // Schedule a post and banner 30 seconds after server starts so user sees it immediately
  setTimeout(() => {
    createAutonomousPost();
    createAutonomousBanner();
  }, 30 * 1000);

  // Post every 1 day, Banner every 3 weeks
  setInterval(createAutonomousPost, POST_INTERVAL_MS);
  setInterval(createAutonomousBanner, BANNER_INTERVAL_MS);
}

module.exports = { startAiWorker, createAutonomousBanner };
