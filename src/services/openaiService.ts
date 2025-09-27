import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  organization: import.meta.env.VITE_OPENAI_ORG_ID,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage: TokenUsage;
}

export interface UsageStatistics {
  totalUsage: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  usageByModel: Record<string, { total: number; input: number; output: number }>;
  usageByDate: Record<string, { total: number; input: number; output: number }>;
  dailyUsage: Array<{
    date: string;
    usage: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}

class OpenAIService {
  private apiKey: string | undefined;
  private orgId: string | undefined;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.orgId = import.meta.env.VITE_OPENAI_ORG_ID;
  }

  // Check if OpenAI is properly configured
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_openai_api_key_here');
  }

  // Create a chat completion and return content + token usage
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'gpt-3.5-turbo'
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not properly configured. Please check your environment variables.');
    }

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!usage) {
        throw new Error('No usage data returned from OpenAI API');
      }

      return {
        content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to get completion from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get usage statistics for a specific time period using OpenAI's usage API
  async getUsageStatistics(
    startDate: string,
    endDate: string
  ): Promise<UsageStatistics> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not properly configured.');
    }

    try {
      // Get usage data for each day in the range
      const usageByModel: Record<string, { total: number; input: number; output: number }> = {};
      const usageByDate: Record<string, { total: number; input: number; output: number }> = {};
      const dailyUsage: Array<{ date: string; usage: number; inputTokens: number; outputTokens: number }> = [];
      let totalUsage = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];

        try {
          const response = await fetch(`https://api.openai.com/v1/usage?date=${dateStr}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'OpenAI-Organization': this.orgId || '',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const dayData = await response.json();
            let dayUsage = 0;
            let dayInputTokens = 0;
            let dayOutputTokens = 0;


            // Process chat completions data
            if (dayData.data && Array.isArray(dayData.data)) {
              dayData.data.forEach((item: any) => {

                // OpenAI usage API field names - check multiple possible field names
                const promptTokens = item.n_context_tokens_total || item.prompt_tokens || item.n_prompt_tokens || 0; // Input tokens
                const completionTokens = item.n_generated_tokens_total || item.completion_tokens || item.n_completion_tokens || 0; // Output tokens
                const totalTokens = item.total_tokens || item.n_tokens || (promptTokens + completionTokens);
                const model = item.snapshot_id || item.model || item.engine || 'gpt-3.5-turbo';

                // If no token data available, use request count as fallback with estimates
                const requests = item.n_requests || 0;
                if (totalTokens === 0 && requests > 0) {
                  // Fallback: estimate tokens from requests (rough estimates)
                  const estimatedInputTokens = requests * 100; // ~100 input tokens per request
                  const estimatedOutputTokens = requests * 50; // ~50 output tokens per request
                  dayUsage += estimatedInputTokens + estimatedOutputTokens;
                  dayInputTokens += estimatedInputTokens;
                  dayOutputTokens += estimatedOutputTokens;
                } else {
                  dayUsage += totalTokens;
                  dayInputTokens += promptTokens;
                  dayOutputTokens += completionTokens;
                }

                // Aggregate by model (use the actual values that were added to dayUsage)
                if (!usageByModel[model]) {
                  usageByModel[model] = { total: 0, input: 0, output: 0 };
                }
                if (totalTokens === 0 && requests > 0) {
                  // Use estimated values
                  const estimatedInputTokens = requests * 100;
                  const estimatedOutputTokens = requests * 50;
                  usageByModel[model].total += estimatedInputTokens + estimatedOutputTokens;
                  usageByModel[model].input += estimatedInputTokens;
                  usageByModel[model].output += estimatedOutputTokens;
                } else {
                  usageByModel[model].total += totalTokens;
                  usageByModel[model].input += promptTokens;
                  usageByModel[model].output += completionTokens;
                }
              });
            }

            totalUsage += dayUsage;
            totalInputTokens += dayInputTokens;
            totalOutputTokens += dayOutputTokens;
            usageByDate[dateStr] = { total: dayUsage, input: dayInputTokens, output: dayOutputTokens };
            dailyUsage.push({ date: dateStr, usage: dayUsage, inputTokens: dayInputTokens, outputTokens: dayOutputTokens });
          }
        } catch (dayError) {
          console.warn(`Failed to fetch usage for ${dateStr}:`, dayError);
          // Continue with other dates
          usageByDate[dateStr] = { total: 0, input: 0, output: 0 };
          dailyUsage.push({ date: dateStr, usage: 0, inputTokens: 0, outputTokens: 0 });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort daily usage by date
      dailyUsage.sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalUsage,
        totalInputTokens,
        totalOutputTokens,
        usageByModel,
        usageByDate,
        dailyUsage
      };
    } catch (error) {
      console.error('Error fetching usage statistics:', error);
      throw new Error(`Failed to fetch usage statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get current month usage summary
  async getCurrentMonthUsage(): Promise<{
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not properly configured.');
    }

    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = now;

      let totalRequests = 0;
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let estimatedCost = 0;

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        try {
          const response = await fetch(`https://api.openai.com/v1/usage?date=${dateStr}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'OpenAI-Organization': this.orgId || '',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const dayData = await response.json();


            // Process chat completions data
            if (dayData.data && Array.isArray(dayData.data)) {
              dayData.data.forEach((item: any) => {
                const requests = item.n_requests || 0;

                // OpenAI usage API field names - check multiple possible field names
                const promptTokens = item.n_context_tokens_total || item.prompt_tokens || item.n_prompt_tokens || 0; // Input tokens
                const completionTokens = item.n_generated_tokens_total || item.completion_tokens || item.n_completion_tokens || 0; // Output tokens
                const actualTokens = item.total_tokens || item.n_tokens || (promptTokens + completionTokens);

                totalRequests += requests;

                // If no token data available, use request count as fallback with estimates
                if (actualTokens === 0 && requests > 0) {
                  // Fallback: estimate tokens from requests (rough estimates)
                  const estimatedInputTokens = requests * 100; // ~100 input tokens per request
                  const estimatedOutputTokens = requests * 50; // ~50 output tokens per request
                  totalTokens += estimatedInputTokens + estimatedOutputTokens;
                  inputTokens += estimatedInputTokens;
                  outputTokens += estimatedOutputTokens;

                  // Calculate cost based on estimated tokens
                  const inputCost = estimatedInputTokens * 0.0015 / 1000;
                  const outputCost = estimatedOutputTokens * 0.002 / 1000;
                  estimatedCost += inputCost + outputCost;
                } else {
                  totalTokens += actualTokens;
                  inputTokens += promptTokens;
                  outputTokens += completionTokens;

                  // Calculate cost based on actual tokens with proper input/output pricing
                  const inputCost = promptTokens * 0.0015 / 1000; // $0.0015 per 1K input tokens
                  const outputCost = completionTokens * 0.002 / 1000; // $0.002 per 1K output tokens
                  estimatedCost += inputCost + outputCost;
                }
              });
            }
          }
        } catch (dayError) {
          console.warn(`Failed to fetch usage for ${dateStr}:`, dayError);
          // Continue with other dates
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        totalRequests,
        totalTokens,
        inputTokens,
        outputTokens,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000
      };
    } catch (error) {
      console.error('Error fetching current month usage:', error);
      throw new Error(`Failed to fetch current month usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate cost based on token usage and model
  calculateCost(usage: TokenUsage, model: string = 'gpt-3.5-turbo'): number {
    // OpenAI pricing (as of 2024, subject to change)
    const pricing = {
      'gpt-3.5-turbo': {
        input: 0.0015 / 1000,  // $0.0015 per 1K input tokens
        output: 0.002 / 1000   // $0.002 per 1K output tokens
      },
      'gpt-4': {
        input: 0.03 / 1000,    // $0.03 per 1K input tokens
        output: 0.06 / 1000    // $0.06 per 1K output tokens
      },
      'gpt-4-turbo': {
        input: 0.01 / 1000,    // $0.01 per 1K input tokens
        output: 0.03 / 1000    // $0.03 per 1K output tokens
      }
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo'];

    const inputCost = usage.promptTokens * modelPricing.input;
    const outputCost = usage.completionTokens * modelPricing.output;

    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
  }

  // Test the OpenAI connection
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await this.createChatCompletion([
        { role: 'user', content: 'Say "Hello" in one word.' }
      ]);

      return response.content.length > 0 && response.usage.totalTokens > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
export default openAIService;