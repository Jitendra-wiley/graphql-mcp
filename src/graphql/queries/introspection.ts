// Standard GraphQL introspection queries

// Full schema introspection query
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

// Query to get available queries from schema
export const getAvailableQueriesQuery = `
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

// Query to get available mutations from schema
export const getAvailableMutationsQuery = `
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

// Query to get specific type details
export const getTypeDetailsQuery = `
  query GetTypeDetails($typeName: String!) {
    __schema {
      types {
        kind
        name
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
            }
          }
        }
      }
    }
  }
`;

// Simple heartbeat query
export const heartbeatQuery = `
  query {
    _heartbeat
  }
`; 