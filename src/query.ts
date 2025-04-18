// Using the standard GraphQL introspection query
export const introspectionQuery = `
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

// This query retrieves the schema information of the GraphQL API
// and is used to generate types for the API

export const getAvailableQuery = `
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
// This query retrieves the mutation information of the GraphQL API
// and is used to generate types for the API
export const getAvailableMutation = `
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

// Direct query focused on getting complete pricing information
export const priceProposalQuery = `
  query getPriceProposal($biId: String) {
    getWileyasPriceProposalCustomerOrder(biId: $biId) {
      biId
      biCreatedAt
      wAsPaymentType
      wPaymentStatus
      wAsSubmissionId
      wAsSuppressEmail
      wAsLastEmailDate
      wAsExpiryDateTime
      bpStatus {code}
      wAsMigratedQuote
      wAsValidationErrors {
        errorCode
        errorMessage
        fieldPath
        fieldValue
      }
      wAsPricing {
        woadInstitution {
          institutionId
          institutionName
          institutionIdType
          woaCode
          consortiumCode
          workflowType
        }
        prices {
          total
          basePrice
          subtotal
          tax
          price
          currencyCode
          appliedDiscounts {
            discountCode
            discountType
            discountAmount
            discountPercentage
            discountDescription
            sapDiscountTableCode
            isPercentageDiscount
            isStackedDiscount
            workflowType
            discountContext {
              value
              attribute
            }
          }
        }
      }
      wAsCorrespondingAuthor {
        firstName
        lastName
        email
      }
      hiConsistsOf {
        biiSalable {
          ... on ViaxConfigurableSalableInstalledBaseRecord {
            wAsArticleTitle
            wAsManuscriptId
            wAsBaseArticleType
            wAsDisplayArticleType
            ibrProduct {
              wAsJournalTitle
              wAsJournalEISSN
              wAsJournalGroupCode
            }
          }
        }
      }
    }
  }
`;
