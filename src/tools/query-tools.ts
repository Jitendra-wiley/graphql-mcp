import { executeGraphQLQuery } from '../graphql-client.js';
import { getAvailableQueries, getAvailableMutations, generateQueryExample, checkHeartbeat } from '../graphql-tools.js';
import logger from '../logger.js';
import {
  McpTool,
  ExecuteQueryParams,
  GenerateQueryParams,
  HeartbeatParams,
  executeQuerySchema,
  generateQuerySchema,
  heartbeatSchema
} from './types.js';
import {
  createErrorResponse,
  createSuccessResponse,
  extractErrorMessage,
  getErrorSuggestion,
  logToolExecution
} from './helpers.js';

// Execute GraphQL query tool
export const executeQueryTool: McpTool = {
  name: 'execute-query',
  description: 'Execute a GraphQL query against the GraphQL API',
  parameters: executeQuerySchema,
  handler: async ({ query, variables, validateOnly }: ExecuteQueryParams) => {
    try {
      // Basic validation to ensure the query is properly formatted
      if (!query.trim()) {
        return createErrorResponse(
          'Query cannot be empty. Please provide a valid GraphQL query.'
        );
      }
      
      // Basic syntax validation - must include a query or mutation keyword
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery.includes('query') && !normalizedQuery.includes('mutation')) {
        logger.warn('Invalid query format, missing query or mutation keyword');
        return createErrorResponse(
          'Invalid query format. GraphQL operations should start with \'query\' or \'mutation\'.',
          'If you\'re not sure how to format your query, try using the generate-query tool to create a template.'
        );
      }
      
      // Log what we're about to execute
      logToolExecution(
        'execute-query',
        { validateOnly },
        query.replace(/\s+/g, ' ').trim().substring(0, 100) + (query.length > 100 ? '...' : '')
      );
      
      // If validateOnly is true, just return the formatted query and variables
      if (validateOnly) {
        const response = `Query validated successfully. Ready to execute:

Query:
\`\`\`graphql
${query}
\`\`\`

Variables:
\`\`\`json
${JSON.stringify(variables ?? {}, null, 2)}
\`\`\`

To execute this query, call the execute-query tool again with validateOnly set to false.`;
        
        return createSuccessResponse(response);
      }
      
      // Execute the query
      const result = await executeGraphQLQuery(query, variables);
      
      // Check for common error patterns in the result
      const errorMessage = extractErrorMessage(result);
      if (errorMessage) {
        logger.warn('GraphQL execution returned an error', { errorMessage });
        return createErrorResponse(
          `Error from GraphQL API: ${errorMessage}`,
          'Please check your query syntax and variables. You can use the list-queries or list-mutations tools to see available operations.'
        );
      }
      
      // Format the response for better readability
      const response = `Query executed successfully:

Result:
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\``;
      
      return createSuccessResponse(response);
    } catch (error: any) {
      // Enhanced error handling with better suggestions
      const errorMessage = error.message ?? 'Unknown error';
      logger.error('Error executing query', { error: errorMessage, query: query.substring(0, 100) });
      
      const suggestion = getErrorSuggestion(errorMessage);
      
      return createErrorResponse(
        `Error executing query: ${errorMessage}`,
        suggestion
      );
    }
  }
};

// Generate GraphQL query/mutation template tool
export const generateQueryTool: McpTool = {
  name: 'generate-query',
  description: 'Generate a GraphQL query or mutation template with variables based on operation name',
  parameters: generateQuerySchema,
  handler: async ({ operationName, operationType }: GenerateQueryParams) => {
    try {
      logToolExecution('generate-query', { operationName, operationType });
      
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
        return createErrorResponse(
          `No matching ${operationType} found for "${operationName}".`,
          `Try using list-${operationType}s tool with a search term to find available operations.`
        );
      }
      
      // Generate example query or mutation
      const example = generateQueryExample(operation, operationType);
      
      if (!example.queryText) {
        return createErrorResponse(`Error generating ${operationType} example for "${operationName}".`);
      }
      
      // Create a nice formatted response with the query and variables
      const responseContent = `# ${operationType.toUpperCase()}: ${operation.name}
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
To execute this ${operationType}, use the execute-query tool with the query text and variables.`;
      
      return createSuccessResponse(responseContent);
    } catch (error: any) {
      logger.error(`Error generating ${operationType} template`, { error: error.message, operationName });
      return createErrorResponse(`Error generating ${operationType} template: ${error.message}`);
    }
  }
};

// GraphQL server heartbeat check tool
export const checkHeartbeatTool: McpTool = {
  name: 'check-heartbeat',
  description: 'Check if the GraphQL server is alive and responding to heartbeat requests',
  parameters: heartbeatSchema,
  handler: async () => {
    try {
      logToolExecution('check-heartbeat', {});
      
      const heartbeatResult = await checkHeartbeat();
      
      if (heartbeatResult.isAlive) {
        return createSuccessResponse(
          `✅ GraphQL server is alive and responding!\n\nHeartbeat response: ${heartbeatResult.response}`
        );
      } else {
        const errorText = `❌ GraphQL server heartbeat check failed.

Error: ${heartbeatResult.error}

Possible issues:
1. The GraphQL server may be down or unreachable
2. Network connectivity issues
3. Authentication issues with the OAuth token
4. The server doesn't implement the '_heartbeat' query

Try checking your .env file configuration and ensure the server is running.`;

        return createErrorResponse(errorText);
      }
    } catch (error: any) {
      logger.error('Unexpected error in heartbeat check tool', { error: error.message });
      return createErrorResponse(
        `An unexpected error occurred while checking the GraphQL server heartbeat: ${error.message}`
      );
    }
  }
}; 