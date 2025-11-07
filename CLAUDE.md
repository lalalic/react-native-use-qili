# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview

This is a React Native/Expo utility library for integrating with the Qili service. It provides components, cloud modules, and tools for various features including AI prediction capabilities, in-app purchases (IAP), event logging, and web proxy functionality.

## Key Components

### Main API
- `useQili()` - The main entry point for initializing the Qili service with API key and URL configuration

### Cloud Modules
- `cloud/expo-updates` - Handle Expo updates
- `cloud/graphql-proxy` - Create GraphQL proxy modules
- `cloud/predict` - AI prediction functionality with chatflow support
- `cloud/iap` - Apple IAP (In-App Purchase) handling
- `cloud/events` - Event logging capabilities

### Components
- `predict` - AI chat component with event handling capabilities
- `Loading` - Loading indicator component
- `Login` - Login functionality
- `ChatProvider` - Chat provider implementation
- `default-style` - Default styling components
- `provider-web` - Web provider implementations
- `makeQiliService` - Service creation utilities

## Development Commands

### Building and Testing
- `npm test` - Run tests using Jest
- `npm run prepublish` - Prepublish script that processes chrome extension services

### Development Environment Setup
- Requires React Native 0.69.9, Expo 46.0.16, and React 18.0.0
- Uses various Expo modules like expo-constants, expo-linking, expo-updates
- Includes support for various optional dependencies including react-native-iap, react-native-webview, and others

### Scripts
- `qili-export-updates` - Create updates manifest and upload
- `qili-get-session-token` - Get session token for app
- `qili-get-access-token` - Generate access token for type and name
- `qili-screenshots` - Convert images for devices

## Architecture Notes

This codebase is organized into several key areas:
1. Core library exports (index.js)
2. Cloud modules for Qili services (cloud/)
3. React Native components (components/)
4. Scripts and CLI tools (scripts/)
5. Bridge for Chrome extensions (bridge-chrome-extension/)

The library supports both React Native and web environments, with specific implementations for each platform.

## Key Features

- AI prediction capabilities through chatflow integration
- In-app purchase support for Apple IAP
- Event logging and tracking
- Web proxy functionality for API access
- Expo updates integration