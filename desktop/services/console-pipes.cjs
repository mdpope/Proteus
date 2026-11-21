// A detached launcher can close the read ends of Electron's log streams.
// Ignore that loss of console output without swallowing other stream errors.
function protectConsolePipes(...streams){
 for(const stream of streams)stream.on('error',error=>{if(error.code!=='EPIPE')throw error;});
}
module.exports={protectConsolePipes};
