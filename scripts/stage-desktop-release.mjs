// Local allowlist staging only; publication is a separate authorized action.
import {stageDesktopRelease} from '../src/desktop-release-staging.js';
console.log(JSON.stringify(stageDesktopRelease(...process.argv.slice(2))));
