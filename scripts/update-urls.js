require('dotenv').config();
const mongoose = require('mongoose');
const System = require('../models/System');

async function updateUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Update] MongoDB Connected.');

    // Update Supply PMS
    const supply = await System.findOneAndUpdate(
      { slug: 'supply-pms' },
      { url: 'https://pms-central-kini.onrender.com/' },
      { new: true }
    );
    console.log('[Update] Supply PMS URL set to:', supply ? supply.url : 'not found');

    // Update Service PMS
    const service = await System.findOneAndUpdate(
      { slug: 'service-pms' },
      { url: 'https://sharmaakash7800.github.io/Service-PMS/' },
      { new: true }
    );
    console.log('[Update] Service PMS URL set to:', service ? service.url : 'not found');

    process.exit(0);
  } catch (err) {
    console.error('[Update Error]:', err);
    process.exit(1);
  }
}

updateUrls();
