import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/StudentsContext';
import { useMessages } from '../contexts/MessagesContext';
import { openAIService } from '../services/openaiService';
import Layout from '../components/Layout';

interface DashboardInsights {
  totalStudents: number;
  activeStudents: number;
  totalMessages: number;
  activeStudentsThisWeek: number;
  messagesThisWeek: number;
  tokensUsedThisWeek: number;
  topActiveStudents: Array<{ studentName: string; messageCount: number }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { students } = useStudents();
  const { messages } = useMessages();
  const [insights, setInsights] = useState<DashboardInsights>({
    totalStudents: 0,
    activeStudents: 0,
    totalMessages: 0,
    activeStudentsThisWeek: 0,
    messagesThisWeek: 0,
    tokensUsedThisWeek: 0,
    topActiveStudents: []
  });

  // Responsive design state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 640;

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [isFilterActive, setIsFilterActive] = useState(false);

  // OpenAI usage state
  const [openAIUsage, setOpenAIUsage] = useState({
    totalRequests: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    loading: false,
    error: null as string | null
  });

  // Helper function to filter messages by date range
  const getFilteredMessages = () => {
    if (!isFilterActive || !dateFilter.startDate || !dateFilter.endDate) {
      return messages;
    }

    const startDate = new Date(dateFilter.startDate);
    const endDate = new Date(dateFilter.endDate);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date

    return messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      return msgDate >= startDate && msgDate <= endDate;
    });
  };


  useEffect(() => {
    const calculateInsights = () => {
      const totalStudents = students.length;
      const activeStudents = students.filter(student => student.status === 'active').length;

      // Get filtered messages based on date range
      const filteredMessages = getFilteredMessages();

      // Calculate analytics from filtered messages
      const totalMessages = filteredMessages.length;
      const activeStudentIds = new Set(filteredMessages.map(msg => msg.studentId));

      // For "this week" metrics, use either the filter period or actual week
      let weekMessages, weekActiveStudents, weekTokens;

      if (isFilterActive) {
        // If filtering, use the filtered period
        weekMessages = filteredMessages.length;
        weekActiveStudents = activeStudentIds.size;
        weekTokens = 0; // Token usage from OpenAI API
      } else {
        // If not filtering, use actual "this week" data
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekMessages = messages.filter(msg => new Date(msg.createdAt) >= oneWeekAgo);
        weekMessages = thisWeekMessages.length;
        weekActiveStudents = new Set(thisWeekMessages.map(msg => msg.studentId)).size;
        weekTokens = 0; // Token usage from OpenAI API
      }

      // Calculate top active students using filtered messages
      const studentMessageCounts = students.map(student => {
        const studentMessages = filteredMessages.filter(msg => msg.studentId === student.id);
        return {
          studentName: `${student.firstName} ${student.lastName}`,
          messageCount: studentMessages.length
        };
      }).sort((a, b) => b.messageCount - a.messageCount).slice(0, 5);

      setInsights({
        totalStudents,
        activeStudents,
        totalMessages,
        activeStudentsThisWeek: weekActiveStudents,
        messagesThisWeek: weekMessages,
        tokensUsedThisWeek: weekTokens,
        topActiveStudents: studentMessageCounts
      });
    };

    calculateInsights();
  }, [students, messages, dateFilter, isFilterActive]);

  const handleDateFilterChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    if (dateFilter.startDate && dateFilter.endDate) {
      setIsFilterActive(true);
    }
  };

  const handleClearFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setIsFilterActive(false);
  };

  // Fetch OpenAI usage data
  const fetchOpenAIUsage = async () => {
    if (!openAIService.isConfigured()) {
      setOpenAIUsage(prev => ({ ...prev, error: 'OpenAI API not configured' }));
      return;
    }

    setOpenAIUsage(prev => ({ ...prev, loading: true, error: null }));

    try {
      let usage;

      if (isFilterActive && dateFilter.startDate && dateFilter.endDate) {
        // Use date-filtered usage statistics with exact token counts
        const stats = await openAIService.getUsageStatistics(dateFilter.startDate, dateFilter.endDate);
        usage = {
          totalRequests: Math.round(stats.totalUsage / 150), // Rough estimate of requests from tokens
          totalTokens: stats.totalUsage, // This now contains actual token counts
          inputTokens: stats.totalInputTokens,
          outputTokens: stats.totalOutputTokens,
          estimatedCost: stats.totalInputTokens * 0.0015 / 1000 + stats.totalOutputTokens * 0.002 / 1000 // Calculate cost from actual input/output tokens
        };
      } else {
        // Use current month usage (default behavior) with exact token counts
        usage = await openAIService.getCurrentMonthUsage();
      }

      setOpenAIUsage({
        totalRequests: usage.totalRequests,
        totalTokens: usage.totalTokens,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCost: usage.estimatedCost,
        loading: false,
        error: null
      });
    } catch (error) {
      setOpenAIUsage(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage data'
      }));
    }
  };

  // Load OpenAI usage on component mount and when date filter changes
  useEffect(() => {
    fetchOpenAIUsage();
  }, []);

  // Refresh OpenAI usage when date filter changes
  useEffect(() => {
    fetchOpenAIUsage();
  }, [isFilterActive, dateFilter.startDate, dateFilter.endDate]);

  return (
    <Layout>
      <header style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          marginBottom: '1rem',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              color: '#333',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}>
              Welcome back, {user?.user_metadata?.first_name || 'Teacher'}!
            </h1>
            <p style={{
              color: '#666',
              margin: 0,
              fontSize: isMobile ? '1rem' : '1.1rem'
            }}>
              Teacher Dashboard - {user?.email}
            </p>
          </div>

          {/* Date Filter */}
          <div style={{
            display: 'flex',
            flexDirection: isSmallMobile ? 'column' : 'row',
            alignItems: isSmallMobile ? 'stretch' : 'center',
            gap: isSmallMobile ? '0.5rem' : '1rem',
            padding: isMobile ? '0.75rem' : '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: isSmallMobile ? 'column' : 'row',
              alignItems: isSmallMobile ? 'stretch' : 'center',
              gap: '0.5rem',
              width: isSmallMobile ? '100%' : 'auto'
            }}>
              <label style={{
                fontSize: '0.875rem',
                color: '#4a5568',
                fontWeight: '500',
                minWidth: isSmallMobile ? 'auto' : 'fit-content'
              }}>
                From:
              </label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  width: isSmallMobile ? '100%' : 'auto'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isSmallMobile ? 'column' : 'row',
              alignItems: isSmallMobile ? 'stretch' : 'center',
              gap: '0.5rem',
              width: isSmallMobile ? '100%' : 'auto'
            }}>
              <label style={{
                fontSize: '0.875rem',
                color: '#4a5568',
                fontWeight: '500',
                minWidth: isSmallMobile ? 'auto' : 'fit-content'
              }}>
                To:
              </label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  width: isSmallMobile ? '100%' : 'auto'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isSmallMobile ? 'column' : 'row',
              gap: '0.5rem',
              width: isSmallMobile ? '100%' : 'auto'
            }}>
              <button
                onClick={handleApplyFilter}
                disabled={!dateFilter.startDate || !dateFilter.endDate}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: dateFilter.startDate && dateFilter.endDate ? '#4299e1' : '#a0aec0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: dateFilter.startDate && dateFilter.endDate ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  width: isSmallMobile ? '100%' : 'auto'
                }}
              >
                Apply
              </button>

              {isFilterActive && (
                <button
                  onClick={handleClearFilter}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    width: isSmallMobile ? '100%' : 'auto'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {isFilterActive && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#e6fffa',
            border: '1px solid #81e6d9',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#234e52'
          }}>
            📅 Showing data from {new Date(dateFilter.startDate).toLocaleDateString()} to {new Date(dateFilter.endDate).toLocaleDateString()}
          </div>
        )}
      </header>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #4299e1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#4299e1', fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>{insights.totalStudents}</h3>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>Total Students</p>
            </div>
            <div style={{ fontSize: '2rem' }}>👥</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {insights.activeStudents} active students
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #38a169'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#38a169', fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>{insights.totalMessages}</h3>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                {isFilterActive ? 'Messages in Period' : 'Total Messages'}
              </p>
            </div>
            <div style={{ fontSize: '2rem' }}>💬</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {isFilterActive
              ? `${insights.messagesThisWeek} in selected period`
              : `${insights.messagesThisWeek} messages this week`}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #ed8936'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#ed8936', fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>{insights.activeStudentsThisWeek}</h3>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                {isFilterActive ? 'Active Students in Period' : 'Active Students This Week'}
              </p>
            </div>
            <div style={{ fontSize: '2rem' }}>📅</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {isFilterActive
              ? 'Students who sent messages in period'
              : 'Students who sent messages this week'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #4c51bf'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#4c51bf', fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>
                {openAIUsage.loading ? '⏳' :
                 openAIUsage.error ? '❌' :
                 openAIUsage.inputTokens.toLocaleString()}
              </h3>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                {isFilterActive ? 'Input Tokens in Period' : 'Input Tokens This Month'}
              </p>
            </div>
            <div style={{ fontSize: '2rem' }}>📥</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {openAIUsage.loading ? 'Loading usage data...' :
             openAIUsage.error ? openAIUsage.error :
             `$${(openAIUsage.inputTokens * 0.0015 / 1000).toFixed(4)} cost • $0.0015/1K tokens`}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #9f7aea'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#9f7aea', fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>
                {openAIUsage.loading ? '⏳' :
                 openAIUsage.error ? '❌' :
                 openAIUsage.outputTokens.toLocaleString()}
              </h3>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                {isFilterActive ? 'Output Tokens in Period' : 'Output Tokens This Month'}
              </p>
            </div>
            <div style={{ fontSize: '2rem' }}>📤</div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {openAIUsage.loading ? 'Loading usage data...' :
             openAIUsage.error ? openAIUsage.error :
             `$${(openAIUsage.outputTokens * 0.002 / 1000).toFixed(4)} cost • $0.002/1K tokens`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {openAIService.isConfigured() && (
              <button
                onClick={fetchOpenAIUsage}
                disabled={openAIUsage.loading}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: openAIUsage.loading ? '#a0aec0' : '#9f7aea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: openAIUsage.loading ? 'not-allowed' : 'pointer'
                }}
              >
                {openAIUsage.loading ? 'Loading...' : 'Refresh'}
              </button>
            )}
            {openAIService.isConfigured() && (
              <button
                onClick={async () => {
                  try {
                    const response = await openAIService.createChatCompletion([
                      { role: 'user', content: 'Say hello in one word' }
                    ]);
                    alert(`OpenAI Test: ${response.content}\nTokens: ${response.usage.totalTokens} (${response.usage.promptTokens} in + ${response.usage.completionTokens} out)\nCost: $${openAIService.calculateCost(response.usage).toFixed(4)}`);
                    // Refresh usage after test
                    setTimeout(fetchOpenAIUsage, 1000);
                  } catch (error) {
                    alert(`OpenAI Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#68d391',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Test API
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Insights Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '100%' : '400px'}, 1fr))`,
        gap: isMobile ? '1rem' : '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            📈 Most Active Students
          </h3>
          {insights.topActiveStudents.length > 0 ? (
            <div>
              {insights.topActiveStudents.map((student, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: index < insights.topActiveStudents.length - 1 ? '1px solid #e2e8f0' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#4299e1',
                      marginRight: '0.75rem'
                    }}></div>
                    <span style={{ color: '#333' }}>{student.studentName}</span>
                  </div>
                  <span style={{
                    backgroundColor: '#f7fafc',
                    color: '#4a5568',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem'
                  }}>
                    {student.messageCount} messages
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#718096', fontStyle: 'italic' }}>No messages yet</p>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1rem' : '1.5rem',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            🎯 Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }} onClick={() => window.location.href = '/students'}>
              <span>📚 Manage Students</span>
              <span>→</span>
            </button>

            {insights.activeStudentsThisWeek > 0 && (
              <button style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#ed8936',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }} onClick={() => window.location.href = '/students'}>
                <span>📊 View Analytics ({insights.activeStudentsThisWeek} active)</span>
                <span>→</span>
              </button>
            )}

            <button style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }} onClick={() => window.location.href = '/profile'}>
              <span>⚙️ Profile Settings</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

    </Layout>
  );
};

export default Dashboard;