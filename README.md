# GraphQL MCP Server

This is a Model Context Protocol (MCP) server that connects to the GraphQL API and provides tools to interact with it through an LLM interface like Claude.

## Features

- OAuth authentication to the GraphQL API
- Introspection of the GraphQL schema
- Tools to query the API and view results
- Support for listing available queries and mutations
- Type information retrieval

## Setup

1. Clone this repository
2. Install dependencies:
   ```
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
   ```
   npm run build
   ```
5. Start the server:
   ```
   npm start
   ```

## Available Tools

### execute-query

Execute any GraphQL query against the API.

```
{
  "query": "your GraphQL query goes here",
  "variables": { "optionalVariables": "go here" }
}
```

### get-schema

Get information about the GraphQL schema.

```
{
  "typeName": "optional type name to filter by",
  "fieldName": "optional field name to filter by",
  "includeQueries": true,
  "includeMutations": true
}
```

### list-queries

List all available queries in the GraphQL API with their descriptions and arguments.

### list-mutations

List all available mutations in the GraphQL API with their descriptions and arguments.

### type-details

Get detailed information about a specific GraphQL type.

```
{
  "typeName": "name of the GraphQL type"
}
```

## VS Code Integration

This project includes a `.vscode/mcp.json` file that enables you to run the MCP server directly from VS Code when using compatible extensions.

## Development

To run in development mode with automatic reloading:

```
npm install -g nodemon
npm run dev
```