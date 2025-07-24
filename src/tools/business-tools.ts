import {
  getDealWithFundingNodes,
  getOrderAuthorDetails,
  getCustomerOrderById,
  getPriceProposalById
} from '../graphql-tools.js';
import logger from '../logger.js';
import {
  McpTool,
  DealWithFundingNodesParams,
  OrderAuthorDetailsParams,
  CustomerOrderParams,
  PriceProposalParams,
  dealWithFundingNodesSchema,
  orderAuthorDetailsSchema,
  customerOrderSchema,
  priceProposalSchema
} from './types.js';
import {
  createErrorResponse,
  createSuccessResponse,
  createJsonResponse,
  logToolExecution
} from './helpers.js';

// Tool to get deal information with funding nodes
export const getDealWithFundingNodesTool: McpTool = {
  name: 'get-deal-with-funding-nodes',
  description: 'Get detailed information about a deal including its associated funding nodes',
  parameters: dealWithFundingNodesSchema,
  handler: async ({ dealId, limit }: DealWithFundingNodesParams) => {
    try {
      logToolExecution('get-deal-with-funding-nodes', { dealId, limit });
      
      const dealsWithFundingNodes = await getDealWithFundingNodes(dealId, limit);
      
      if (dealsWithFundingNodes.length === 0) {
        logger.warn('No deals found', { dealId });
        return createErrorResponse(
          dealId 
            ? `No deal found with ID "${dealId}".` 
            : 'No deals found in the system.'
        );
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
      
      return createJsonResponse(
        formattedResponse,
        `Found ${dealsWithFundingNodes.length} deal(s) with funding information:`
      );
    } catch (error: any) {
      logger.error('Error retrieving deals with funding nodes', { error: error.message, dealId });
      return createErrorResponse(
        `Error retrieving deals with funding nodes: ${error.message}`,
        'This could be due to an issue with the GraphQL API or structure changes in the API.'
      );
    }
  }
};

// Tool to get author details for a specific order
export const getOrderAuthorDetailsTool: McpTool = {
  name: 'get-order-author-details',
  description: 'Get detailed information about authors associated with a specific order',
  parameters: orderAuthorDetailsSchema,
  handler: async ({ orderBiId }: OrderAuthorDetailsParams) => {
    try {
      logToolExecution('get-order-author-details', { orderBiId });
      
      const result = await getOrderAuthorDetails(orderBiId);
      
      if (!result.success) {
        return createErrorResponse(
          result.message,
          result.attemptedApproaches ? `Attempted approaches: ${result.attemptedApproaches}` : undefined
        );
      }
      
      // Format the response for better readability
      const formattedResponse = formatOrderAuthorsResponse(result.data);
      
      return createSuccessResponse(formattedResponse);
    } catch (error: any) {
      logger.error('Error retrieving order author details', { error: error.message, orderBiId });
      return createErrorResponse(
        `Error retrieving order author details: ${error.message}`,
        'This could be due to an issue with the GraphQL API or authentication problems.'
      );
    }
  }
};

// Tool to get customer order details
export const getCustomerOrderTool: McpTool = {
  name: 'get-customer-order',
  description: 'Get detailed information about a customer order using the exact query format that works in Insomnia',
  parameters: customerOrderSchema,
  handler: async ({ biId }: CustomerOrderParams) => {
    try {
      logToolExecution('get-customer-order', { biId });
      
      const orderDetails = await getCustomerOrderById(biId);
      
      if (!orderDetails) {
        logger.warn('Customer order not found', { biId });
        return createErrorResponse(`Customer order with ID "${biId}" not found.`);
      }
      
      // Format the response for better readability
      const formattedResponse = formatCustomerOrderResponse(orderDetails);
      
      return createSuccessResponse(formattedResponse);
    } catch (error: any) {
      logger.error('Error retrieving customer order', { error: error.message, biId });
      return createErrorResponse(
        `Error retrieving customer order: ${error.message}`,
        'This could be due to an issue with the GraphQL API or the order ID format.'
      );
    }
  }
};

// Tool to get price proposal details
export const getPriceProposalTool: McpTool = {
  name: 'get-price-proposal',
  description: 'Get detailed information about a price proposal including pricing tiers and related parties',
  parameters: priceProposalSchema,
  handler: async ({ biId }: PriceProposalParams) => {
    try {
      logToolExecution('get-price-proposal', { biId });
      
      const proposal = await getPriceProposalById(biId);
      
      if (!proposal) {
        logger.warn('Price proposal not found', { biId });
        return createErrorResponse(`Price proposal with ID "${biId}" not found.`);
      }
      
      // Format the response for better readability
      const formattedResponse = formatPriceProposalResponse(proposal);
      
      return createSuccessResponse(formattedResponse);
    } catch (error: any) {
      logger.error('Error retrieving price proposal', { error: error.message, biId });
      return createErrorResponse(
        `Error retrieving price proposal: ${error.message}`,
        'This could be due to an issue with the GraphQL API or the proposal ID format.'
      );
    }
  }
};

// Helper function to format order authors response
function formatOrderAuthorsResponse(data: any): string {
  if (!data || !data.order) {
    return 'No order data available in the response.';
  }
  
  const order = data.order;
  let formattedResponse = `# Order Author Details for Order ${order.biId ?? 'Unknown'}\n\n`;
  
  // Basic order information
  formattedResponse += `## Order Information\n`;
  formattedResponse += `- **Order ID**: ${order.biId ?? 'N/A'}\n`;
  formattedResponse += `- **UID**: ${order.uid ?? 'N/A'}\n`;
  formattedResponse += `- **Created At**: ${order.createdAt ?? 'N/A'}\n`;
  formattedResponse += `- **Modified At**: ${order.modifiedAt ?? 'N/A'}\n\n`;
  
  // Related parties (authors)
  if (order.prRelatedParties?.edges && order.prRelatedParties.edges.length > 0) {
    formattedResponse += `## Related Authors (${order.prRelatedParties.edges.length})\n\n`;
    
    order.prRelatedParties.edges.forEach((edge: any, index: number) => {
      const party = edge.node;
      const mapping = edge.mapsOn;
      
      formattedResponse += `### Author ${index + 1}\n`;
      formattedResponse += `- **Mapping Code**: ${mapping?.code ?? 'N/A'}\n`;
      formattedResponse += `- **Party ID**: ${party?.paId ?? 'N/A'}\n`;
      formattedResponse += `- **UID**: ${party?.uid ?? 'N/A'}\n`;
      formattedResponse += `- **ALM ID**: ${party?.wAlmId ?? 'N/A'}\n`;
      formattedResponse += `- **Author ID**: ${party?.wAuthorID ?? 'N/A'}\n`;
      formattedResponse += `- **Email**: ${party?.wEmail ?? 'N/A'}\n`;
      formattedResponse += `- **SAP ID**: ${party?.wSAPId ?? 'N/A'}\n`;
      formattedResponse += `- **Organization**: ${party?.wAsOrganization ?? 'N/A'}\n`;
      formattedResponse += `- **Institution**: ${party?.wAsInstitution ?? 'N/A'}\n`;
      formattedResponse += `- **Department**: ${party?.wAsDepartment ?? 'N/A'}\n\n`;
    });
  } else {
    formattedResponse += `## Related Authors\nNo related authors found for this order.\n\n`;
  }
  
  // Include raw data for reference
  formattedResponse += `## Complete Raw Data\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  
  return formattedResponse;
}

// Helper function to format customer order response
function formatCustomerOrderResponse(order: any): string {
  let formattedResponse = `# Customer Order Details: ${order.biId ?? 'Unknown'}\n\n`;
  
  // Basic order information
  formattedResponse += `## Order Information\n`;
  formattedResponse += `- **Business ID**: ${order.biId ?? 'N/A'}\n`;
  formattedResponse += `- **UID**: ${order.uid ?? 'N/A'}\n`;
  formattedResponse += `- **Status**: ${order.wStatus ?? 'N/A'}\n`;
  formattedResponse += `- **Payment Status**: ${order.wPaymentStatus ?? 'N/A'}\n`;
  formattedResponse += `- **SAP Order ID**: ${order.wAsSapOrderId ?? 'N/A'}\n`;
  formattedResponse += `- **Created At**: ${order.createdAt ?? 'N/A'}\n`;
  formattedResponse += `- **Modified At**: ${order.modifiedAt ?? 'N/A'}\n\n`;
  
  // Payment information
  if (order.paybPayment) {
    formattedResponse += `## Payment Information\n`;
    formattedResponse += `- **Payment Type**: ${order.paybPayment.typeName ?? 'N/A'}\n`;
    if (order.paybPayment.ccpaCardType) {
      formattedResponse += `- **Card Type**: ${order.paybPayment.ccpaCardType}\n`;
    }
    if (order.paybPayment.ccpaNameOnCard) {
      formattedResponse += `- **Name on Card**: ${order.paybPayment.ccpaNameOnCard}\n`;
    }
    formattedResponse += '\n';
  }
  
  // Billing address
  if (order.paybBillingAddress) {
    formattedResponse += `## Billing Address\n`;
    const addr = order.paybBillingAddress;
    formattedResponse += `- **Address Line 1**: ${addr.upaLine1 ?? 'N/A'}\n`;
    formattedResponse += `- **Address Line 2**: ${addr.upaLine2 ?? 'N/A'}\n`;
    formattedResponse += `- **City**: ${addr.upaCity ?? 'N/A'}\n`;
    formattedResponse += `- **State/Province**: ${addr.gadStateOrProvince ?? 'N/A'}\n`;
    formattedResponse += `- **Country**: ${addr.gadCountry?.name ?? 'N/A'} (${addr.gadCountry?.iso2Code ?? 'N/A'})\n`;
    formattedResponse += `- **Postal Code**: ${addr.upaPostcode ?? 'N/A'}\n`;
    formattedResponse += `- **Phone**: ${addr.upaPhoneNumber ?? 'N/A'}\n`;
    formattedResponse += `- **Email**: ${addr.upaEmail ?? 'N/A'}\n\n`;
  }
  
  // Include raw data for reference
  formattedResponse += `## Complete Raw Data\n\n\`\`\`json\n${JSON.stringify(order, null, 2)}\n\`\`\``;
  
  return formattedResponse;
}

// Helper function to format price proposal response
function formatPriceProposalResponse(proposal: any): string {
  let formattedResponse = `# Price Proposal Details: ${proposal.biId ?? 'Unknown'}\n\n`;
  
  // Basic proposal information
  formattedResponse += `## Proposal Information\n`;
  formattedResponse += `- **Business ID**: ${proposal.biId ?? 'N/A'}\n`;
  formattedResponse += `- **Name**: ${proposal.name ?? 'N/A'}\n`;
  formattedResponse += `- **Description**: ${proposal.description ?? 'N/A'}\n`;
  formattedResponse += `- **Type**: ${proposal.type ?? 'N/A'}\n`;
  formattedResponse += `- **Version ID**: ${proposal.versionId ?? 'N/A'}\n`;
  formattedResponse += `- **Version Code**: ${proposal.versionCode ?? 'N/A'}\n`;
  formattedResponse += `- **Created At**: ${proposal.createdAt ?? 'N/A'}\n`;
  formattedResponse += `- **Modified At**: ${proposal.modifiedAt ?? 'N/A'}\n\n`;
  
  formattedResponse += formatPriceTiersSection(proposal.priceTiers);
  formattedResponse += formatRelatedPartiesSection(proposal.parties);
  formattedResponse += formatRelatedBusinessInteractionsSection(proposal.relatedBusinessInteractions);
  
  // Include raw data in JSON format for reference
  formattedResponse += `## Complete Data (JSON)\n\n\`\`\`json\n${JSON.stringify(proposal, null, 2)}\n\`\`\``;
  
  return formattedResponse;
}

// Helper function to format price tiers section
function formatPriceTiersSection(priceTiers: any[] | undefined): string {
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
function formatRelatedPartiesSection(parties: any[] | undefined): string {
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
function formatRelatedBusinessInteractionsSection(interactions: any[] | undefined): string {
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