const { Post, Product } = require('../models');
const { generatePostContent, downloadImage } = require('./aiService');

const POST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

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

function startAiWorker() {
  console.log(`AI Worker: Started background job. Interval set to ${POST_INTERVAL_MS / 1000 / 60 / 60} hours.`);
  
  // Schedule a post 1 minute after server starts so the user can see it works immediately
  setTimeout(() => {
    createAutonomousPost();
  }, 60 * 1000);

  // Then schedule the regular 1 day interval
  setInterval(createAutonomousPost, POST_INTERVAL_MS);
}

module.exports = { startAiWorker };
