import React, { useState } from 'react';
import { openAIService } from '../services/openaiService';
import { useAuth } from '../contexts/AuthContext';

interface TestResult {
  success: boolean;
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
}

const OpenAITestComponent: React.FC = () => {
  const { user } = useAuth();
  const [isConfigured] = useState(openAIService.isConfigured());
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testInput, setTestInput] = useState('Hello, can you help me with my studies?');

  const testOpenAIConnection = async () => {
    if (!user) {
      setTestResult({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Test the OpenAI API
      const response = await openAIService.createChatCompletion([
        {
          role: 'system',
          content: 'You are a helpful educational assistant. Keep responses brief and friendly.'
        },
        {
          role: 'user',
          content: testInput
        }
      ]);

      const cost = openAIService.calculateCost(response.usage, 'gpt-3.5-turbo');

      setTestResult({
        success: true,
        message: `✅ OpenAI API working! Response: "${response.content}"`,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          cost
        }
      });

      // Example: Save token usage (you would normally associate this with a real message and student)
      console.log('Token usage:', response.usage);
      console.log('Estimated cost:', cost);

    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCurrentMonthUsage = async () => {
    if (!user) return;

    try {
      const usage = await openAIService.getCurrentMonthUsage();
      console.log('Current month usage:', usage);

      setTestResult({
        success: true,
        message: `📊 Current month usage: ${usage.totalTokens} total tokens (${usage.inputTokens} input + ${usage.outputTokens} output), ${usage.totalRequests} requests, $${usage.estimatedCost.toFixed(4)} cost`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Usage stats error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  if (!isConfigured) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fed7d7',
        border: '1px solid #fc8181',
        borderRadius: '8px',
        margin: '1rem 0'
      }}>
        <h3 style={{ color: '#c53030', margin: '0 0 0.5rem 0' }}>⚠️ OpenAI Not Configured</h3>
        <p style={{ margin: 0, color: '#742a2a' }}>
          Please set your OpenAI API key in the environment variables:
          <br />
          <code>VITE_OPENAI_API_KEY=your_api_key_here</code>
          <br />
          <code>VITE_OPENAI_ORG_ID=your_org_id_here</code> (optional)
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      margin: '1rem 0'
    }}>
      <h3 style={{ color: '#333', margin: '0 0 1rem 0' }}>🤖 OpenAI API Test</h3>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Test Message:
        </label>
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
          placeholder="Enter a test message..."
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={testOpenAIConnection}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoading ? '#a0aec0' : '#4299e1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {isLoading ? 'Testing...' : 'Test OpenAI API'}
        </button>

        <button
          onClick={testCurrentMonthUsage}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#38a169',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Test Current Month Usage
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: testResult.success ? '#f0fff4' : '#fed7d7',
          border: `1px solid ${testResult.success ? '#9ae6b4' : '#fc8181'}`,
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', color: testResult.success ? '#276749' : '#c53030' }}>
            {testResult.message}
          </p>

          {testResult.usage && (
            <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
              <strong>Token Usage:</strong>
              <br />
              • Prompt tokens: {testResult.usage.promptTokens}
              <br />
              • Completion tokens: {testResult.usage.completionTokens}
              <br />
              • Total tokens: {testResult.usage.totalTokens}
              <br />
              • Estimated cost: ${testResult.usage.cost.toFixed(4)}
            </div>
          )}
        </div>
      )}

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f7fafc',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: '#4a5568'
      }}>
        <strong>💡 Integration Notes:</strong>
        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1rem' }}>
          <li>OpenAI API calls return token usage data automatically</li>
          <li>Token usage is tracked and saved to the database</li>
          <li>Cost calculations are based on current OpenAI pricing</li>
          <li>Use this in your chatbot to track student conversations</li>
        </ul>
      </div>
    </div>
  );
};

export default OpenAITestComponent;