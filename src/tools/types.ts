import { z } from 'zod';

// Content types for MCP responses must match the expected format in index.ts
export type TextContent = { 
  [x: string]: unknown; 
  type: "text"; 
  text: string; 
};

export type McpContent = TextContent[];

export interface McpResponse {
  [x: string]: unknown;
  content: McpContent;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

// Define interfaces for MCP tools - Using function type as recommended
export type McpToolHandler<TParams> = (params: TParams) => Promise<McpResponse>;

export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: McpToolHandler<any>;
}

// Parameter interfaces for all tools
export interface ExecuteQueryParams {
  query: string;
  variables?: Record<string, any>;
  validateOnly?: boolean;
}

export interface GetSchemaParams {
  typeName?: string;
  fieldName?: string;
  includeQueries?: boolean;
  includeMutations?: boolean;
}

export interface ListQueriesParams {
  search?: string;
  generateExample?: boolean;
  limit?: number;
}

export interface ListMutationsParams {
  search?: string;
  generateExample?: boolean;
  limit?: number;
}

export interface TypeDetailsParams {
  typeName: string;
}

export interface GenerateQueryParams {
  operationName: string;
  operationType: 'query' | 'mutation';
}

export interface HeartbeatParams {
  // No parameters needed
}

export interface DealWithFundingNodesParams {
  dealId?: string;
  limit?: number;
}

export interface OrderAuthorDetailsParams {
  orderBiId: string;
}

export interface CustomerOrderParams {
  biId: string;
}

export interface PriceProposalParams {
  biId: string;
}

// Zod schemas for parameter validation
export const executeQuerySchema = {
  query: z.string().describe('The GraphQL query to execute'),
  variables: z.record(z.any()).optional().describe('Variables for the GraphQL query'),
  validateOnly: z.boolean().optional().default(false).describe('If true, only validate the query without executing it'),
};

export const getSchemaSchema = {
  typeName: z.string().optional().describe('Filter schema by specific type name'),
  fieldName: z.string().optional().describe('Filter schema by specific field name'),
  includeQueries: z.boolean().optional().default(true).describe('Include query definitions'),
  includeMutations: z.boolean().optional().default(true).describe('Include mutation definitions'),
};

export const listQueriesSchema = {
  search: z.string().optional().describe('Search for specific queries by name'),
  generateExample: z.boolean().optional().default(false).describe('Generate example usage for found queries'),
  limit: z.number().optional().default(50).describe('Maximum number of queries to return'),
};

export const listMutationsSchema = {
  search: z.string().optional().describe('Search for specific mutations by name'),
  generateExample: z.boolean().optional().default(false).describe('Generate example usage for found mutations'),
  limit: z.number().optional().default(50).describe('Maximum number of mutations to return'),
};

export const typeDetailsSchema = {
  typeName: z.string().describe('Name of the GraphQL type to get details for'),
};

export const generateQuerySchema = {
  operationName: z.string().describe('Name of the query or mutation to generate (e.g., "getCustomerOrder", "createCustomer")'),
  operationType: z.enum(['query', 'mutation']).describe('Type of operation to generate'),
};

export const heartbeatSchema = {};

export const dealWithFundingNodesSchema = {
  dealId: z.string().optional().describe('Optional business interaction ID of the specific deal to retrieve'),
  limit: z.number().optional().default(5).describe('Maximum number of deals to return when no specific deal ID is provided'),
};

export const orderAuthorDetailsSchema = {
  orderBiId: z.string().describe('The business interaction ID of the order (e.g., 3202523)'),
};

export const customerOrderSchema = {
  biId: z.string().describe('Business interaction ID of the customer order to retrieve'),
};

export const priceProposalSchema = {
  biId: z.string().describe('Business interaction ID of the price proposal to retrieve'),
}; 