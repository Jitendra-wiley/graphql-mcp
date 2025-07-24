import { getGraphQLSchema } from '../graphql-client.js';
import { getAvailableQueries, getAvailableMutations, getTypeDetails } from '../graphql-tools.js';
import logger from '../logger.js';
import {
  McpTool,
  GetSchemaParams,
  ListQueriesParams,
  ListMutationsParams,
  TypeDetailsParams,
  getSchemaSchema,
  listQueriesSchema,
  listMutationsSchema,
  typeDetailsSchema
} from './types.js';
import {
  schemaCache,
  setSchemaCache,
  createErrorResponse,
  createSuccessResponse,
  createJsonResponse,
  logToolExecution,
  formatSchemaResponse
} from './helpers.js';

// Get schema information tool
export const getSchemaTool: McpTool = {
  name: 'get-schema',
  description: 'Get information about the GraphQL schema',
  parameters: getSchemaSchema,
  handler: async ({ typeName, fieldName, includeQueries, includeMutations }: GetSchemaParams) => {
    try {
      logToolExecution('get-schema', { typeName, fieldName, includeQueries, includeMutations });
      
      // Use cached schema or fetch a new one
      let currentSchema = schemaCache;
      if (!currentSchema) {
        currentSchema = await getGraphQLSchema();
        setSchemaCache(currentSchema);
      }
      
      // Enhanced schema structure handling with better logging
      logger.debug('Raw schema data structure:', { 
        hasDataProperty: Boolean(currentSchema?.data),
        hasSchemaProperty: Boolean(currentSchema?.__schema),
        topLevelKeys: Object.keys(currentSchema ?? {})
      });
      
      return formatSchemaResponse({
        schemaCache: currentSchema,
        typeName,
        fieldName,
        includeQueries,
        includeMutations
      });
    } catch (error: any) {
      logger.error('Error retrieving schema', { error: error.message });
      return createErrorResponse(
        `Error retrieving schema: ${error.message}`,
        'This could be due to network issues or authentication problems. Please check your .env file configuration.'
      );
    }
  }
};

// List available queries tool
export const listQueriesTools: McpTool = {
  name: 'list-queries',
  description: 'List all available GraphQL queries in the API',
  parameters: listQueriesSchema,
  handler: async ({ search, generateExample, limit }: ListQueriesParams) => {
    try {
      logToolExecution('list-queries', { search, generateExample, limit });
      
      const queries = await getAvailableQueries();
      
      if (!queries || queries.length === 0) {
        return createErrorResponse('No queries found in the GraphQL schema');
      }
      
      // Filter queries based on search term
      let filteredQueries = queries;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredQueries = queries.filter((query: any) => 
          query.name.toLowerCase().includes(searchLower) ||
          (query.description && query.description.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply limit
      const limitedQueries = filteredQueries.slice(0, limit || 50);
      
      let responseText = `Found ${limitedQueries.length} queries`;
      if (search) {
        responseText += ` matching "${search}"`;
      }
      responseText += `:\n\n`;
      
      limitedQueries.forEach((query: any, index: number) => {
        responseText += `${index + 1}. **${query.name}**\n`;
        if (query.description) {
          responseText += `   Description: ${query.description}\n`;
        }
        
        if (query.args && query.args.length > 0) {
          responseText += `   Arguments: ${query.args.map((arg: any) => arg.name).join(', ')}\n`;
        }
        
        responseText += '\n';
      });
      
      if (generateExample && limitedQueries.length > 0) {
        responseText += '\nUse the generate-query tool with any of these query names to get example usage.';
      }
      
      return createSuccessResponse(responseText);
    } catch (error: any) {
      logger.error('Error listing queries', { error: error.message });
      return createErrorResponse(
        `Error listing queries: ${error.message}`,
        'This could be due to network issues or authentication problems.'
      );
    }
  }
};

// List available mutations tool
export const listMutationsTool: McpTool = {
  name: 'list-mutations',
  description: 'List all available GraphQL mutations in the API',
  parameters: listMutationsSchema,
  handler: async ({ search, generateExample, limit }: ListMutationsParams) => {
    try {
      logToolExecution('list-mutations', { search, generateExample, limit });
      
      const mutations = await getAvailableMutations();
      
      if (!mutations || mutations.length === 0) {
        return createErrorResponse('No mutations found in the GraphQL schema');
      }
      
      // Filter mutations based on search term
      let filteredMutations = mutations;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMutations = mutations.filter((mutation: any) => 
          mutation.name.toLowerCase().includes(searchLower) ||
          (mutation.description && mutation.description.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply limit
      const limitedMutations = filteredMutations.slice(0, limit || 50);
      
      let responseText = `Found ${limitedMutations.length} mutations`;
      if (search) {
        responseText += ` matching "${search}"`;
      }
      responseText += `:\n\n`;
      
      limitedMutations.forEach((mutation: any, index: number) => {
        responseText += `${index + 1}. **${mutation.name}**\n`;
        if (mutation.description) {
          responseText += `   Description: ${mutation.description}\n`;
        }
        
        if (mutation.args && mutation.args.length > 0) {
          responseText += `   Arguments: ${mutation.args.map((arg: any) => arg.name).join(', ')}\n`;
        }
        
        responseText += '\n';
      });
      
      if (generateExample && limitedMutations.length > 0) {
        responseText += '\nUse the generate-query tool with any of these mutation names to get example usage.';
      }
      
      return createSuccessResponse(responseText);
    } catch (error: any) {
      logger.error('Error listing mutations', { error: error.message });
      return createErrorResponse(
        `Error listing mutations: ${error.message}`,
        'This could be due to network issues or authentication problems.'
      );
    }
  }
};

// Get type details tool
export const typeDetailsTool: McpTool = {
  name: 'type-details',
  description: 'Get detailed information about a GraphQL type',
  parameters: typeDetailsSchema,
  handler: async ({ typeName }: TypeDetailsParams) => {
    try {
      logToolExecution('type-details', { typeName });
      
      const typeDetails = await getTypeDetails(typeName);
      
      if (!typeDetails) {
        logger.warn('Type not found in schema', { typeName });
        return createErrorResponse(`Type "${typeName}" not found in schema.`);
      }
      
      return createJsonResponse(typeDetails, `Type Details: ${typeName}`);
    } catch (error: any) {
      logger.error('Error retrieving type details', { error: error.message, typeName });
      return createErrorResponse(`Error retrieving type details: ${error.message}`);
    }
  }
}; 