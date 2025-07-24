// Legacy query file - now re-exports from organized GraphQL structure
// This file maintains backward compatibility while the codebase transitions

// Re-export queries from the new organized structure
export {
  introspectionQuery,
  getAvailableQueriesQuery as getAvailableQuery,
  getAvailableMutationsQuery as getAvailableMutation,
  getCustomerOrderByIdQuery,
  priceProposalQuery
} from './graphql/queries/index.js';