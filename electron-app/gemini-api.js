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
      
      // Extract language preference from prompt or use default
      const languageMatch = prompt.match(/Preferred language: (\w+)/i);
      const language = languageMatch ? languageMatch[1] : 'JavaScript';
      
      // Prepare the request payload with a more specific prompt
      const payload = {
        contents: [
          {
            parts: [
              { 
                text: `You are an interview assistant. Analyze the screenshot to identify the question. 
If it is a multiple-choice question, indicate which option you believe is correct option only (could be multiple choice answer). Use web search if necessary.
If it is a coding question, provide:
1. A detailed solution in clean, well-commented code  
2. A brief explanation of your approach pointwise  
3. Direct time and space complexity analysis  

The preferred language is: ${language}` 
              },
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
          temperature: 0.2,
          maxOutputTokens: 4096
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
    
    // Extract complexity information
    const timeComplexityRegex = /time complexity:?\s*([^.\n]+)/i;
    const spaceComplexityRegex = /space complexity:?\s*([^.\n]+)/i;
    
    const timeMatch = text.match(timeComplexityRegex);
    const spaceMatch = text.match(spaceComplexityRegex);
    
    let complexity = '';
    if (timeMatch) {
      complexity += `Time: ${timeMatch[1].trim()}`;
    }
    if (spaceMatch) {
      complexity += complexity ? `, Space: ${spaceMatch[1].trim()}` : `Space: ${spaceMatch[1].trim()}`;
    }
    
    if (codeMatches && codeMatches.length > 0) {
      // Extract the first code block
      const fullMatch = codeMatches[0][0];
      code = codeMatches[0][1].trim();
      
      // Remove the code block from the explanation
      explanation = text.replace(fullMatch, '')
        .replace(/```\w+/g, '') // Remove any remaining code markers
        .trim();
        
      // Format the explanation to use HTML for better display
      explanation = this.formatExplanation(explanation);
    }
    
    return {
      explanation: explanation,
      code: code,
      complexity: complexity
    };
  }
  
  /**
   * Format the explanation text to use HTML for better display
   * @param {string} text - The explanation text
   * @returns {string} - Formatted HTML
   */
  formatExplanation(text) {
    // Instead of converting to HTML, just clean up the markdown a bit
    // Remove any excessive newlines and ensure consistent formatting
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Return the cleaned markdown text
    return text;
  }
}

module.exports = GeminiAPI;