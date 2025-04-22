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

export const getCustomerOrderByIdQuery  = `
query getCustomerOrder($biId: String) {
	getCustomerOrder(biId: $biId) {
		biId
		uid
		wAsOrderId
		bpStatus {
			code
		}
		wAsTaxCode
		biCreatedAt
		wPoNumber
		wAsSpecialNotes
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
`