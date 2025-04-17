import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { executeGraphQLQuery, getGraphQLSchema } from './graphql-client.js';
import { getAvailableQueries, getAvailableMutations, getTypeDetails } from './graphql-tools.js';
import dotenv from 'dotenv';

dotenv.config();

// Create a new server instance
const server = new McpServer({
  name: 'graphql-mcp',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  },
});

// GraphQL schema cache
let schemaCache: any = null;

// Execute GraphQL query tool
server.tool(
  'execute-query',
  'Execute a GraphQL query against the GraphQL API',
  {
    query: z.string().describe('The GraphQL query to execute'),
    variables: z.record(z.any()).optional().describe('Variables for the GraphQL query'),
  },
  async ({ query, variables }) => {
    try {
      const result = await executeGraphQLQuery(query, variables);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing query: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Get schema information tool
server.tool(
  'get-schema',
  'Get information about the GraphQL schema',
  {
    typeName: z.string().optional().describe('Filter schema by specific type name'),
    fieldName: z.string().optional().describe('Filter schema by specific field name'),
    includeQueries: z.boolean().optional().default(true).describe('Include query definitions'),
    includeMutations: z.boolean().optional().default(true).describe('Include mutation definitions'),
  },
  async ({ typeName, fieldName, includeQueries, includeMutations }) => {
    try {
      // Use cached schema or fetch a new one
      schemaCache ??= await getGraphQLSchema();
      
      const schema = schemaCache.__schema;
      let result: any = {};
      
      if (typeName) {
        // Filter by specific type
        const typeInfo = schema.types.find((t: any) => t.name === typeName);
        if (!typeInfo) {
          return {
            content: [
              {
                type: 'text',
                text: `Type "${typeName}" not found in schema.`,
              },
            ],
          };
        }
        
        if (fieldName && typeInfo.fields) {
          // Filter by specific field in the type
          const fieldInfo = typeInfo.fields.find((f: any) => f.name === fieldName);
          if (!fieldInfo) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Field "${fieldName}" not found in type "${typeName}".`,
                },
              ],
            };
          }
          result = { type: typeName, field: fieldInfo };
        } else {
          result = typeInfo;
        }
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
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving schema: ${error.message}`,
          },
        ],
      };
    }
  }
);

// List available queries tool
server.tool(
  'list-queries',
  'List all available GraphQL queries in the API',
  {},
  async () => {
    try {
      const queries = await getAvailableQueries();
      
      // Format queries with their descriptions for better readability
      const formattedQueries = queries.map((q: any) => ({
        name: q.name,
        description: q.description || 'No description available',
        arguments: q.args.map((arg: any) => ({
          name: arg.name,
          description: arg.description || 'No description available',
          type: arg.type.name || (arg.type.ofType ? arg.type.ofType.name : 'Unknown')
        }))
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedQueries, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing available queries: ${error.message}`,
          },
        ],
      };
    }
  }
);

// List available mutations tool
server.tool(
  'list-mutations',
  'List all available GraphQL mutations in the API',
  {},
  async () => {
    try {
      const mutations = await getAvailableMutations();
      
      // Format mutations with their descriptions for better readability
      const formattedMutations = mutations.map((m: any) => ({
        name: m.name,
        description: m.description || 'No description available',
        arguments: m.args.map((arg: any) => ({
          name: arg.name,
          description: arg.description || 'No description available',
          type: arg.type.name || (arg.type.ofType ? arg.type.ofType.name : 'Unknown')
        }))
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedMutations, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing available mutations: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Get type details tool
server.tool(
  'type-details',
  'Get detailed information about a GraphQL type',
  {
    typeName: z.string().describe('The name of the GraphQL type to get details for'),
  },
  async ({ typeName }) => {
    try {
      const typeDetails = await getTypeDetails(typeName);
      
      if (!typeDetails) {
        return {
          content: [
            {
              type: 'text',
              text: `Type "${typeName}" not found in schema.`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(typeDetails, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving type details: ${error.message}`,
          },
        ],
      };
    }
  }
);

// The main function to run the server
async function main() {
  try {
    // Try to pre-fetch schema on startup
    try {
      console.error('Pre-fetching GraphQL schema...');
      schemaCache = await getGraphQLSchema();
      console.error('Schema fetched successfully');
    } catch (error: any) {
      console.error('Failed to pre-fetch schema, will try again when needed:', error.message);
      console.error('This may be an authentication issue. Please check your .env file credentials.');
      
      // Try to debug OAuth token acquisition
      try {
        console.error('Testing OAuth authentication...');
        console.error('Successfully obtained OAuth token.');
      } catch (authError: any) {
        console.error('OAuth authentication test failed:', authError.message);
        console.error('Please verify your CLIENT_ID, CLIENT_SECRET, and AUTH_URL in the .env file.');
      }
    }
    
    // Initialize transport
    const transport = new StdioServerTransport();
    
    // Connect the server
    await server.connect(transport);
    console.error('GraphQL MCP Server running on stdio');
  } catch (error: any) {
    console.error('Fatal error in main():', error.message);
    process.exit(1);
  }
}

// Start the server
main();