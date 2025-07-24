import logger from '../logger.js';
import { McpResponse } from './types.js';

// Global schema cache that can be shared across tool invocations
export let schemaCache: any = null;

export function setSchemaCache(cache: any) {
  schemaCache = cache;
}

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

// Helper function to create standardized error responses
export function createErrorResponse(message: string, suggestion?: string): McpResponse {
  let text = `Error: ${message}`;
  if (suggestion) {
    text += `\n\n${suggestion}`;
  }
  
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

// Helper function to create success responses
export function createSuccessResponse(text: string): McpResponse {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

// Helper function to create JSON response
export function createJsonResponse(data: any, title?: string): McpResponse {
  let text = '';
  if (title) {
    text += `${title}\n\n`;
  }
  text += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

// Helper function to provide error suggestions based on error patterns
export function getErrorSuggestion(errorMessage: string): string {
  if (errorMessage.includes('syntax') || errorMessage.includes('parsing')) {
    return 'There appears to be a syntax error in your query. Try using the generate-query tool to create a valid query template.';
  } else if (errorMessage.includes('authentication') || errorMessage.includes('authorization') || errorMessage.includes('401') || errorMessage.includes('403')) {
    return 'This appears to be an authentication error. The server may be having issues with the OAuth token. Please check your authentication credentials in the .env file.';
  } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
    return 'There was a network error connecting to the GraphQL server. Please check your GRAPHQL_URL in the .env file and ensure the server is running.';
  }
  return '';
}

// Helper function to log tool execution
export function logToolExecution(toolName: string, params: any, preview?: string) {
  logger.info(`Executing ${toolName}`, {
    preview: preview || (typeof params === 'object' ? JSON.stringify(params).substring(0, 100) : String(params)),
    hasParams: !!params && Object.keys(params).length > 0
  });
}

// Helper function to format schema response
export function formatSchemaResponse(options: {
  schemaCache: any;
  typeName?: string;
  fieldName?: string;
  includeQueries?: boolean;
  includeMutations?: boolean;
}): McpResponse {
  const { schemaCache, typeName, fieldName, includeQueries, includeMutations } = options;
  
  // Extract schema data from the cache with fallback handling
  let schemaData = schemaCache?.__schema ?? schemaCache?.data?.__schema;
  
  if (!schemaData) {
    // Try to find schema data in nested structure
    if (typeof schemaCache === 'object' && schemaCache !== null) {
      for (const key of Object.keys(schemaCache)) {
        if (schemaCache[key]?.__schema) {
          schemaData = schemaCache[key].__schema;
          break;
        }
      }
    }
  }
  
  if (!schemaData) {
    logger.error('Schema data not available or in unexpected format', {
      cacheKeys: Object.keys(schemaCache ?? {})
    });
    return createErrorResponse(
      'Schema data not available or in unexpected format. Please ensure the GraphQL server is accessible and the schema has been fetched.'
    );
  }
  
  try {
    // Filter schema based on parameters
    let responseText = '';
    
    if (typeName) {
      const type = schemaData.types?.find((t: any) => t.name === typeName);
      if (type) {
        responseText = `Type: ${type.name}\n\n${JSON.stringify(type, null, 2)}`;
      } else {
        return createErrorResponse(`Type "${typeName}" not found in schema`);
      }
    } else {
      // General schema information
      const typeCount = schemaData.types?.length ?? 0;
      const queryFields = schemaData.queryType?.fields?.length ?? 0;
      const mutationFields = schemaData.mutationType?.fields?.length ?? 0;
      
      responseText = `GraphQL Schema Overview:
- Total Types: ${typeCount}
- Query Fields: ${queryFields}
- Mutation Fields: ${mutationFields}

`;
      
      if (includeQueries && schemaData.queryType?.fields) {
        responseText += `Available Queries (${queryFields}):\n`;
        schemaData.queryType.fields
          .filter((field: any) => !fieldName || field.name.includes(fieldName))
          .slice(0, 20) // Limit to first 20 for readability
          .forEach((field: any) => {
            responseText += `- ${field.name}: ${field.description || 'No description'}\n`;
          });
        responseText += '\n';
      }
      
      if (includeMutations && schemaData.mutationType?.fields) {
        responseText += `Available Mutations (${mutationFields}):\n`;
        schemaData.mutationType.fields
          .filter((field: any) => !fieldName || field.name.includes(fieldName))
          .slice(0, 20) // Limit to first 20 for readability
          .forEach((field: any) => {
            responseText += `- ${field.name}: ${field.description || 'No description'}\n`;
          });
      }
    }
    
    return createSuccessResponse(responseText);
  } catch (error: any) {
    logger.error('Error formatting schema response', { error: error.message });
    return createErrorResponse(`Error formatting schema response: ${error.message}`);
  }
} 