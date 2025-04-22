import { executeGraphQLQuery } from './graphql-client.js';
import logger from './logger.js';
import { getAvailableMutation, getAvailableQuery, getCustomerOrderByIdQuery, priceProposalQuery } from './query.js';

// Execute a query to fetch available queries in the schema
export async function getAvailableQueries(): Promise<any> {
  
  try {
    const result = await executeGraphQLQuery(getAvailableQuery);
    
    // Log the raw result for debugging
    logger.debug('Raw query result:', { result: JSON.stringify(result).substring(0, 500) + '...' });
    
    // Enhanced response structure handling
    // First, check if we have data directly at the result level
    let schemaData: any;
    
    if (result?.__schema) {
      schemaData = result;
      logger.debug('Schema data found at root level');
    } else if (result?.data?.__schema) {
      schemaData = result.data;
      logger.debug('Schema data found inside data property');
    } else {
      // Try to locate schema data by examining the structure
      logger.debug('Schema structure not standard, attempting to locate schema data', {
        resultKeys: Object.keys(result || {})
      });
      
      // Look for the first property that might contain schema data
      if (typeof result === 'object' && result !== null) {
        for (const key of Object.keys(result)) {
          if (result[key]?.__schema) {
            schemaData = result[key];
            logger.debug(`Schema data found inside '${key}' property`);
            break;
          }
        }
      }
    }
    
    if (!schemaData?.__schema) {
      logger.error('Invalid schema response format', { result });
      throw new Error('Invalid schema format received from GraphQL API');
    }
    
    const fields = schemaData?.__schema?.queryType?.fields;
    
    if (!fields || !Array.isArray(fields)) {
      logger.warn('No query fields found in schema', { schemaData });
      return [];
    }
    
    logger.info(`Found ${fields.length} available queries`);
    return fields;
  } catch (error) {
    logger.error('Error fetching available queries', { error });
    throw error;
  }
}

// Execute a query to fetch available mutations in the schema
export async function getAvailableMutations(): Promise<any> {
  
  try {
    const result = await executeGraphQLQuery(getAvailableMutation);
    
    // Log the raw result for debugging
    logger.debug('Raw mutation result:', { result: JSON.stringify(result).substring(0, 500) + '...' });
    
    // Enhanced response structure handling similar to getAvailableQueries
    let schemaData: any;
    
    if (result?.__schema) {
      schemaData = result;
      logger.debug('Mutation schema data found at root level');
    } else if (result?.data?.__schema) {
      schemaData = result.data;
      logger.debug('Mutation schema data found inside data property');
    } else {
      // Try to locate schema data by examining the structure
      logger.debug('Mutation schema structure not standard, attempting to locate schema data', {
        resultKeys: Object.keys(result || {})
      });
      
      // Look for the first property that might contain schema data
      if (typeof result === 'object' && result !== null) {
        for (const key of Object.keys(result)) {
          if (result[key]?.__schema) {
            schemaData = result[key];
            logger.debug(`Mutation schema data found inside '${key}' property`);
            break;
          }
        }
      }
    }
    
    if (!schemaData?.__schema) {
      logger.error('Invalid mutation schema response format', { result });
      throw new Error('Invalid schema format received from GraphQL API');
    }
    
    const fields = schemaData?.__schema?.mutationType?.fields;
    
    if (!fields) {
      logger.warn('No mutation fields found in schema or mutations not supported', { schemaData });
      return [];
    }
    
    logger.info(`Found ${fields.length} available mutations`);
    return fields;
  } catch (error) {
    logger.error('Error fetching available mutations', { error });
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
    
    // Log the raw result for debugging
    logger.debug('Raw type details result:', { 
      result: JSON.stringify(result).substring(0, 500) + '...',
      typeName 
    });
    
    // Enhanced type response structure handling
    let typeData: any;
    
    if (result?.__type) {
      typeData = result.__type;
      logger.debug(`Type data for "${typeName}" found at root level`);
    } else if (result?.data?.__type) {
      typeData = result.data.__type;
      logger.debug(`Type data for "${typeName}" found inside data property`);
    } else {
      // Try to locate type data by examining the structure
      logger.debug(`Type data structure for "${typeName}" not standard, attempting to locate it`, {
        resultKeys: Object.keys(result || {})
      });
      
      // Look for the first property that might contain type data
      if (typeof result === 'object' && result !== null) {
        for (const key of Object.keys(result)) {
          if (result[key]?.__type) {
            typeData = result[key].__type;
            logger.debug(`Type data for "${typeName}" found inside '${key}' property`);
            break;
          }
        }
      }
    }
    
    if (!typeData) {
      logger.warn(`Type "${typeName}" not found in schema or invalid response format`);
      return null;
    }
    
    logger.info(`Type details for "${typeName}" fetched successfully`);
    return typeData;
  } catch (error) {
    logger.error(`Error fetching details for type ${typeName}:`, { error });
    throw error;
  }
}

// Function to search for queries that match a search term
export async function searchQueries(searchTerm: string): Promise<any[]> {
  try {
    const allQueries = await getAvailableQueries();
    if (!searchTerm || searchTerm.trim() === '') {
      return allQueries;
    }
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Filter queries based on the search term in name or description
    const matchingQueries = allQueries.filter((q: any) => {
      const name = q.name?.toLowerCase() || '';
      const description = q.description?.toLowerCase() || '';
      
      return name.includes(normalizedSearch) || 
             description.includes(normalizedSearch);
    });
    
    logger.info(`Found ${matchingQueries.length} queries matching "${searchTerm}"`);
    return matchingQueries;
  } catch (error) {
    logger.error('Error searching queries', { error, searchTerm });
    throw error;
  }
}

// Function to search for mutations that match a search term
export async function searchMutations(searchTerm: string): Promise<any[]> {
  try {
    const allMutations = await getAvailableMutations();
    if (!searchTerm || searchTerm.trim() === '') {
      return allMutations;
    }
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Filter mutations based on the search term in name or description
    const matchingMutations = allMutations.filter((m: any) => {
      const name = m.name?.toLowerCase() || '';
      const description = m.description?.toLowerCase() || '';
      
      return name.includes(normalizedSearch) || 
             description.includes(normalizedSearch);
    });
    
    logger.info(`Found ${matchingMutations.length} mutations matching "${searchTerm}"`);
    return matchingMutations;
  } catch (error) {
    logger.error('Error searching mutations', { error, searchTerm });
    throw error;
  }
}

// Function to generate a complete query or mutation example with variables
export function generateQueryExample(
  operation: any, 
  operationType: 'query' | 'mutation'
): { queryText: string; variables: Record<string, any> } {
  if (!operation?.name) {
    return { queryText: '', variables: {} };
  }
  
  let queryText = `${operationType} ${operation.name.charAt(0).toUpperCase() + operation.name.slice(1)}`;
  const variables: Record<string, any> = {};
  
  // Process arguments if they exist
  const hasArgs = operation.args && operation.args.length > 0;
  
  // Build the argument list for the operation
  if (hasArgs) {
    queryText += buildArgumentDefinitions(operation.args, variables);
  }
  
  // Build the operation call with variables
  queryText += ` {\n  ${operation.name}`;
  
  if (hasArgs) {
    queryText += buildArgumentReferences(operation.args);
  }
  
  // Add placeholder return fields - this is simplified and would need to be enhanced
  // with actual return type information in a more complete implementation
  queryText += ` {\n    # Add required fields here\n    id\n    name\n  }\n}`;
  
  return { queryText, variables };
}

// Helper function to build GraphQL argument definitions with variables
function buildArgumentDefinitions(
  args: any[], 
  variables: Record<string, any>
): string {
  const argStrings: string[] = [];
  
  args.forEach((arg: any) => {
    // Create variable name based on argument name
    const varName = arg.name;
    
    // Add to arguments list
    argStrings.push(`$${varName}: ${getGraphQLType(arg.type)}`);
    
    // Add a placeholder value for the variable based on its type
    variables[varName] = getPlaceholderValue(arg.type);
  });
  
  return argStrings.length > 0 ? `(${argStrings.join(', ')})` : '';
}

// Helper function to build GraphQL argument references
function buildArgumentReferences(args: any[]): string {
  const paramStrings: string[] = args.map((arg: any) => `${arg.name}: $${arg.name}`);
  return paramStrings.length > 0 ? `(${paramStrings.join(', ')})` : '';
}

// Helper function to get the GraphQL type string from a type object
function getGraphQLType(typeObj: any): string {
  if (!typeObj) return 'String';
  
  // Handle non-null types
  if (typeObj.kind === 'NON_NULL') {
    return `${getGraphQLType(typeObj.ofType)}!`;
  }
  
  // Handle list types
  if (typeObj.kind === 'LIST') {
    return `[${getGraphQLType(typeObj.ofType)}]`;
  }
  
  // For named types, use the name
  return typeObj.name || 'String';
}

// Helper function to wrap a value in an array if it's a list type
function wrapListValue(value: any, isList: boolean): any {
  if (!isList) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value;
  }
  
  return [value];
}

// Helper function to generate placeholder values based on type
function getPlaceholderValue(typeObj: any): any {
  if (!typeObj) return '';
  
  const baseType = getBaseType(typeObj);
  const isList = typeObj.kind === 'LIST' || 
                (typeObj.kind === 'NON_NULL' && typeObj.ofType?.kind === 'LIST');
  
  // Generate single value based on type
  let value: any;
  switch (baseType) {
    case 'Int':
      value = 1;
      break;
    case 'Float':
      value = 1.0;
      break;
    case 'Boolean':
      value = true;
      break;
    case 'ID':
      value = 'ID1';
      break;
    default:
      value = baseType.endsWith('Input') ? {} : `${baseType}1`;
  }
  
  return wrapListValue(value, isList);
}

// Helper to get the base type name from a type object
function getBaseType(typeObj: any): string {
  if (!typeObj) return 'String';
  
  if (typeObj.name) {
    return typeObj.name;
  }
  
  if (typeObj.ofType) {
    return getBaseType(typeObj.ofType);
  }
  
  return 'String';
}

// Function to check the GraphQL server's heartbeat
export async function checkHeartbeat(): Promise<{ isAlive: boolean, response?: string, error?: string }> {
  try {
    const query = `
      query {
        _heartbeat
      }
    `;
    
    logger.info('Checking GraphQL server heartbeat...');
    const result = await executeGraphQLQuery(query);
    
    // Check if we have a heartbeat response
    if (result?._heartbeat) {
      logger.info('GraphQL server heartbeat successful', { response: result._heartbeat });
      return { isAlive: true, response: result._heartbeat };
    } else if (result?.data?._heartbeat) {
      // Some GraphQL clients wrap responses in a data property
      logger.info('GraphQL server heartbeat successful', { response: result.data._heartbeat });
      return { isAlive: true, response: result.data._heartbeat };
    } else {
      // We got a response but no heartbeat field
      logger.warn('GraphQL server responded but no heartbeat field was found', { 
        resultKeys: Object.keys(result ?? {}) 
      });
      return { 
        isAlive: false, 
        error: 'Server responded but no heartbeat field was found in the response'
      };
    }
  } catch (error: any) {
    // Log details about the error
    logger.error('Error checking GraphQL server heartbeat', { 
      error: error.message,
      statusCode: error.response?.status,
      responseBody: error.response?.error
    });
    
    return { 
      isAlive: false, 
      error: error.message ?? 'Unknown error occurred while checking server heartbeat'
    };
  }
}

// Function to explore deal funding nodes with flexible query structure
export async function exploreDealFundingNodes(dealId?: string): Promise<any> {
  try {
    // First approach: Get deal and try to explore available fields
    const dealQuery = `
      query {
        filterWileyasDeal(_first: 1${dealId ? `, biId: ["${dealId}"]` : ''}) {
          edges {
            node {
              id
              biId
              name
              description
              versionId
              versionCode
              __typename
              # Attempt to get metadata about available fields
              _dealFundingType: __type(name: "WileyasDeal") {
                fields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    logger.info('Exploring deal structure to find funding nodes');
    const dealResult = await executeGraphQLQuery(dealQuery);
    
    // Second approach: Directly query funding nodes and look for relationship to deal
    const fundingNodeQuery = `
      query {
        _fundingNodeType: __type(name: "WileyasDealFundingNode") {
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `;
    
    logger.info('Exploring funding node structure');
    const nodeResult = await executeGraphQLQuery(fundingNodeQuery);
    
    // Combine results for analysis
    return {
      dealResult,
      nodeResult,
      analysis: "This contains the raw query results to help diagnose the funding node query structure"
    };
  } catch (error) {
    logger.error('Error exploring deal funding nodes', { error });
    throw error;
  }
}

// Function to get deal information with funding nodes
export async function getDealWithFundingNodes(dealId?: string, limit: number = 5): Promise<any> {
  try {
    // Create a query to fetch deals with funding nodes
    const query = `
      query DealWithFundingNodes($dealId: [String!], $limit: Int!) {
        filterWileyasDeal(_first: $limit, biId: $dealId) {
          edges {
            node {
              id
              uid
              biId
              name
              description
              versionId
              versionCode
              dealStatus
              startDate
              endDate
              currency
              createdAt
              modifiedAt
              rootNode {
                id
                nodeId
                name
                description
              }
            }
          }
        }
        filterWileyasDealFundingNode(_first: 20) {
          edges {
            node {
              id
              uid
              versionId
              deal {
                id
                biId
                name
              }
              node {
                id
                nodeId
                name
              }
              organisation {
                id
                name
              }
              goldOA {
                id
                limit
                totalAmount {
                  amount
                  currency
                }
                remainingAmount {
                  amount
                  currency
                }
              }
              hybridOA {
                id
                limit
                totalAmount {
                  amount
                  currency
                }
                remainingAmount {
                  amount
                  currency
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      dealId: dealId ? [dealId] : undefined,
      limit
    };

    logger.info('Fetching deal with funding nodes', { dealId, limit });
    const result = await executeGraphQLQuery(query, variables);

    // Process the result to combine deal with its funding nodes
    const deals = result?.filterWileyasDeal?.edges?.map((edge: any) => edge.node) || [];
    const fundingNodes = result?.filterWileyasDealFundingNode?.edges?.map((edge: any) => edge.node) || [];

    // Map funding nodes to their respective deals
    const dealsWithFundingNodes = deals.map((deal: any) => {
      const dealFundingNodes = fundingNodes.filter((node: any) => 
        node.deal && (node.deal.id === deal.id || node.deal.biId === deal.biId)
      );
      
      return {
        ...deal,
        fundingNodes: dealFundingNodes
      };
    });

    logger.info('Successfully fetched deals with funding nodes', { 
      dealCount: deals.length,
      fundingNodeCount: fundingNodes.length
    });

    return dealsWithFundingNodes;
  } catch (error: any) {
    logger.error('Error fetching deal with funding nodes', { error: error.message, dealId });
    throw error;
  }
}

/**
 * Get author details for a specific order by its business interaction ID (biId)
 * 
 * This function attempts multiple approaches to retrieve author information
 * associated with an order, with detailed error handling.
 * 
 * @param orderBiId The business interaction ID of the order
 * @returns Author details and diagnostic information
 */
export async function getOrderAuthorDetails(orderBiId: string): Promise<any> {
  try {
    logger.info(`Attempting to retrieve author details for order ${orderBiId}`);
    
    // Try multiple approaches to find the order and its authors
    
    // Approach 1: Try through customer order first
    const customerOrderQuery = `
      query {
        orders: filterCustomerOrder(_filter: "biId = '${orderBiId}'") {
          edges {
            node {
              id
              biId
              name
              description
              prRelatedParties {
                edges {
                  node {
                    id
                    roleName
                    party {
                      id
                      name
                      email
                      description
                    }
                  }
                }
              }
              hiConsistsOf {
                id
                description
                __typename
              }
            }
          }
        }
      }
    `;
    
    logger.debug(`Executing customer order query for ${orderBiId}`);
    const customerOrderResult = await executeGraphQLQuery(customerOrderQuery).catch(err => {
      logger.warn(`Customer order query failed for ${orderBiId}`, { error: err.message });
      return null;
    });
    
    // Check if we got a valid result with order data
    const orderEdges = customerOrderResult?.orders?.edges || [];
    if (orderEdges.length > 0) {
      logger.info(`Found order ${orderBiId} as a customer order`);
      const order = orderEdges[0].node;
      
      // Extract author information from related parties
      const parties = order.prRelatedParties?.edges?.map((edge: any) => edge.node) || [];
      const authors = parties.filter((party: any) => 
        party.roleName?.toLowerCase().includes('author') || 
        party.roleName?.toLowerCase().includes('contributor')
      );
      
      return {
        success: true,
        source: 'customer_order',
        order: {
          id: order.id,
          biId: order.biId,
          name: order.name,
          description: order.description
        },
        authors: authors.map((author: any) => ({
          id: author.id,
          role: author.roleName,
          name: author.party?.name,
          email: author.party?.email,
          description: author.party?.description
        })),
        relatedParties: parties.length,
        authorCount: authors.length
      };
    }
    
    // Approach 2: Try through general order query
    const generalOrderQuery = `
      query {
        orders: filterOrder(_filter: "biId = '${orderBiId}'") {
          edges {
            node {
              id
              biId
              name
              description
              prRelatedParties {
                edges {
                  node {
                    id
                    roleName
                    party {
                      id
                      name
                      email
                      description
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    logger.debug(`Executing general order query for ${orderBiId}`);
    const generalOrderResult = await executeGraphQLQuery(generalOrderQuery).catch(err => {
      logger.warn(`General order query failed for ${orderBiId}`, { error: err.message });
      return null;
    });
    
    // Check if we got a valid result with order data
    const generalOrderEdges = generalOrderResult?.orders?.edges || [];
    if (generalOrderEdges.length > 0) {
      logger.info(`Found order ${orderBiId} as a general order`);
      const order = generalOrderEdges[0].node;
      
      // Extract author information from related parties
      const parties = order.prRelatedParties?.edges?.map((edge: any) => edge.node) || [];
      const authors = parties.filter((party: any) => 
        party.roleName?.toLowerCase().includes('author') || 
        party.roleName?.toLowerCase().includes('contributor')
      );
      
      return {
        success: true,
        source: 'general_order',
        order: {
          id: order.id,
          biId: order.biId,
          name: order.name,
          description: order.description
        },
        authors: authors.map((author: any) => ({
          id: author.id,
          role: author.roleName,
          name: author.party?.name,
          email: author.party?.email,
          description: author.party?.description
        })),
        relatedParties: parties.length,
        authorCount: authors.length
      };
    }
    
    // Approach 3: Try funding request search
    const fundingRequestQuery = `
      query {
        requests: filterWileyasFundingRequest(_filter: "order.biId = '${orderBiId}'") {
          edges {
            node {
              id
              requestId
              article {
                id
                title
              }
              authors {
                id
                firstName
                lastName
                email
                orcid
              }
              order {
                id
                biId
                name
              }
            }
          }
        }
      }
    `;
    
    logger.debug(`Executing funding request query related to order ${orderBiId}`);
    const fundingRequestResult = await executeGraphQLQuery(fundingRequestQuery).catch(err => {
      logger.warn(`Funding request query failed for ${orderBiId}`, { error: err.message });
      return null;
    });
    
    // Check if we found funding requests with author information
    const requestEdges = fundingRequestResult?.requests?.edges || [];
    if (requestEdges.length > 0) {
      logger.info(`Found funding request(s) related to order ${orderBiId}`);
      const request = requestEdges[0].node;
      
      return {
        success: true,
        source: 'funding_request',
        order: {
          id: request.order?.id,
          biId: request.order?.biId,
          name: request.order?.name
        },
        article: {
          id: request.article?.id,
          title: request.article?.title
        },
        authors: request.authors?.map((author: any) => ({
          id: author.id,
          name: `${author.firstName} ${author.lastName}`,
          email: author.email,
          orcid: author.orcid
        })) || [],
        requestId: request.requestId,
        authorCount: request.authors?.length || 0
      };
    }
    
    // If we've reached this point, we couldn't find the order or its authors
    logger.warn(`Could not find any information for order ${orderBiId}`);
    return {
      success: false,
      message: `Could not find order with biId ${orderBiId} or any associated author information`,
      attemptedApproaches: ['customer_order', 'general_order', 'funding_request']
    };
  } catch (error: any) {
    logger.error(`Error retrieving author details for order ${orderBiId}`, { 
      error: error.message,
      orderBiId
    });
    
    return {
      success: false,
      message: `Error retrieving author details: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Function specifically for retrieving a single customer order by its business interaction ID
 * Using the minimal query structure that's confirmed to work in Insomnia
 * 
 * @param biId The business interaction ID of the order to retrieve
 * @returns The customer order data or error information
 */
export async function getCustomerOrderById(biId: string): Promise<any> {
  try {
    logger.info(`Retrieving customer order with biId: ${biId}`);
    
    // Using the query with additional fields
    const query = getCustomerOrderByIdQuery;
    
    const variables = { biId };
    
    logger.debug('Executing customer order query with additional fields', { 
      biId,
      query: query.replace(/\s+/g, ' ').trim(),
      variables
    });
    
    // Use our GraphQL client to execute the query
    const result = await executeGraphQLQuery(query, variables);
    
    logger.info(`Query result for customer order ${biId}`, { 
      success: !!result?.getCustomerOrder,
      hasData: !!result
    });
    
    // Format response with diagnostic information
    return {
      success: !!result?.getCustomerOrder,
      order: result?.getCustomerOrder,
      diagnostics: {
        resultKeys: Object.keys(result ?? {}),
        errorPresent: !!result?.errors,
        errorMessage: result?.errors ? result.errors[0]?.message : null,
        rawResult: result
      }
    };
  } catch (error: any) {
    logger.error(`Error retrieving customer order ${biId}`, { 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      diagnostics: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorType: error.name,
        requestId: error.response?.headers?.['x-request-id'],
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      }
    };
  }
}

/**
 * Function to retrieve price proposal information for a specific business interaction ID
 * 
 * This function retrieves detailed price proposal information with a focus on pricing details
 * 
 * @param biId The business interaction ID of the price proposal
 * @returns Price proposal details with pricing information
 */
export async function getPriceProposalById(biId: string): Promise<any> {
  try {
    logger.info(`Retrieving price proposal with biId: ${biId}`);
    
    const variables = { biId };
    
    logger.debug(`Executing price proposal query for ${biId}`);
    const result = await executeGraphQLQuery(priceProposalQuery, variables);
    
    // Check if we found the price proposal
    const proposal = result?.getWileyasPriceProposalCustomerOrder;
    if (!proposal) {
      logger.warn(`No price proposal found with biId ${biId}`);
      return {
        success: false,
        message: `Could not find price proposal with biId ${biId}`,
        diagnostics: {
          resultKeys: Object.keys(result || {}),
          errorPresent: !!result?.errors,
          errorMessage: result?.errors ? result.errors[0]?.message : null
        }
      };
    }
    
    logger.info(`Successfully retrieved price proposal with biId ${biId}`);
    
    // Extract article information
    let articleInfo = null;
    if (proposal.hiConsistsOf && proposal.hiConsistsOf.length > 0) {
      for (const item of proposal.hiConsistsOf) {
        if (item?.biiSalable) {
          const salable = item.biiSalable;
          articleInfo = {
            title: salable.wAsArticleTitle,
            manuscriptId: salable.wAsManuscriptId,
            articleType: salable.wAsDisplayArticleType || salable.wAsBaseArticleType,
            journal: salable.ibrProduct ? {
              title: salable.ibrProduct.wAsJournalTitle,
              eissn: salable.ibrProduct.wAsJournalEISSN,
              groupCode: salable.ibrProduct.wAsJournalGroupCode
            } : null
          };
          break;
        }
      }
    }
    
    // Extract pricing details - this is the key information we want to focus on
    let pricingInfo: {
      available: boolean;
      details: null | {
        basePrice: any;
        subtotal: any;
        tax: any;
        total: any;
        price: any;
        currency: any;
        discounts: any[];
        institution: {
          id: any;
          name: any;
          type: any;
          woaCode: any;
          consortiumCode: any;
        } | null;
      };
    } = {
      available: false,
      details: null
    };
    
    if (proposal.wAsPricing?.prices) {
      const prices = proposal.wAsPricing.prices;
      
      pricingInfo = {
        available: true,
        details: {
          basePrice: prices.basePrice,
          subtotal: prices.subtotal,
          tax: prices.tax,
          total: prices.total,
          price: prices.price,
          currency: prices.currencyCode,
          
          // Format the applied discounts for better readability
          discounts: (prices.appliedDiscounts || []).map((discount: any) => ({
            code: discount.discountCode,
            type: discount.discountType,
            amount: discount.discountAmount,
            percentage: discount.discountPercentage,
            description: discount.discountDescription,
            isPercentage: discount.isPercentageDiscount,
            sapCode: discount.sapDiscountTableCode
          })),
          
          // Include institution information if available
          institution: proposal.wAsPricing.woadInstitution ? {
            id: proposal.wAsPricing.woadInstitution.institutionId,
            name: proposal.wAsPricing.woadInstitution.institutionName,
            type: proposal.wAsPricing.woadInstitution.institutionIdType,
            woaCode: proposal.wAsPricing.woadInstitution.woaCode,
            consortiumCode: proposal.wAsPricing.woadInstitution.consortiumCode
          } : null
        }
      };
    }
    
    // Return a focused response with pricing info as the priority
    return {
      success: true,
      proposal: {
        biId: proposal.biId,
        createdAt: proposal.biCreatedAt,
        paymentType: proposal.wAsPaymentType,
        paymentStatus: proposal.wPaymentStatus,
        status: proposal.bpStatus?.code,
        expiryDate: proposal.wAsExpiryDateTime,
        pricing: pricingInfo,
        article: articleInfo,
        author: proposal.wAsCorrespondingAuthor ? {
          name: `${proposal.wAsCorrespondingAuthor.firstName} ${proposal.wAsCorrespondingAuthor.lastName}`,
          email: proposal.wAsCorrespondingAuthor.email
        } : null
      }
    };
  } catch (error: any) {
    logger.error(`Error retrieving price proposal ${biId}`, { 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    return {
      success: false,
      message: `Error retrieving price proposal: ${error.message}`,
      error: {
        message: error.message,
        type: error.name
      }
    };
  }
}