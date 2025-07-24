// Reusable GraphQL fragments

// Fragment for basic business interaction fields
export const businessInteractionFragment = `
  fragment BusinessInteractionFields on BusinessInteraction {
    id
    biId
    name
    description
    type
    versionId
    versionCode
    createdAt
    modifiedAt
  }
`;

// Fragment for party fields
export const partyFragment = `
  fragment PartyFields on ViaxIndividual {
    id
    uid
    paId
    wAlmId
    wAuthorID
    wEmail
    wSAPId
    wAsOrganization
    wAsInstitution
    wAsDepartment
  }
`;

// Fragment for address fields
export const addressFragment = `
  fragment AddressFields on Address {
    upaLine1
    upaLine2
    upaCity
    gadStateOrProvince
    gadCountry {
      iso2Code
      name
    }
    upaPostcode
    upaPhoneNumber
    upaEmail
  }
`;

// Fragment for price fields
export const priceFragment = `
  fragment PriceFields on Price {
    amount
    currency
  }
`;

// Fragment for funding node fields
export const fundingNodeFragment = `
  fragment FundingNodeFields on FundingNode {
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
        ...PriceFields
      }
    }
    hybridOA {
      totalAmount {
        ...PriceFields
      }
    }
  }
`; 