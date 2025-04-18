import { GraphQLClient } from 'graphql-request';
import { getAccessToken } from './auth.js';
import dotenv from 'dotenv';
import logger from './logger.js';
import { introspectionQuery } from './query.js';

dotenv.config();

const GRAPHQL_URL = process.env.GRAPHQL_URL;
if (!GRAPHQL_URL) {
  throw new Error('Missing GRAPHQL_URL in environment variables');
}

// Create and configure the GraphQL client
export async function createGraphQLClient(): Promise<GraphQLClient> {
  try {
    const token = await getAccessToken();
    
    const client = new GraphQLClient(GRAPHQL_URL as string, {
      headers: {
        authorization: token,
      },
    });
    
    return client;
  } catch (error) {
    logger.error('Error creating GraphQL client', error);
    throw error;
  }
}

interface IntrospectionResult {
  data?: {
    __schema: any;
  };
  __schema?: any;
}

// Function to make an introspection query to fetch the GraphQL schema
export async function getGraphQLSchema(): Promise<IntrospectionResult> {
  try {
    const client = await createGraphQLClient();
    
    logger.info('Executing GraphQL schema introspection query');
    
    const result = await client.request<IntrospectionResult>(introspectionQuery);
    
    // Log the structure of the response
    logger.debug('GraphQL schema introspection response structure', {
      hasDataProperty: Boolean(result?.data),
      hasSchemaProperty: Boolean(result?.__schema ?? result?.data?.__schema),
      topLevelKeys: Object.keys(result || {}),
    });
    
    // Try to save schema to a file for debugging
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logDir = path.join(process.cwd(), 'logs');
      const schemaPath = path.join(logDir, 'schema-debug.json');
      
      fs.writeFileSync(schemaPath, JSON.stringify(result, null, 2));
      logger.info(`Schema debug info written to ${schemaPath}`);
    } catch (writeError) {
      logger.warn('Could not write schema debug info to file', { error: writeError });
    }
    
    return result;
  } catch (error: any) {
    // Enhanced error handling with more context
    logger.error('Error fetching GraphQL schema', { 
      error: error.message,
      statusCode: error.response?.status,
      responseBody: error.response?.error
    });
    throw error;
  }
}

// Execute any GraphQL query with variables
interface GraphQLResponse {
  data?: Record<string, any>;
}

export async function executeGraphQLQuery(query: string, variables?: Record<string, any>): Promise<any> {
  try {
    const client = await createGraphQLClient();
    
    // Log the query and variables for debugging
    logger.debug('Executing GraphQL query:', { 
      query: query.replace(/\s+/g, ' ').trim().substring(0, 100) + (query.length > 100 ? '...' : ''),
      variables
    });
    
    const result = await client.request<GraphQLResponse>(query, variables);
    
    // Log the raw response structure
    logger.debug('GraphQL response structure:', {
      hasDataProperty: Boolean(result?.data),
      topLevelKeys: Object.keys(result || {})
    });
    
    // Normalize GraphQL response - some clients might wrap everything in a 'data' property
    // while others return the data directly
    return result?.data ?? result;
  } catch (error: any) {
    // Enhanced error logging with request details
    logger.error('Error executing GraphQL query', { 
      error: error.message,
      query: query.replace(/\s+/g, ' ').trim().substring(0, 100) + (query.length > 100 ? '...' : ''),
      variables,
      statusCode: error.response?.status,
      responseBody: error.response?.error
    });
    throw error;
  }
}