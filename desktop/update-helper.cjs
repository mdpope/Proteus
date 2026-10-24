// Stable executable entry point used by installed releases before source organization.
// Keep this launcher while helper-capable baselines can initiate an update.
const helper=require('./updates/update-helper.cjs');
module.exports=helper;
if(require.main===module)helper.runCLI();
