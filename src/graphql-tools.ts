import { executeGraphQLQuery } from './graphql-client.js';
import logger from './logger.js';

// Execute a query to fetch available queries in the schema
export async function getAvailableQueries(): Promise<any> {
  const query = `
    query {
      __schema {
        queryType {
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
          }
        }
      }
    }
  `;
  
  try {
    const result = await executeGraphQLQuery(query);
    console.log('Available queries:', result);
    return result.__schema.queryType.fields;
  } catch (error) {
    logger.error('Error fetching available queries', error);
    throw error;
  }
}

// Execute a query to fetch available mutations in the schema
export async function getAvailableMutations(): Promise<any> {
  const query = `
    query {
      __schema {
        mutationType {
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
          }
        }
      }
    }
  `;
  
  try {
    const result = await executeGraphQLQuery(query);
    return result.__schema.mutationType?.fields ?? [];
  } catch (error) {
    logger.error('Error fetching available mutations', error);
    throw error;
  }
}

// A helper to build a GraphQL query dynamically
export function buildGraphQLQuery(
  operationName: string, 
  operationType: 'query' | 'mutation', 
  fields: string[]
): string {
  return `
    ${operationType} {
      ${operationName} {
        ${fields.join('\n')}
      }
    }
  `;
}

// Get details about a specific type
export async function getTypeDetails(typeName: string): Promise<any> {
  const query = `
    query {
      __type(name: "${typeName}") {
        name
        kind
        description
        fields {
          name
          description
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
        inputFields {
          name
          description
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
    }
  `;
  
  try {
    const result = await executeGraphQLQuery(query);
    return result.__type;
  } catch (error) {
    logger.error(`Error fetching details for type ${typeName}:`, error);
    throw error;
  }
}