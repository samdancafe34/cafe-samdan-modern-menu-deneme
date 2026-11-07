'use strict';
// Ayarlar: ortam değişkeni varsa onu, yoksa aşağıdaki E-Tablo ve Drive klasör bağlantılarını kullanır.
const PRODUCTS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS35QUMLvlrAPrY_PMKMUncYE6XZ-No-oVd4tsRYbRYr0iI6he1wM-Yw-Eg1iP8M9n8qs_SG_SYG2dI/pub?gid=1705046919&single=true&output=csv';
const CATEGORIES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS35QUMLvlrAPrY_PMKMUncYE6XZ-No-oVd4tsRYbRYr0iI6he1wM-Yw-Eg1iP8M9n8qs_SG_SYG2dI/pub?gid=1195794735&single=true&output=csv';
const SETTINGS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS35QUMLvlrAPrY_PMKMUncYE6XZ-No-oVd4tsRYbRYr0iI6he1wM-Yw-Eg1iP8M9n8qs_SG_SYG2dI/pub?gid=1688025131&single=true&output=csv';

module.exports = function config() {
  const e = process.env;
  return {
    productsUrl: e.PRODUCTS_CSV_URL || PRODUCTS,
    categoriesUrl: e.CATEGORIES_CSV_URL || CATEGORIES,
    settingsUrl: e.SETTINGS_CSV_URL || SETTINGS,
    apiKey: e.GOOGLE_API_KEY || '',
    folderId: e.DRIVE_FOLDER_ID || '1LRiGKrjd9fH3yDhUDxhFf9CsGuQMOYr5',
    timeoutMs: Number(e.FETCH_TIMEOUT_MS) || 8000
  };
};