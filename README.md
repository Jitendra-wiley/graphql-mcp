# GraphQL MCP Server

This is a Model Context Protocol (MCP) server that connects to the GraphQL API and provides tools to interact with it through an LLM interface like Claude.

## Features

- OAuth authentication to the GraphQL API
- Introspection of the GraphQL schema
- Tools to query the API and view results
- Support for listing available queries and mutations
- Type information retrieval
- **Optimized modular architecture** with separated concerns
- **Business-specific tools** for deals, orders, and price proposals
- **Standardized error handling** with helpful suggestions

## Project Structure

The project has been refactored from a monolithic structure into a well-organized, maintainable architecture:

```
src/
├── tools/                          # MCP Tools (organized by category)
│   ├── index.ts                    # Main tools export file
│   ├── types.ts                    # All tool types and Zod schemas
│   ├── helpers.ts                  # Common helper functions
│   ├── schema-tools.ts             # Schema introspection tools
│   ├── query-tools.ts              # Query execution tools  
│   └── business-tools.ts           # Business-specific tools
├── graphql/                        # GraphQL operations (organized)
│   ├── index.ts                    # Main GraphQL exports
│   ├── queries/
│   │   ├── index.ts                # Query exports
│   │   ├── introspection.ts        # Schema introspection queries
│   │   └── business.ts             # Business domain queries
│   ├── mutations/
│   │   └── index.ts                # Mutation exports (ready for future)
│   └── fragments.ts                # Reusable GraphQL fragments
├── graphql-tools.ts                # GraphQL operation handlers
├── graphql-client.ts               # GraphQL client and authentication
├── auth.ts                         # OAuth authentication
├── logger.ts                       # Logging configuration
└── index.ts                        # Main server entry point
```

## Key Improvements

### **Modular Architecture**
- **Separated concerns**: Tools, GraphQL operations, and utilities are organized logically
- **Reduced complexity**: Main files now average 150 lines vs. 1325 lines
- **Better maintainability**: Single responsibility principle applied throughout

### **Organized GraphQL Operations**
- **Queries separated from mutations**: Clear distinction between read and write operations
- **Business domain queries**: Dedicated files for specific business logic
- **Reusable fragments**: Common GraphQL patterns extracted for reuse

### **Enhanced Developer Experience**
- **Consistent error handling**: Standardized error responses with helpful suggestions
- **Type safety**: Centralized Zod schemas for parameter validation
- **Better logging**: Structured logging with contextual information

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your `.env` file has the correct OAuth credentials:
   ```
   CLIENT_SECRET=your-client-secret
   CLIENT_ID=your-client-id
   AUTH_URL=your-auth-url
   GRAPHQL_URL=your-graphql-url
   ```
4. Build the TypeScript code:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```

## Available Tools

### Core Tools

#### `execute-query`
Execute any GraphQL query against the API with optional validation.

```json
{
  "query": "your GraphQL query goes here",
  "variables": { "optionalVariables": "go here" },
  "validateOnly": false
}
```

#### `get-schema`
Get information about the GraphQL schema with filtering options.

```json
{
  "typeName": "optional type name to filter by",
  "fieldName": "optional field name to filter by",
  "includeQueries": true,
  "includeMutations": true
}
```

#### `list-queries`
List all available queries in the GraphQL API with search and example generation.

```json
{
  "search": "optional search term",
  "generateExample": false,
  "limit": 50
}
```

#### `list-mutations`
List all available mutations in the GraphQL API with search and example generation.

```json
{
  "search": "optional search term",
  "generateExample": false,
  "limit": 50
}
```

#### `type-details`
Get detailed information about a specific GraphQL type.

```json
{
  "typeName": "name of the GraphQL type"
}
```

#### `generate-query`
Generate a GraphQL query or mutation template with variables.

```json
{
  "operationName": "getCustomerOrder",
  "operationType": "query"
}
```

#### `check-heartbeat`
Check if the GraphQL server is alive and responding.

```json
{}
```

### Business Tools

#### `get-deal-with-funding-nodes`
Get detailed information about deals including their associated funding nodes.

```json
{
  "dealId": "optional deal ID",
  "limit": 5
}
```

#### `get-order-author-details`
Get detailed information about authors associated with a specific order.

```json
{
  "orderBiId": "3202523"
}
```

#### `get-customer-order`
Get detailed information about a customer order.

```json
{
  "biId": "3202460"
}
```

#### `get-price-proposal`
Get detailed information about a price proposal including pricing tiers and related parties.

```json
{
  "biId": "7204297"
}
```

## Development

### Running in Development Mode

To run in development mode with automatic reloading:

```bash
npm install -g nodemon
npm run dev
```

### Adding New Tools

1. **Add types** to `src/tools/types.ts`
2. **Implement tool** in appropriate category file:
   - `schema-tools.ts` for schema-related tools
   - `query-tools.ts` for query execution tools
   - `business-tools.ts` for business domain tools
3. **Export** from `src/tools/index.ts`
4. **Register** in `src/index.ts`

### Adding New Queries

1. **Add query** to appropriate file in `src/graphql/queries/`:
   - `introspection.ts` for schema queries
   - `business.ts` for business domain queries
2. **Export** from `src/graphql/queries/index.ts`
3. **Use** in tools or graphql-tools.ts

### Adding Mutations

1. **Create mutation** files in `src/graphql/mutations/`
2. **Export** from `src/graphql/mutations/index.ts`
3. **Implement** corresponding tools

## Architecture Benefits

### **Maintainability**
- **Single responsibility**: Each file has one clear purpose
- **Easy to extend**: Follow established patterns for new features
- **Clear dependencies**: Explicit imports and exports

### **Performance**
- **Better tree-shaking**: Unused code can be eliminated
- **Reduced memory footprint**: Smaller individual modules
- **Faster compilation**: TypeScript processes smaller files more efficiently

### **Developer Experience**
- **Better IDE support**: Improved intellisense and code completion
- **Easier navigation**: Find code faster with logical organization
- **Focused code reviews**: Changes isolated to specific areas

## VS Code Integration

This project includes a `.vscode/mcp.json` file that enables you to run the MCP server directly from VS Code when using compatible extensions.

## Migration Notes

The refactoring maintains **full backward compatibility**:
- All existing tool registrations work unchanged
- Same API interfaces maintained
- Existing imports continue to work
- Legacy files converted to simple re-export wrappers

## File Size Comparison

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **serverTools.ts** | 1,325 lines | 5 lines (wrapper) | 99% reduction |
| **Average file size** | 1,325 lines | ~150 lines | Much more manageable |
| **Code organization** | Monolithic | Modular | Better maintainability |
| **Total organized code** | N/A | ~1,100 lines | Well-structured modules |

The refactoring successfully transforms a monolithic structure into a well-organized, maintainable codebase while preserving all functionality and maintaining backward compatibility.