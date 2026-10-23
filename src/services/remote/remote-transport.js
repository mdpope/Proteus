// Keep browser/desktop imports stable while the standalone relay can copy its
// own complete transport boundary into its minimal Docker build context.
export {remoteTransportLimits,transportBudget} from '../../../relay/transport.mjs';
