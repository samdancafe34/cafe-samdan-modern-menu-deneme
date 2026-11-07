const axios = require('axios');
const { parse } = require('csv-parse/sync');
const config = require('../lib/config')();

module.exports = async (req, res) => {
  try {
    const [prodRes, catRes, setRes] = await Promise.all([
      axios.get(config.productsUrl),
      axios.get(config.categoriesUrl),
      axios.get(config.settingsUrl)
    ]);

    const products = parse(prodRes.data, { columns: true, skip_empty_lines: true, trim: true });
    const categories = parse(catRes.data, { columns: true, skip_empty_lines: true, trim: true });
    const settings = parse(setRes.data, { columns: true, skip_empty_lines: true, trim: true });

    // Fetch Drive photos if folderId & apiKey are available
    let images = [];
    if (config.folderId && config.apiKey) {
      try {
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q='${config.folderId}'+in+parents&key=${config.apiKey}&fields=files(id,name,thumbnailLink,webContentLink,webViewLink)`;
        const driveRes = await axios.get(driveUrl);
        images = driveRes.data.files || [];
      } catch (e) {
        console.error('Drive API error:', e.message);
      }
    }

    // Match images with products by filename/product name
    products.forEach(prod => {
      const pName = (prod['Ürün Adı (TR)'] || prod['Name'] || '').trim().toLowerCase();
      const matchedImg = images.find(img => {
        const imgTitle = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
        return imgTitle.trim().toLowerCase() === pName;
      });
      if (matchedImg) {
        prod.imageUrl = matchedImg.webContentLink || matchedImg.thumbnailLink;
      }
    });

    return res.status(200).json({ success: true, products, categories, settings });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
