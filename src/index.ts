import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import logger from './logger.js';
import { getAccessToken } from './auth.js';
import { serverTools } from './serverTools.js';

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
let schemaCache = serverTools.schemaCache;

// Register all server tools
server.tool(
  'execute-query',
  'Execute a GraphQL query against the GraphQL API',
  serverTools.executeQueryTool.parameters,
  serverTools.executeQueryTool.handler
);

server.tool(
  'get-schema',
  'Get information about the GraphQL schema',
  serverTools.getSchemaTool.parameters,
  serverTools.getSchemaTool.handler
);

server.tool(
  'list-queries',
  'List all available GraphQL queries in the API',
  serverTools.listQueriesTools.parameters,
  serverTools.listQueriesTools.handler
);

server.tool(
  'list-mutations',
  'List all available GraphQL mutations in the API',
  serverTools.listMutationsTool.parameters,
  serverTools.listMutationsTool.handler
);

server.tool(
  'type-details',
  'Get detailed information about a GraphQL type',
  serverTools.typeDetailsTool.parameters,
  serverTools.typeDetailsTool.handler
);

server.tool(
  'generate-query',
  'Generate a GraphQL query or mutation template with variables based on operation name',
  serverTools.generateQueryTool.parameters,
  serverTools.generateQueryTool.handler
);

server.tool(
  'check-heartbeat',
  'Check if the GraphQL server is alive and responding to heartbeat requests',
  serverTools.checkHeartbeatTool.parameters,
  serverTools.checkHeartbeatTool.handler
);

server.tool(
  'get-deal-with-funding-nodes',
  'Get detailed information about a deal including its associated funding nodes',
  serverTools.getDealWithFundingNodesTool.parameters,
  serverTools.getDealWithFundingNodesTool.handler
);

server.tool(
  'get-order-author-details',
  'Get detailed information about authors associated with a specific order',
  serverTools.getOrderAuthorDetailsTool.parameters,
  serverTools.getOrderAuthorDetailsTool.handler
);

server.tool(
  'get-customer-order',
  'Get detailed information about a customer order using the exact query format that works in Insomnia',
  serverTools.getCustomerOrderTool.parameters,
  serverTools.getCustomerOrderTool.handler
);

server.tool(
  'get-price-proposal',
  'Get detailed information about a price proposal including pricing tiers and related parties',
  serverTools.getPriceProposalTool.parameters,
  serverTools.getPriceProposalTool.handler
);

// The main function to run the server
async function main() {
  try {
    // Display environment information
    logger.info('Starting GraphQL MCP Server', {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      hasGraphQLUrl: Boolean(process.env.GRAPHQL_URL),
      logLevel: process.env.LOG_LEVEL ?? 'info'
    });
    
    // Try to pre-fetch schema on startup
    try {
      logger.info('Pre-fetching GraphQL schema...');
      
      // Use the existing getGraphQLSchema function from graphql-client.js
      const { getGraphQLSchema } = await import('./graphql-client.js');
      schemaCache = await getGraphQLSchema();
      
      // Verify schema structure
      const schemaData = schemaCache?.__schema ?? schemaCache?.data?.__schema;
      if (!schemaData) {
        logger.warn('Schema fetched but structure is unexpected', {
          topLevelKeys: Object.keys(schemaCache ?? {})
        });
      } else {
        const typeCount = schemaData.types?.length ?? 0;
        const queryFields = schemaData.queryType?.fields?.length ?? 0;
        const mutationFields = schemaData.mutationType?.fields?.length ?? 0;
        
        logger.info('Schema fetched successfully', {
          typeCount,
          queryFields,
          mutationFields
        });
      }
    } catch (error: any) {
      logger.error(
        'Failed to pre-fetch schema, will try again when needed',
        { error: error.message }
      );
      logger.warn('This may be an authentication issue. Please check your .env file credentials.');
      
      // Try to debug OAuth token acquisition
      try {
        logger.info('Testing OAuth authentication...');
        const token = await getAccessToken();
        if (token) {
          logger.info('Successfully obtained OAuth token.');
        }
      } catch (authError: any) {
        logger.error(
          'OAuth authentication test failed',
          { error: authError.message }
        );
        logger.warn('Please verify your CLIENT_ID, CLIENT_SECRET, and AUTH_URL in the .env file.');
      }
    }
    
    // Initialize transport with better error handling
    logger.info('Initializing MCP StdioServerTransport...');
    const transport = new StdioServerTransport();
    
    // Connect the server with error handling
    try {
      logger.info('Connecting MCP server to transport...');
      await server.connect(transport);
      logger.info('GraphQL MCP Server running on stdio');
    } catch (connectError: any) {
      logger.error('Error connecting MCP server to transport', {
        error: connectError.message
      });
      throw connectError;
    }
  } catch (error: any) {
    logger.error('Fatal error in main()', { error: error.message });
    process.exit(1);
  }
}

// Start the server
main();