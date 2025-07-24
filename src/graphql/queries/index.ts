// Export all query-related GraphQL operations

// Introspection queries
export {
  introspectionQuery,
  getAvailableQueriesQuery,
  getAvailableMutationsQuery,
  getTypeDetailsQuery,
  heartbeatQuery
} from './introspection.js';

// Business queries
export {
  getDealWithFundingNodesQuery,
  getCustomerOrderByIdQuery,
  priceProposalQuery,
  getOrderAuthorDetailsQuery
} from './business.js'; 