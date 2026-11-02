// Renderer, main and website share the same URL classifier.
const {browserAddress}=require("../../public/models/browser-address.js");
module.exports={normalizeURL:browserAddress};
