
const openaiModule = require('./src/services/openaiService.ts');

async function testService() {
  try {
    console.log('Testing OpenAI service...');
    
    // Test API connection first
    console.log('Testing connection...');
    const isConnected = await openaiModule.openAIService.testConnection();
    console.log('Connection test result:', isConnected);
    
    if (isConnected) {
      console.log('Testing current month usage...');
      const usage = await openaiModule.openAIService.getCurrentMonthUsage();
      console.log('Current month usage:', usage);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testService();
