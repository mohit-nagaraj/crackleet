const axios = require('axios');
const fs = require('fs');

class GeminiAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Analyze an image with Gemini Vision
   * @param {string} model - The model to use (e.g., 'gemini-pro-vision')
   * @param {string} imagePath - Path to the image file
   * @param {string} prompt - Text prompt for the analysis
   * @returns {Promise<Object>} - The LLM response
   */
  async analyzeImage(model, imagePath, prompt) {
    try {
      // Read image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare the request payload
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      };
      
      // Make the API request
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process the response
      const content = response.data?.candidates?.[0]?.content;
      if (!content) {
        throw new Error('Invalid response from Gemini API');
      }
      
      // Parse the response text to extract explanation and code
      return this.parseResponse(content?.parts?.[0]?.text || '');
      
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  
  /**
   * Parse the LLM response text to extract explanation and code
   * @param {string} text - Raw response text from the LLM
   * @returns {Object} - Structured response with explanation and code
   */
  parseResponse(text) {
    // Look for code blocks
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const codeMatches = [...text.matchAll(codeBlockRegex)];
    
    let code = '';
    let explanation = text;
    let complexity = '';
    
    // Extract complexity information
    const complexityRegex = /time complexity:?\s*o\([^)]+\)|space complexity:?\s*o\([^)]+\)/gi;
    const complexityMatches = text.match(complexityRegex);
    
    if (complexityMatches && complexityMatches.length > 0) {
      complexity = complexityMatches.join(', ');
    }
    
    if (codeMatches && codeMatches.length > 0) {
      // Extract the first code block
      const fullMatch = codeMatches[0][0];
      code = codeMatches[0][1];
      
      // Remove the code block from the explanation
      explanation = text.replace(fullMatch, '')
        .replace(/```\w+/g, '') // Remove any remaining code markers
        .trim();
    }
    
    return {
      explanation: explanation,
      code: code,
      complexity: complexity
    };
  }
}

module.exports = GeminiAPI;