// Business-related GraphQL queries

// Query to get deals with funding nodes
export const getDealWithFundingNodesQuery = `
  query GetDealWithFundingNodes($dealId: String, $limit: Int = 5) {
    deals(filter: { biId: $dealId }, first: $limit) {
      edges {
        node {
          id
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
          fundingNodes {
            id
            versionId
            node {
              name
            }
            organisation {
              name
            }
            goldOA {
              totalAmount {
                amount
                currency
              }
            }
            hybridOA {
              totalAmount {
                amount
                currency
              }
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
	orders(where: {biId: {equals: $biId}}) {
		uid
		biId
		wStatus
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
`;

// Query to get price proposal by ID
export const priceProposalQuery = `
  query GetPriceProposal($biId: String!) {
    priceProposals(filter: { biId: $biId }) {
      edges {
        node {
          id
          biId
          name
          description
          type
          versionId
          versionCode
          createdAt
          modifiedAt
          priceTiers {
            id
            name
            description
            price {
              amount
              currency
            }
            quantity
            tierType
          }
          parties {
            role
            party {
              id
              name
              partyType
            }
          }
          relatedBusinessInteractions {
            id
            biId
            name
            description
            type
          }
        }
      }
    }
  }
`;

// Query to get order author details
export const getOrderAuthorDetailsQuery = `
  query GetOrderAuthorDetails($orderBiId: String!) {
    orders(filter: { biId: $orderBiId }) {
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