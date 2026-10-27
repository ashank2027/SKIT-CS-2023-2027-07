/**
 * ============================================================
 * FILE: src/services/aiService.js
 * ROLE: AI Copilot Service Layer (Gemini API Integration + Local Fallback)
 * ============================================================
 *
 * This service handles communication with external Generative AI providers
 * (specifically Google Gemini / LLM models) to deliver AI-driven sustainability
 * insights, emissions analysis, reduction recommendations, and conversational answers.
 *
 * KEY RESPONSIBILITIES:
 * 1. Build a rich context prompt using the user's profile and aggregated emission data.
 * 2. Send the conversation history and context to the Gemini API (using process.env.GEMINI_API_KEY).
 * 3. Gracefully fall back to an intelligent rule-based sustainability engine if the
 *    GEMINI_API_KEY is not configured or if external network/quota errors occur.
 * 4. Guarantee zero key leakage to the frontend — keys are strictly backend-only.
 *
 * DEPENDENCIES: Node.js native fetch / https.
 * ============================================================
 */

/**
 * Build a structured system prompt containing user domain context and emission facts.
 * @param {Object} userContext Profile of the authenticated user
 * @param {Object} emissionsContext Aggregated emission stats and breakdowns
 * @returns {string} System instruction string
 */
function buildSystemPrompt(userContext, emissionsContext) {
  const org = userContext.organization || 'Independent Organization';
  const industry = userContext.industry || 'General Industry';
  const location = userContext.location || 'Global / Unspecified';
  const totalEmissions = (emissionsContext.total_co2e || 0).toFixed(2);
  const highestCategory = emissionsContext.highest_category || 'N/A';
  const recordCount = emissionsContext.record_count || 0;

  let breakdownStr = 'No category breakdown recorded yet.';
  if (emissionsContext.categories && emissionsContext.categories.length > 0) {
    breakdownStr = emissionsContext.categories
      .map(c => `- ${c.name}: ${Number(c.total_co2e).toFixed(2)} kg CO2e (${c.record_count} activities)`)
      .join('\n');
  }

  let recentActivitiesStr = 'No recent activities recorded yet.';
  if (emissionsContext.recent && emissionsContext.recent.length > 0) {
    recentActivitiesStr = emissionsContext.recent
      .map(r => `- [${r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A'}] ${r.category_name || 'Activity'}: ${r.activity} (${r.quantity} ${r.unit}) -> ${Number(r.co2e).toFixed(2)} kg CO2e`)
      .join('\n');
  }

  return `You are EcoInsight AI Copilot, an expert AI sustainability advisor and carbon accounting specialist built into the EcoInsight Carbon Emissions Management platform.

USER PROFILE:
- Name: ${userContext.name || 'User'}
- Organization: ${org}
- Industry: ${industry}
- Location: ${location}

CURRENT CARBON EMISSION DATA (ACTUAL DATABASE METRICS):
- Total Emissions to date: ${totalEmissions} kg CO2e
- Logged Emission Records: ${recordCount}
- Highest Contributing Category: ${highestCategory}

CATEGORY BREAKDOWN:
${breakdownStr}

RECENT ACTIVITIES:
${recentActivitiesStr}

YOUR DIRECTIVES:
1. Provide accurate, practical, actionable carbon-reduction recommendations tailored to their industry and specific emission drivers.
2. When answering questions regarding their carbon footprint or trends, always cite their actual emission numbers from the context above.
3. If they ask how to lower their footprint, suggest specific, prioritized steps (quick wins vs long-term capital investments).
4. Frame advice according to GHG Protocol standards (Scope 1 direct, Scope 2 electricity/energy, Scope 3 supply chain/travel/waste).
5. Maintain a professional, encouraging, analytical, and environmentally conscious tone.
6. If the user has zero emission records, encourage them to add data or import a CSV file to unlock tailored analytics.
7. Keep answers structured with concise bullet points and bold highlights for readability.`;
}

/**
 * Fallback intelligent sustainability advisor when Gemini API key is unset or external API is unavailable.
 * @param {string} prompt User's question
 * @param {Object} userContext Profile details
 * @param {Object} emissionsContext Aggregated emission data
 * @returns {string} Tailored response
 */
function generateFallbackResponse(prompt, userContext, emissionsContext) {
  const lowerPrompt = prompt.toLowerCase();
  const total = Number(emissionsContext.total_co2e || 0);
  const highest = emissionsContext.highest_category || 'Electricity';
  const org = userContext.organization || 'your organization';
  const industry = userContext.industry || 'your sector';

  if (lowerPrompt.includes('reduce') || lowerPrompt.includes('lower') || lowerPrompt.includes('cut') || lowerPrompt.includes('tips') || lowerPrompt.includes('strategy')) {
    return `### 🌿 Tailored Carbon Reduction Strategy for ${org} (${industry})

Based on your current recorded footprint of **${total.toFixed(2)} kg CO₂e**, your primary carbon driver is **${highest}**. Here is an actionable roadmap:

1. **Target Your High-Impact Category (${highest})**:
   - Conduct an energy/activity audit for high-frequency logs.
   - For electricity or fuel, evaluate renewable energy certificates (RECs) or on-site solar alternatives.
   - Implement scheduled automated equipment shutdowns during non-operational hours.

2. **Quick Wins (0–3 Months)**:
   - Optimize thermal setpoints (+1°C in cooling or -1°C in heating yields a 6–8% energy reduction).
   - Enforce low-carbon travel policies for local transport and encourage virtual meetings.
   - Implement a waste segregation and recycling regime to curtail Scope 3 landfill emissions.

3. **Mid-to-Long Term Targets**:
   - Establish annual carbon-intensity KPI targets per department or output unit.
   - Transition fleet/transportation assets to electric or hybrid alternatives.
   - Integrate supplier ESG criteria for procurement to address Scope 3 value-chain impacts.`;
  }

  if (lowerPrompt.includes('summary') || lowerPrompt.includes('status') || lowerPrompt.includes('overview') || lowerPrompt.includes('how am i doing') || lowerPrompt.includes('footprint')) {
    return `### 📊 Carbon Footprint Assessment Overview

Here is an analytical summary of your profile at **${org}**:

- **Total Historical Emissions:** **${total.toFixed(2)} kg CO₂e** across **${emissionsContext.record_count || 0}** logged activities.
- **Top Emitting Category:** **${highest}**, representing the largest share of your operational emissions.
- **Industry Sector:** ${industry} in ${userContext.location || 'Global'}.

**Recommendation:** Focus your reduction initiatives on **${highest}** activities first. Check your Dashboard and Analytics tabs for monthly distribution patterns and GHG Scope breakdowns.`;
  }

  if (lowerPrompt.includes('scope') || lowerPrompt.includes('ghg')) {
    return `### 🌐 GHG Protocol Scopes Breakdown

For ${org}, emissions are classified into three scopes:
- **Scope 1 (Direct Emissions):** Fuel combustion in company facilities, natural gas, company vehicles.
- **Scope 2 (Indirect Emissions):** Purchased electricity, heating, and cooling consumed on-site.
- **Scope 3 (Value Chain Emissions):** Employee commuting, business travel, waste disposal, and purchased goods.

Your highest emission source is currently **${highest}**. You can track these proportions directly in your EcoInsight Dashboard.`;
  }

  // General helpful response
  return `### 💡 EcoInsight Sustainability Copilot

Thank you for your inquiry regarding: *"${prompt}"*.

**Current Status for ${org}:**
- **Total Recorded Emissions:** **${total.toFixed(2)} kg CO₂e**
- **Primary Driver:** **${highest}**

To drive meaningful decarbonization:
1. Review the highest activities logged under **${highest}** in your Emissions log.
2. Consider setting an intensity reduction target (e.g., 10% reduction per quarter).
3. Utilize the **Calculator** to estimate the carbon savings of alternative energy or transport methods before execution.

Feel free to ask for specific reduction recommendations, scope classifications, or breakdown analysis!`;
}

/**
 * Call the Gemini API or fall back safely.
 * @param {string} message User message
 * @param {Array} history Conversation history: [{ role: 'user'|'assistant', content: string }]
 * @param {Object} userContext User profile
 * @param {Object} emissionsContext User emission statistics
 * @returns {Promise<string>} Generated text reply
 */
async function generateAIResponse(message, history = [], userContext = {}, emissionsContext = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const systemInstruction = buildSystemPrompt(userContext, emissionsContext);

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return generateFallbackResponse(message, userContext, emissionsContext);
  }

  try {
    // Format conversation history for Gemini API
    const contents = [];

    // Prior conversation history
    if (Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.warn(`[AI Service] Gemini API returned status ${response.status}. Falling back to rule-based engine.`);
      return generateFallbackResponse(message, userContext, emissionsContext);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return generateFallbackResponse(message, userContext, emissionsContext);
    }

    return candidateText;
  } catch (err) {
    console.warn('[AI Service] Gemini API call failed:', err.message);
    // Graceful degradation ensures frontend experience is never interrupted
    return generateFallbackResponse(message, userContext, emissionsContext);
  }
}

module.exports = {
  buildSystemPrompt,
  generateFallbackResponse,
  generateAIResponse
};
