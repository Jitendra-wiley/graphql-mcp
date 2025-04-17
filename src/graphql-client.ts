import { GraphQLClient } from 'graphql-request';
import { getAccessToken } from './auth.js';
import dotenv from 'dotenv';
import logger from './logger.js';

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

// Function to make an introspection query to fetch the GraphQL schema
export async function getGraphQLSchema(): Promise<any> {
  try {
    const client = await createGraphQLClient();
    
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            kind
            name
            description
            fields {
              name
              description
              args {
                name
                description
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
              type {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
          queryType {
            name
            fields {
              name
              description
            }
          }
          mutationType {
            name
            fields {
              name
              description
            }
          }
        }
      }
    `;
    
    const result = await client.request(introspectionQuery);
    /* 
     * The result will contain the entire schema, including types, queries, and mutations.
     * You can process this result to extract the information you need.
    */
    // writeFile('schema.json', JSON.stringify(result, null, 2), (err) => {
    //   if (err) {
    //     logger.error({ err }, 'Error writing schema to file');
    //   } else {
    //     logger.info('Schema written to schema.json');
    //   }
    // });
    return result;
  } catch (error) {
    logger.error('Error fetching GraphQL schema', error);
    throw error;
  }
}

// Execute any GraphQL query with variables
export async function executeGraphQLQuery(query: string, variables?: Record<string, any>): Promise<any> {
  try {
    const client = await createGraphQLClient();
    const result = await client.request(query, variables);
    return result;
  } catch (error) {
    logger.error('Error executing GraphQL query', error);
    throw error;
  }
}