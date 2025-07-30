// Business-related GraphQL queries

// Query to get deals with funding nodes
export const getDealWithFundingNodesQuery = `
  query GetDealWithFundingNodes($limit: Int = 5) {
    filterWileyasDeal(_first: $limit) {
      edges {
        node {
          id
          biId
          biName
          biDescription
          versionId
          versionCode
          dealStatus
          startDate
          endDate
          currency
          createdAt
          modifiedAt
          allFundingNodes {
            id
            versionId
            node {
              name
            }
            organisation {
              paName
            }
          }
        }
      }
    }
  }
`;

// Query to get customer order by ID
export const getCustomerOrderByIdQuery = `
query GetCustomerOrder($biId: String!) {
	filterCustomerOrder(biId: [$biId]) {
		edges {
			node {
				uid
				biId
				bpStatus {
					name
				}
				paybPayment {
					typeName
					... on CreditCardPayment {
						ccpaCardType
						wAsCcToken
						ccpaNameOnCard
						ccpaCardNumber
						ccpaExpirationDate
						wAuthCode
					}
				}

				wPaymentStatus
				wDiscountType # Not mapped inside ORDERS05
				wDiscountCode
				pricPrice {
					edges {
						mapsOn {
							code
						}
						node {
							amount
							units {
								code
							}
						}
					}
				}

				prRelatedParties {
					edges {
						mapsOn {
							code
						}
						node {
							id
							uid
							... on ViaxIndividual {
								paId
								wAlmId
								wAuthorID
								wEmail
								wSAPId
								wAsOrganization
								wAsInstitution
								wAsDepartment
							}
						}
					}
				}
				# Credit Card
				paybPayment {
					typeName
					... on StripeCustomerCreditCardPayment {
						ccpaCardType
						wAsCcToken
						ccpaNameOnCard
						ccpaCardNumber
						ccpaExpirationDate
						wAuthCode
					}
				}
				paybBillingAddress {
					# Kafka.Address.streetAddress
					upaLine1
					# Kafka.Address.streetAddress
					upaLine2
					# Kafka.Address.city
					upaCity
					# Kafka.Address.regionCode
					gadStateOrProvince
					gadCountry {
						# Kafka.Address.countryCode
						iso2Code
						# Kafka.Address.country
						# no need to set this every time as it will update the name of a single instance
						# of the Country identified by the unique iso2Codez attribute
						name
					}
					# Kafka.Address.postalCode
					upaPostcode
					# Kafka.Address.phoneNumber
					upaPhoneNumber
					# Kafka.Address.email
					upaEmail
				}

				wTaxExemptionCertificate {
					# Not mapped inside ORDERS05
					# Kafka.Order.taxExemptionNumber
					texcId
					texcValidFor {
						# Kafka.Order.taxExemptionExpirationDate
						end
					}
				}
				# Kafka.Order.vatIdNumber
				wVatIdNumber
				wAsAuthorCountry {
					# Not mapped inside ORDERS05
					# Kafka.Order.countryCode
					iso2Code
					name
				}
				wAsPromoCode # Not mapped inside ORDERS05
				wAsSapOrderId
				wAsPayload
				wAsUpdatedOrder

				hiConsistsOf {
					uid
					typeName
					biiSalable {
						typeName
						... on ViaxConfigurableSalableInstalledBaseRecord {
							wAsSubmissionId
							maId
							ibrProduct {
								uid
								maId
							}
							wAsArticleId
							wAsArticleDoi
							wAsArticleIdentifier
							wAsArticleTitle
							wAsDhId
							wAsManuscriptId
						}
					}
					biiQuantity {
						amount
						units {
							code
						}
					}
				}
				biRelatesTo(_mapsOn: { code: "BILL" }) {
					edges {
						node {
							uid
						}
					}
				}
			}
		}
	}
}
`;

// Query to get price proposal by ID
export const priceProposalQuery = `
  query GetPriceProposal($biId: String!) {
    filterWileyasPriceProposalCustomerOrder(biId: [$biId]) {
      edges {
        node {
          id
          biId
          biName
          biDescription
          wAsWoaCode
          createdAt
          modifiedAt
          pricPrice {
            edges {
              node {
                amount
                units {
                  code
                }
              }
            }
          }
          prRelatedParties {
            edges {
              node {
                id
                uid
                ... on ViaxIndividual {
                  paId
                  wAlmId
                  wAuthorID
                  wEmail
                  wSAPId
                  wAsOrganization
                  wAsInstitution
                  wAsDepartment
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Query to get order author details
export const getOrderAuthorDetailsQuery = `
  query GetOrderAuthorDetails($orderBiId: String!) {
    filterCustomerOrder(biId: [$orderBiId]) {
      edges {
        node {
          id
          biId
          uid
          createdAt
          modifiedAt
          prRelatedParties {
            edges {
              mapsOn {
                code
              }
              node {
                id
                uid
                ... on ViaxIndividual {
                  paId
                  wAlmId
                  wAuthorID
                  wEmail
                  wSAPId
                  wAsOrganization
                  wAsInstitution
                  wAsDepartment
                }
              }
            }
          }
        }
      }
    }
  }
`; 