<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# GraphQL MCP Server

This is a TypeScript implementation of a Model Context Protocol (MCP) server that connects to the GraphQL API. The server uses OAuth for authentication and provides tools for introspecting and querying the GraphQL schema.

## Architecture

- `src/index.ts` - Main entry point for the MCP server
- `src/auth.ts` - OAuth authentication utilities
- `src/graphql-client.ts` - GraphQL client for making API requests
- `src/graphql-tools.ts` - Helper functions for GraphQL operations

## Key Concepts

1. **Model Context Protocol (MCP)** - A protocol that enables AI models like Claude to interact with external tools and resources.
2. **GraphQL API** - The GraphQL API that this MCP server connects to.
3. **OAuth Authentication** - The authentication mechanism used to connect to the GraphQL API.

## Development Guidelines

- Use TypeScript best practices, including proper typing.
- Follow the MCP server patterns established in the codebase.
- When adding new GraphQL operations, ensure they're properly authenticated.
- Use the Zod library for input validation in MCP tools.

You can find more info and examples about MCP at https://modelcontextprotocol.io/llms-full.txt