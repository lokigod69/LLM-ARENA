/**
 * API Configuration Verification Script
 * Run this script to verify API configuration without making actual API calls
 */

import { verifyApiConfiguration } from '../lib/verify-api-config';

// Run verification
console.log('🔍 Starting API Configuration Verification...');
const results = verifyApiConfiguration();

// Exit with status code based on configuration
if (results.mockMode) {
  console.log('⚠️ Warning: Mock mode is enabled. Set MOCK_MODE=false in .env.local to use real APIs.');
  process.exit(1);
} else if (results.missingKeys.length > 0) {
  console.log('⚠️ Warning: Some API keys are missing. Please check your .env.local file.');
  process.exit(1);
} else {
  console.log('✅ API Configuration is valid and ready for real API calls.');
  process.exit(0);
} 