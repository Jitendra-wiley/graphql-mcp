// Define interfaces for MCP tools based on usage in the project
import { z } from 'zod';
import logger from './logger.js';
import { executeGraphQLQuery, getGraphQLSchema } from './graphql-client.js';
import { 
  getAvailableQueries, 
  getAvailableMutations, 
  getTypeDetails, 
  searchQueries, 
  searchMutations, 
  generateQueryExample,
  checkHeartbeat,
  getDealWithFundingNodes,
  getOrderAuthorDetails,
  getCustomerOrderById,
  getPriceProposalById
} from './graphql-tools.js';

// Content types for MCP responses must match the expected format in index.ts
type TextContent = { 
  [x: string]: unknown; 
  type: "text"; 
  text: string; 
};

type McpContent = TextContent[];

interface McpResponse {
  [x: string]: unknown;
  content: McpContent;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

// Define interfaces for MCP tools - Using function type as recommended
type McpToolHandler<TParams> = (params: TParams) => Promise<McpResponse>;

interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: McpToolHandler<any>;
}

// Global schema cache that can be shared across tool invocations
let schemaCache: any = null;

// Helper function to extract error messages from GraphQL responses
export function extractErrorMessage(result: any): string | null {
  // GraphQL errors are usually in an 'errors' array
  if (result?.errors && Array.isArray(result.errors) && result.errors.length > 0) {
    // Extract the message from the first error
    const firstError = result.errors[0];
    if (typeof firstError === 'string') {
      return firstError;
    } else if (firstError?.message) {
      return firstError.message;
    }
    return 'Unknown GraphQL error format';
  }
  
  // Handle errors that might be at the top level
  if (result?.error?.message) {
    return result.error.message;
  }
  
  // No errors found
  return null;
}

// Type definitions for tool parameters
interface ExecuteQueryParams {
  query: string;
  variables?: Record<string, any>;
  validateOnly?: boolean;
}

interface GetSchemaParams {
  typeName?: string;
  fieldName?: string;
  includeQueries?: boolean;
  includeMutations?: boolean;
}

interface ListQueriesParams {
  search?: string;
  generateExample?: boolean;
  limit?: number;
}

interface ListMutationsParams {
  search?: string;
  generateExample?: boolean;
  limit?: number;
}

interface TypeDetailsParams {
  typeName: string;
}

interface GenerateQueryParams {
  operationName: string;
  operationType: 'query' | 'mutation';
}

interface HeartbeatParams {
  // No parameters needed
}

interface DealWithFundingNodesParams {
  dealId?: string;
  limit?: number;
}

interface OrderAuthorDetailsParams {
  orderBiId: string;
}

interface CustomerOrderParams {
  biId: string;
}

interface PriceProposalParams {
  biId: string;
}

// Execute GraphQL query tool
export const executeQueryTool: McpTool = {
  name: 'execute-query',
  description: 'Execute a GraphQL query against the GraphQL API',
  parameters: {
    query: z.string().describe('The GraphQL query to execute'),
    variables: z.record(z.any()).optional().describe('Variables for the GraphQL query'),
    validateOnly: z.boolean().optional().default(false).describe('If true, only validate the query without executing it'),
  },
  handler: async ({ query, variables, validateOnly }: ExecuteQueryParams) => {
    try {
      // Basic validation to ensure the query is properly formatted
      if (!query.trim()) {
        return {
          content: [
            {
              type: "text" as const,
              text: 'Error: Query cannot be empty. Please provide a valid GraphQL query.',
            },
          ],
        };
      }
      
      // Basic syntax validation - must include a query or mutation keyword
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery.includes('query') && !normalizedQuery.includes('mutation')) {
        logger.warn('Invalid query format, missing query or mutation keyword');
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Invalid query format. GraphQL operations should start with 'query' or 'mutation'.
              
If you're not sure how to format your query, try using the generate-query tool to create a template.`,
            },
          ],
        };
      }
      
      // Log what we're about to execute
      logger.info('Executing GraphQL operation', { 
        queryPreview: query.replace(/\s+/g, ' ').trim().substring(0, 100) + (query.length > 100 ? '...' : ''),
        hasVariables: !!variables && Object.keys(variables ?? {}).length > 0,
        validateOnly
      });
      
      // If validateOnly is true, just return the formatted query and variables
      if (validateOnly) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Query validated successfully. Ready to execute:

Query:
\`\`\`graphql
${query}
\`\`\`

Variables:
\`\`\`json
${JSON.stringify(variables ?? {}, null, 2)}
\`\`\`

To execute this query, call the execute-query tool again with validateOnly set to false.`,
            },
          ],
        };
      }
      
      // Execute the query
      const result = await executeGraphQLQuery(query, variables);
      
      // Check for common error patterns in the result
      const errorMessage = extractErrorMessage(result);
      if (errorMessage) {
        logger.warn('GraphQL execution returned an error', { errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error from GraphQL API: ${errorMessage}
              
Please check your query syntax and variables. You can use the list-queries or list-mutations tools to see available operations.`,
            },
          ],
        };
      }
      
      // Format the response for better readability
      return {
        content: [
          {
            type: "text" as const,
            text: `Query executed successfully:

Result:
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\``,
          },
        ],
      };
    } catch (error: any) {
      // Enhanced error handling with better suggestions
      const errorMessage = error.message ?? 'Unknown error';
      logger.error('Error executing query', { error: errorMessage, query: query.substring(0, 100) });
      
      let suggestionText = '';
      
      // Provide helpful suggestions based on common error patterns
      if (errorMessage.includes('syntax') || errorMessage.includes('parsing')) {
        suggestionText = 'There appears to be a syntax error in your query. Try using the generate-query tool to create a valid query template.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('authorization') || errorMessage.includes('401') || errorMessage.includes('403')) {
        suggestionText = 'This appears to be an authentication error. The server may be having issues with the OAuth token. Please check your authentication credentials in the .env file.';
      } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        suggestionText = 'There was a network error connecting to the GraphQL server. Please check your GRAPHQL_URL in the .env file and ensure the server is running.';
      }
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error executing query: ${errorMessage}
            
${suggestionText}`,
          },
        ],
      };
    }
  }
};

// Get schema information tool
export const getSchemaTool: McpTool = {
  name: 'get-schema',
  description: 'Get information about the GraphQL schema',
  parameters: {
    typeName: z.string().optional().describe('Filter schema by specific type name'),
    fieldName: z.string().optional().describe('Filter schema by specific field name'),
    includeQueries: z.boolean().optional().default(true).describe('Include query definitions'),
    includeMutations: z.boolean().optional().default(true).describe('Include mutation definitions'),
  },
  handler: async ({ typeName, fieldName, includeQueries, includeMutations }: GetSchemaParams) => {
    try {
      // Use cached schema or fetch a new one
      schemaCache ??= await getGraphQLSchema();
      
      // Enhanced schema structure handling with better logging
      logger.debug('Raw schema data structure:', { 
        hasDataProperty: Boolean(schemaCache?.data),
        hasSchemaProperty: Boolean(schemaCache?.__schema),
        topLevelKeys: Object.keys(schemaCache ?? {})
      });
      
      const formattedResponse = formatSchemaResponse({
        schemaCache,
        typeName,
        fieldName,
        includeQueries,
        includeMutations
      });
      
      // Ensure we're returning the correct content type format
      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse.content[0].text
          }
        ]
      };
    } catch (error: any) {
      logger.error('Error retrieving schema', { error: error.message });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving schema: ${error.message}`
          }
        ]
      };
    }
  }
};

// Helper function to format schema response - extracted to reduce cognitive complexity
function formatSchemaResponse({ 
  schemaCache, 
  typeName, 
  fieldName, 
  includeQueries, 
  includeMutations 
}: {
  schemaCache: any;
  typeName?: string;
  fieldName?: string;
  includeQueries?: boolean;
  includeMutations?: boolean;
}) {
  // Handle different response structures - GraphQL responses often include a data property
  const schema = schemaCache?.__schema ?? (schemaCache?.data?.__schema);
  let result: any = {};
  
  if (!schema) {
    logger.warn('Invalid schema format received from GraphQL API');
    return {
      content: [
        {
          type: "text" as const,
          text: 'Could not fetch schema information. Invalid schema format received.',
        },
      ],
    };
  }
  
  if (typeName) {
    return formatTypeInfoResponse(schema, typeName, fieldName);
  } else {
    // Include top-level query and mutation information
    result = {
      types: schema.types.map((t: any) => ({ name: t.name, kind: t.kind })),
    };
    
    if (includeQueries && schema.queryType) {
      result.queries = schema.queryType.fields;
    }
    
    if (includeMutations && schema.mutationType) {
      result.mutations = schema.mutationType.fields;
    }
  }
  
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// Helper function to format type information response
function formatTypeInfoResponse(schema: any, typeName: string, fieldName?: string) {
  // Filter by specific type
  const typeInfo = schema.types.find((t: any) => t.name === typeName);
  if (!typeInfo) {
    logger.warn('Type not found in schema', { typeName });
    return {
      content: [
        {
          type: "text" as const,
          text: `Type "${typeName}" not found in schema.`,
        },
      ],
    };
  }
  
  if (fieldName && typeInfo.fields) {
    // Filter by specific field in the type
    const fieldInfo = typeInfo.fields.find((f: any) => f.name === fieldName);
    if (!fieldInfo) {
      logger.warn('Field not found in type', { typeName, fieldName });
      return {
        content: [
          {
            type: "text" as const,
            text: `Field "${fieldName}" not found in type "${typeName}".`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ type: typeName, field: fieldInfo }, null, 2),
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(typeInfo, null, 2),
        },
      ],
    };
  }
}

// List available queries tool
export const listQueriesTools: McpTool = {
  name: 'list-queries',
  description: 'List all available GraphQL queries in the API',
  parameters: {
    search: z.string().optional().describe('Optional search term to filter queries by name or description'),
    generateExample: z.boolean().optional().default(false).describe('Whether to generate an example query for each result'),
    limit: z.number().optional().default(10).describe('Maximum number of queries to return'),
  },
  handler: async ({ search, generateExample, limit }: ListQueriesParams) => {
    try {
      // Get queries based on search term if provided
      const queries = search ? await searchQueries(search) : await getAvailableQueries();
      
      logger.debug('Queries found:', { count: queries.length, search });
      
      // Limit the number of results to prevent overloading the response
      const limitedQueries = queries.slice(0, limit);
      
      // Format queries with their descriptions for better readability
      const formattedQueries = limitedQueries.map((q: any) => {
        const result: any = {
          name: q.name,
          description: q.description ?? 'No description available',
          arguments: q.args.map((arg: any) => ({
            name: arg.name,
            description: arg.description ?? 'No description available',
            type: arg.type.name ?? (arg.type.ofType ? arg.type.ofType.name : 'Unknown')
          }))
        };
        
        // Generate example query if requested
        if (generateExample) {
          const example = generateQueryExample(q, 'query');
          result.example = {
            queryText: example.queryText,
            variables: example.variables
          };
        }
        
        return result;
      });
      
      // Provide a helpful message if no results were found for a search
      if (search && formattedQueries.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No queries found matching "${search}". Try a different search term.`,
            },
          ],
        };
      }
      
      // If we limited the results, include a message about it
      let responseText = JSON.stringify(formattedQueries, null, 2);
      
      if (queries.length > (limit ?? 10)) {
        responseText = `Showing ${limit ?? 10} of ${queries.length} matching queries. Refine your search term to see more specific results.\n\n${responseText}`;
      }
      
      // Include instructions on how to execute a query
      responseText += '\n\nTo execute a query, use the execute-query tool with the query text and variables.';
      
      return {
        content: [
          {
            type: "text" as const,
            text: responseText,
          },
        ],
      };
    } catch (error: any) {
      logger.error('Error listing available queries', { error: error.message, search });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing available queries: ${error.message}`,
          },
        ],
      };
    }
  }
};

// List available mutations tool
export const listMutationsTool: McpTool = {
  name: 'list-mutations',
  description: 'List all available GraphQL mutations in the API',
  parameters: {
    search: z.string().optional().describe('Optional search term to filter mutations by name or description'),
    generateExample: z.boolean().optional().default(false).describe('Whether to generate an example mutation for each result'),
    limit: z.number().optional().default(10).describe('Maximum number of mutations to return'),
  },
  handler: async ({ search, generateExample, limit }: ListMutationsParams) => {
    try {
      // Get mutations based on search term if provided
      const mutations = search ? await searchMutations(search) : await getAvailableMutations();
      
      logger.debug('Mutations found:', { count: mutations.length, search });
      
      // Limit the number of results to prevent overloading the response
      const limitedMutations = mutations.slice(0, limit);
      
      // Format mutations with their descriptions for better readability
      const formattedMutations = limitedMutations.map((m: any) => {
        const result: any = {
          name: m.name,
          description: m.description ?? 'No description available',
          arguments: m.args.map((arg: any) => ({
            name: arg.name,
            description: arg.description ?? 'No description available',
            type: arg.type.name ?? (arg.type.ofType ? arg.type.ofType.name : 'Unknown')
          }))
        };
        
        // Generate example mutation if requested
        if (generateExample) {
          const example = generateQueryExample(m, 'mutation');
          result.example = {
            queryText: example.queryText,
            variables: example.variables
          };
        }
        
        return result;
      });
      
      // Provide a helpful message if no results were found for a search
      if (search && formattedMutations.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No mutations found matching "${search}". Try a different search term.`,
            },
          ],
        };
      }
      
      // If we limited the results, include a message about it
      let responseText = JSON.stringify(formattedMutations, null, 2);
      
      if (mutations.length > (limit ?? 10)) {
        responseText = `Showing ${limit ?? 10} of ${mutations.length} matching mutations. Refine your search term to see more specific results.\n\n${responseText}`;
      }
      
      // Include instructions on how to execute a mutation
      responseText += '\n\nTo execute a mutation, use the execute-query tool with the mutation text and variables.';
      
      return {
        content: [
          {
            type: "text" as const,
            text: responseText,
          },
        ],
      };
    } catch (error: any) {
      logger.error('Error listing available mutations', { error: error.message, search });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing available mutations: ${error.message}`,
          },
        ],
      };
    }
  }
};

// Get type details tool
export const typeDetailsTool: McpTool = {
  name: 'type-details',
  description: 'Get detailed information about a GraphQL type',
  parameters: {
    typeName: z.string().describe('The name of the GraphQL type to get details for'),
  },
  handler: async ({ typeName }: TypeDetailsParams) => {
    try {
      const typeDetails = await getTypeDetails(typeName);
      
      if (!typeDetails) {
        logger.warn('Type not found in schema', { typeName });
        return {
          content: [
            {
              type: "text" as const,
              text: `Type "${typeName}" not found in schema.`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(typeDetails, null, 2),
          },
        ],
      };
    } catch (error: any) {
      logger.error('Error retrieving type details', { error: error.message, typeName });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving type details: ${error.message}`,
          },
        ],
      };
    }
  }
};

// Generate GraphQL query/mutation template tool
export const generateQueryTool: McpTool = {
  name: 'generate-query',
  description: 'Generate a GraphQL query or mutation template with variables based on operation name',
  parameters: {
    operationName: z.string().describe('Name of the query or mutation to generate (e.g., "getCustomerOrder", "createCustomer")'),
    operationType: z.enum(['query', 'mutation']).describe('Type of operation to generate'),
  },
  handler: async ({ operationName, operationType }: GenerateQueryParams) => {
    try {
      // Get all operations based on type
      const operations = operationType === 'query' 
        ? await getAvailableQueries()
        : await getAvailableMutations();
      
      // First try exact match
      let operation = operations.find((op: any) => 
        op.name.toLowerCase() === operationName.toLowerCase()
      );
      
      // If not found, try partial match
      if (!operation) {
        const matchingOps = operations.filter((op: any) => 
          op.name.toLowerCase().includes(operationName.toLowerCase())
        );
        
        if (matchingOps.length > 0) {
          // Sort by name length to get the closest match
          matchingOps.sort((a: any, b: any) => a.name.length - b.name.length);
          operation = matchingOps[0];
          
          logger.info(`No exact match for "${operationName}", using closest match "${operation.name}"`);
        }
      }
      
      if (!operation) {
        logger.warn(`No matching ${operationType} found for "${operationName}"`);
        return {
          content: [
            {
              type: "text" as const,
              text: `No matching ${operationType} found for "${operationName}". Try using list-${operationType}s tool with a search term to find available operations.`,
            },
          ],
        };
      }
      
      // Generate example query or mutation
      const example = generateQueryExample(operation, operationType);
      
      if (!example.queryText) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating ${operationType} example for "${operationName}".`,
            },
          ],
        };
      }
      
      // Create a nice formatted response with the query and variables
      const responseContent = `
# ${operationType.toUpperCase()}: ${operation.name}
${operation.description ? `# Description: ${operation.description}` : ''}

# Query Text:
\`\`\`graphql
${example.queryText}
\`\`\`

# Variables:
\`\`\`json
${JSON.stringify(example.variables, null, 2)}
\`\`\`

# Usage:
To execute this ${operationType}, use the execute-query tool with the query text and variables.
    `;
      
      return {
        content: [
          {
            type: "text" as const,
            text: responseContent,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Error generating ${operationType} template`, { error: error.message, operationName });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating ${operationType} template: ${error.message}`,
          },
        ],
      };
    }
  }
};

// GraphQL server heartbeat check tool
export const checkHeartbeatTool: McpTool = {
  name: 'check-heartbeat',
  description: 'Check if the GraphQL server is alive and responding to heartbeat requests',
  parameters: {},
  handler: async () => {
    try {
      const heartbeatResult = await checkHeartbeat();
      
      if (heartbeatResult.isAlive) {
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ GraphQL server is alive and responding!\n\nHeartbeat response: ${heartbeatResult.response}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ GraphQL server heartbeat check failed.\n\nError: ${heartbeatResult.error}\n\nPossible issues:\n1. The GraphQL server may be down or unreachable\n2. Network connectivity issues\n3. Authentication issues with the OAuth token\n4. The server doesn't implement the '_heartbeat' query\n\nTry checking your .env file configuration and ensure the server is running.`,
            },
          ],
        };
      }
    } catch (error: any) {
      logger.error('Unexpected error in heartbeat check tool', { error: error.message });
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ An unexpected error occurred while checking the GraphQL server heartbeat: ${error.message}`,
          },
        ],
      };
    }
  }
};

// Tool to get deal information with funding nodes
export const getDealWithFundingNodesTool: McpTool = {
  name: 'get-deal-with-funding-nodes',
  description: 'Get detailed information about a deal including its associated funding nodes',
  parameters: {
    dealId: z.string().optional().describe('Optional business interaction ID of the specific deal to retrieve'),
    limit: z.number().optional().default(5).describe('Maximum number of deals to return when no specific deal ID is provided'),
  },
  handler: async ({ dealId, limit }: DealWithFundingNodesParams) => {
    try {
      const dealsWithFundingNodes = await getDealWithFundingNodes(dealId, limit);
      
      if (dealsWithFundingNodes.length === 0) {
        logger.warn('No deals found', { dealId });
        return {
          content: [
            {
              type: "text" as const,
              text: dealId 
                ? `No deal found with ID "${dealId}".` 
                : 'No deals found in the system.'
            },
          ],
        };
      }
      
      // Format response for better readability
      const formattedResponse = dealsWithFundingNodes.map((deal: any) => {
        const fundingNodesCount = deal.fundingNodes?.length ?? 0;
        
        // Format each funding node with relevant information
        const formattedFundingNodes = deal.fundingNodes?.map((node: any) => {
          const orgName = node.organisation?.name ?? 'Unknown Organization';
          
          // Get funding amounts from goldOA and hybridOA if available
          const goldOAAmount = node.goldOA?.totalAmount 
            ? `${node.goldOA.totalAmount.amount} ${node.goldOA.totalAmount.currency}` 
            : 'Not specified';
            
          const hybridOAAmount = node.hybridOA?.totalAmount 
            ? `${node.hybridOA.totalAmount.amount} ${node.hybridOA.totalAmount.currency}` 
            : 'Not specified';
          
          return {
            id: node.id,
            name: node.node?.name ?? 'Unnamed Node',
            organization: orgName,
            versionId: node.versionId ?? 'Not specified',
            goldOA: goldOAAmount,
            hybridOA: hybridOAAmount
          };
        }) ?? [];
        
        // Return formatted deal with its funding nodes
        return {
          id: deal.id,
          biId: deal.biId,
          name: deal.name,
          description: deal.description,
          versionId: deal.versionId,
          versionCode: deal.versionCode,
          status: deal.dealStatus,
          period: `${deal.startDate} to ${deal.endDate}`,
          currency: deal.currency,
          createdAt: deal.createdAt,
          modifiedAt: deal.modifiedAt,
          fundingNodesCount,
          fundingNodes: formattedFundingNodes
        };
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${dealsWithFundingNodes.length} deal(s) with funding information:
            
\`\`\`json
${JSON.stringify(formattedResponse, null, 2)}
\`\`\``
          },
        ],
      };
    } catch (error: any) {
      logger.error('Error retrieving deals with funding nodes', { error: error.message, dealId });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving deals with funding nodes: ${error.message}. This could be due to an issue with the GraphQL API or structure changes in the API.`
          },
        ],
      };
    }
  }
};

// Tool to get author details for a specific order
export const getOrderAuthorDetailsTool: McpTool = {
  name: 'get-order-author-details',
  description: 'Get detailed information about authors associated with a specific order',
  parameters: {
    orderBiId: z.string().describe('The business interaction ID of the order (e.g., 3202523)'),
  },
  handler: async ({ orderBiId }: OrderAuthorDetailsParams) => {
    try {
      logger.info(`Retrieving author details for order ${orderBiId}`);
      
      const result = await getOrderAuthorDetails(orderBiId);
      
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `${result.message}\n\nAttempted approaches: ${result.attemptedApproaches ?? 'None'}`
            },
          ],
        };
      }
      
      // Helper function to reduce cognitive complexity
      const response = formatAuthorDetailsResponse(result, orderBiId);
      return {
        content: [
          {
            type: "text" as const,
            text: response.content[0].text
          }
        ]
      };
    } catch (error: any) {
      logger.error('Error retrieving order author details', { error: error.message, orderBiId });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving author details for order ${orderBiId}: ${error.message}`
          },
        ],
      };
    }
  }
};

// Helper function to format author details response
function formatAuthorDetailsResponse(result: any, orderBiId: string) {
  // Format the response based on where the author data was found
  let responseText = '';
  
  if (result.source === 'funding_request') {
    responseText = `# Author Details for Order ${orderBiId}\n\n`;
    responseText += `Found author information through associated funding request.\n\n`;
    
    responseText += `## Order Information\n`;
    responseText += `- **Order ID**: ${result.order.biId ?? 'N/A'}\n`;
    responseText += `- **Name**: ${result.order.name ?? 'N/A'}\n`;
    responseText += `- **Request ID**: ${result.requestId ?? 'N/A'}\n\n`;
    
    if (result.article) {
      responseText += `## Article Information\n`;
      responseText += `- **Article ID**: ${result.article.id ?? 'N/A'}\n`;
      responseText += `- **Title**: ${result.article.title ?? 'N/A'}\n\n`;
    }
    
    if (result.authors && result.authors.length > 0) {
      responseText += `## Authors (${result.authors.length})\n\n`;
      
      result.authors.forEach((author: any, index: number) => {
        responseText += `### Author ${index + 1}\n`;
        responseText += `- **Name**: ${author.name ?? 'N/A'}\n`;
        responseText += `- **Email**: ${author.email ?? 'N/A'}\n`;
        if (author.orcid) responseText += `- **ORCID**: ${author.orcid}\n`;
        responseText += '\n';
      });
      
      // Add JSON data for structured access
      responseText += `\n## Complete Author Data (JSON)\n\n\`\`\`json\n${JSON.stringify(result.authors, null, 2)}\n\`\`\``;
    } else {
      responseText += `No authors found for this order.`;
    }
  } else {
    // For customer_order or general_order sources
    responseText = `# Author Details for Order ${orderBiId}\n\n`;
    responseText += `Found author information through ${result.source === 'customer_order' ? 'customer order' : 'general order'} query.\n\n`;
    
    responseText += `## Order Information\n`;
    responseText += `- **Order ID**: ${result.order.biId ?? 'N/A'}\n`;
    responseText += `- **Name**: ${result.order.name ?? 'N/A'}\n`;
    responseText += `- **Description**: ${result.order.description ?? 'N/A'}\n\n`;
    
    if (result.authors && result.authors.length > 0) {
      responseText += `## Authors (${result.authors.length})\n\n`;
      
      result.authors.forEach((author: any, index: number) => {
        responseText += `### Author ${index + 1}\n`;
        responseText += `- **Role**: ${author.role ?? 'N/A'}\n`;
        responseText += `- **Name**: ${author.name ?? 'N/A'}\n`;
        responseText += `- **Email**: ${author.email ?? 'N/A'}\n`;
        if (author.description) responseText += `- **Description**: ${author.description}\n`;
        responseText += '\n';
      });
      
      // Add JSON data for structured access
      responseText += `\n## Complete Author Data (JSON)\n\n\`\`\`json\n${JSON.stringify(result.authors, null, 2)}\n\`\`\``;
    } else {
      responseText += `No authors found for this order, although the order exists in the system.\n`;
      responseText += `Total related parties found: ${result.relatedParties ?? 0}`;
    }
  }
  
  return {
    content: [
      {
        type: "text" as const,
        text: responseText
      },
    ],
  };
}

// Tool specifically for retrieving customer orders
export const getCustomerOrderTool: McpTool = {
  name: 'get-customer-order',
  description: 'Get detailed information about a customer order using the exact query format that works in Insomnia',
  parameters: {
    biId: z.string().describe('The business interaction ID of the order to retrieve (e.g., 3202460)'),
  },
  handler: async ({ biId }: CustomerOrderParams) => {
    try {
      logger.info(`Retrieving customer order with biId: ${biId} using Insomnia-compatible format`);
      
      const result = await getCustomerOrderById(biId);
      
      if (!result.success) {
        // Provide detailed diagnostic information for troubleshooting
        logger.warn(`Failed to retrieve customer order ${biId} with Insomnia-compatible format`, {
          error: result.error,
          diagnostics: result.diagnostics 
        });
        
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not retrieve customer order with biId ${biId}.\n\n` +
                    `Error: ${result.error}\n\n` +
                    `Diagnostics:\n` +
                    `- Status: ${result.diagnostics?.status ?? 'N/A'}\n` +
                    `- Status Text: ${result.diagnostics?.statusText ?? 'N/A'}\n` +
                    `- Error Type: ${result.diagnostics?.errorType ?? 'N/A'}\n` +
                    `\nThis query is using the exact format that works in Insomnia with only fields that exist in the schema.`
            },
          ],
        };
      }
      
      const response = formatCustomerOrderResponse(result.order, biId);
      return {
        content: [
          {
            type: "text" as const,
            text: response.content[0].text
          }
        ]
      };
    } catch (error: any) {
      logger.error(`Error in get-customer-order tool for order ${biId}`, { 
        error: error.message 
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving customer order with biId ${biId}: ${error.message}`
          },
        ],
      };
    }
  }
};

// Helper function to format customer order response
function formatCustomerOrderResponse(order: any, biId: string) {
  let formattedResponse = '';
  
  if (order) {
    formattedResponse = `# Customer Order: ${biId}\n\n`;
    formattedResponse += `## Order Information\n`;
    formattedResponse += `- **Order ID**: ${order.biId ?? 'N/A'}\n`;
    formattedResponse += `- **Status**: ${order.status ?? 'N/A'}\n`;
    
    if (order.totalPrice) {
      formattedResponse += `- **Total Price**: ${order.totalPrice.amount ?? 'N/A'} ${order.totalPrice.currency ?? ''}\n`;
    }
    
    formattedResponse += `- **Created On**: ${order.createdOn ?? 'N/A'}\n`;
    formattedResponse += `- **Last Modified**: ${order.lastModifiedOn ?? 'N/A'}\n\n`;
    
    // Process order items if available
    const orderItems = order.orderItems?.edges?.map((edge: any) => edge.node) ?? [];
    
    if (orderItems.length > 0) {
      formattedResponse += `## Order Items (${orderItems.length})\n\n`;
      
      orderItems.forEach((item: any, index: number) => {
        formattedResponse += `### Item ${index + 1}\n`;
        formattedResponse += `- **Quantity**: ${item.quantity ?? 'N/A'}\n`;
        
        if (item.price) {
          formattedResponse += `- **Price**: ${item.price.amount ?? 'N/A'} ${item.price.currency ?? ''}\n`;
        }
        
        if (item.product) {
          formattedResponse += `- **Product**: ${item.product.name ?? 'N/A'}\n`;
          formattedResponse += `- **Description**: ${item.product.description ?? 'N/A'}\n`;
        }
        
        formattedResponse += '\n';
      });
    } else {
      formattedResponse += `No order items found for this order.\n\n`;
    }
    
    // Add full order data in JSON format for reference
    formattedResponse += `\n## Complete Order Data (JSON)\n\n\`\`\`json\n${JSON.stringify(order, null, 2)}\n\`\`\``;
  } else {
    formattedResponse = `Customer order with biId ${biId} was found, but no data was returned.\n\n`;
  }
  
  return {
    content: [
      {
        type: "text" as const,
        text: formattedResponse
      },
    ],
  };
}

// Tool to retrieve price proposal information
export const getPriceProposalTool: McpTool = {
  name: 'get-price-proposal',
  description: 'Get detailed information about a price proposal including pricing tiers and related parties',
  parameters: {
    biId: z.string().describe('The business interaction ID of the price proposal to retrieve (e.g., 7204297)'),
  },
  handler: async ({ biId }: PriceProposalParams) => {
    try {
      logger.info(`Retrieving price proposal information for biId: ${biId}`);
      
      const result = await getPriceProposalById(biId);
      
      if (!result.success) {
        // Provide informative error message with diagnostics
        logger.warn(`Failed to retrieve price proposal ${biId}`, {
          message: result.message,
          source: result.source
        });
        
        return {
          content: [
            {
              type: "text" as const,
              text: `${result.message}\n\n` +
                    `Attempted approaches: ${result.attemptedApproaches ? result.attemptedApproaches.join(', ') : 'None'}\n\n` +
                    (result.businessInteraction ? 
                      `Found a business interaction with ID ${biId}, but it is not a price proposal. It is a ${result.businessInteraction.type ?? 'unknown type'}.` : 
                      '')
            },
          ],
        };
      }
      
      // Format the successful response using a helper function to reduce complexity
      const response = formatPriceProposalResponse(result.proposal, biId);
      return {
        content: [
          {
            type: "text" as const,
            text: response.content[0].text
          }
        ]
      };
    } catch (error: any) {
      logger.error(`Error retrieving price proposal ${biId}`, { 
        error: error.message 
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving price proposal with biId ${biId}: ${error.message}`
          },
        ],
      };
    }
  }
};

// Helper function to format price proposal response
function formatPriceProposalResponse(proposal: any, biId: string) {
  let formattedResponse = `# Price Proposal: ${biId}\n\n`;
  
  // Basic information section
  formattedResponse += `## Basic Information\n`;
  formattedResponse += `- **Proposal ID**: ${proposal.biId ?? 'N/A'}\n`;
  formattedResponse += `- **Name**: ${proposal.name ?? 'N/A'}\n`;
  formattedResponse += `- **Description**: ${proposal.description ?? 'N/A'}\n`;
  formattedResponse += `- **Status**: ${proposal.status ?? 'N/A'}\n`;
  formattedResponse += `- **Business Process Status**: ${proposal.bpStatus ?? 'N/A'}\n`;
  formattedResponse += `- **Currency**: ${proposal.currency ?? 'N/A'}\n`;
  formattedResponse += `- **Valid From**: ${proposal.validFrom ?? 'N/A'}\n`;
  formattedResponse += `- **Valid To**: ${proposal.validTo ?? 'N/A'}\n`;
  formattedResponse += `- **Created At**: ${proposal.createdAt ?? 'N/A'}\n`;
  formattedResponse += `- **Modified At**: ${proposal.modifiedAt ?? 'N/A'}\n\n`;
  
  formattedResponse += formatPriceTiersSection(proposal.priceTiers);
  formattedResponse += formatRelatedPartiesSection(proposal.parties);
  formattedResponse += formatRelatedBusinessInteractionsSection(proposal.relatedBusinessInteractions);
  
  // Include raw data in JSON format for reference
  formattedResponse += `## Complete Data (JSON)\n\n\`\`\`json\n${JSON.stringify(proposal, null, 2)}\n\`\`\``;
  
  return {
    content: [
      {
        type: "text" as const,
        text: formattedResponse
      },
    ],
  };
}

// Helper function to format price tiers section
function formatPriceTiersSection(priceTiers: any[] | undefined) {
  if (!priceTiers || priceTiers.length === 0) {
    return `## Price Tiers\nNo price tiers found for this proposal.\n\n`;
  }
  
  let section = `## Price Tiers (${priceTiers.length})\n\n`;
  
  priceTiers.forEach((tier: any, index: number) => {
    section += `### Tier ${index + 1}: ${tier.name ?? 'Unnamed Tier'}\n`;
    if (tier.description) {
      section += `- **Description**: ${tier.description}\n`;
    }
    
    if (tier.price) {
      section += `- **Price**: ${tier.price.amount ?? 'N/A'} ${tier.price.currency ?? ''}\n`;
    }
    
    section += `- **Quantity**: ${tier.quantity ?? 'N/A'}\n`;
    section += `- **Tier Type**: ${tier.tierType ?? 'N/A'}\n`;
    section += '\n';
  });
  
  return section;
}

// Helper function to format related parties section
function formatRelatedPartiesSection(parties: any[] | undefined) {
  if (!parties || parties.length === 0) {
    return `## Related Parties\nNo related parties found for this proposal.\n\n`;
  }
  
  let section = `## Related Parties (${parties.length})\n\n`;
  
  // Group parties by role
  const partiesByRole: Record<string, any[]> = {};
  
  parties.forEach((partyRelation: any) => {
    const role = partyRelation.role ?? 'Unknown Role';
    if (!partiesByRole[role]) {
      partiesByRole[role] = [];
    }
    partiesByRole[role].push(partyRelation);
  });
  
  // Display parties by role
  for (const [role, roleParties] of Object.entries(partiesByRole)) {
    section += `### ${role} (${roleParties.length})\n\n`;
    
    roleParties.forEach((partyRelation: any, index: number) => {
      const party = partyRelation.party ?? {};
      section += `#### ${index + 1}. ${party.name ?? 'Unknown Party'}\n`;
      if (party.partyType) {
        section += `- **Party Type**: ${party.partyType}\n`;
      }
      section += '\n';
    });
  }
  
  return section;
}

// Helper function to format related business interactions section
function formatRelatedBusinessInteractionsSection(interactions: any[] | undefined) {
  if (!interactions || interactions.length === 0) {
    return `## Related Business Interactions\nNo related business interactions found for this proposal.\n\n`;
  }
  
  let section = `## Related Business Interactions (${interactions.length})\n\n`;
  
  interactions.forEach((bi: any, index: number) => {
    // Avoid nested template literals by constructing the name first
    const biName = bi.name ?? `Business Interaction ${bi.biId ?? 'Unknown'}`;
    section += `### ${index + 1}. ${biName}\n`;
    section += `- **ID**: ${bi.biId ?? 'N/A'}\n`;
    
    if (bi.description) {
      section += `- **Description**: ${bi.description}\n`;
    }
    
    section += `- **Type**: ${bi.type ?? 'N/A'}\n`;
    section += '\n';
  });
  
  return section;
}

// Export all tools for use in index.ts
export const serverTools = {
  executeQueryTool,
  getSchemaTool,
  listQueriesTools,
  listMutationsTool,
  typeDetailsTool,
  generateQueryTool,
  checkHeartbeatTool,
  getDealWithFundingNodesTool,
  getOrderAuthorDetailsTool,
  getCustomerOrderTool,
  getPriceProposalTool,
  
  // Helper functions
  schemaCache,
  extractErrorMessage
};

export default serverTools;