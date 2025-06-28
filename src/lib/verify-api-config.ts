/**
 * API Configuration Verification
 * This file contains functions to verify API configuration without making actual API calls
 */

import { MODEL_CONFIGS } from './orchestrator';

type ModelConfig = {
  provider: string;
  endpoint: string;
  modelName: string;
  maxTokens: number;
  apiKeyEnv: string;
  costPer1kTokens: { input: number; output: number };
};

export function verifyApiConfiguration() {
  const results = {
    mockMode: false,
    configuredModels: [] as string[],
    missingKeys: [] as string[],
    errors: [] as string[]
  };

  // Check if mock mode is enabled
  const mockMode = process.env.MOCK_MODE === 'true';
  results.mockMode = mockMode;

  // Check each model's configuration
  Object.entries(MODEL_CONFIGS).forEach(([modelName, config]) => {
    const typedConfig = config as ModelConfig;
    const apiKey = process.env[typedConfig.apiKeyEnv];
    
    if (apiKey && !apiKey.includes('PLACEHOLDER')) {
      results.configuredModels.push(modelName);
    } else {
      results.missingKeys.push(typedConfig.apiKeyEnv);
    }
  });

  // Generate verification report
  console.log('🔍 API Configuration Verification Report:');
  console.log('----------------------------------------');
  console.log(`Mock Mode: ${results.mockMode ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('\nConfigured Models:');
  results.configuredModels.forEach(model => {
    console.log(`✅ ${model}`);
  });
  
  if (results.missingKeys.length > 0) {
    console.log('\nMissing API Keys:');
    results.missingKeys.forEach(key => {
      console.log(`❌ ${key}`);
    });
  }

  return results;
}

// Export a function to check if a specific model is properly configured
export function isModelConfigured(modelName: string): boolean {
  const config = MODEL_CONFIGS[modelName as keyof typeof MODEL_CONFIGS] as ModelConfig;
  if (!config) return false;
  
  const apiKey = process.env[config.apiKeyEnv];
  return Boolean(apiKey && !apiKey.includes('PLACEHOLDER'));
} 