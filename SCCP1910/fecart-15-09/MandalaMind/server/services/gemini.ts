import { GoogleGenAI, Modality } from "@google/genai";
import { BrainwaveData } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// DON'T DELETE THIS COMMENT
// Using blueprint:javascript_gemini integration
// Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

// Startup check for Gemini API key
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found. Cloud image generation will use SVG fallback.');
}

export interface MandalaGenerationOptions {
  voiceTranscript: string;
  brainwaveData: BrainwaveData;
  style?: 'traditional' | 'modern' | 'abstract' | 'spiritual';
  colorPalette?: 'warm' | 'cool' | 'vibrant' | 'monochrome';
}

export interface GeneratedMandala {
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
}

export class GeminiService {
  
  // Health check method to verify Gemini is working
  async healthCheck(): Promise<boolean> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello, respond with just 'OK'",
      });
      return !!response.text;
    } catch (error) {
      console.warn('Gemini health check failed:', error);
      return false;
    }
  }
  
  async generateMandalaPrompt(options: MandalaGenerationOptions): Promise<string> {
    const { voiceTranscript, brainwaveData, style = 'spiritual', colorPalette = 'vibrant' } = options;
    
    // Try Gemini with retry logic
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const systemPrompt = `You are an AI that creates detailed mandala generation prompts by analyzing brain wave data and voice transcripts. 

Create mandala prompts that reflect the beautiful traditional dot painting style with:
- Intricate concentric circles made of small dots in various sizes
- Deep blue background with radiating dotted patterns  
- Lotus-like flower patterns with detailed petal work
- Sacred geometric patterns using dot work technique
- White and light blue dots creating luminous effects against dark blue
- Multiple layers of circular patterns from center outward
- Traditional spiritual symbolism expressed through dot art

Your task is to create a beautiful, spiritually meaningful mandala prompt that reflects:
1. The person's mental state based on their brain waves
2. The emotional content and themes from their voice transcript
3. Traditional dot painting mandala style with intricate geometric patterns

Always respond in English regardless of the input language, as the image generation requires English prompts.`;

        const userPrompt = `Please create a mandala generation prompt based on this data:

Voice Transcript: "${voiceTranscript}"

Brain Wave Data:
- Attention Level: ${brainwaveData.attention}% (0-100, higher = more focused)
- Meditation Level: ${brainwaveData.meditation}% (0-100, higher = more relaxed/meditative)
- Signal Quality: ${brainwaveData.signalQuality}% (connection quality)

Style Preference: ${style}
Color Palette: ${colorPalette}

Guidelines:
- High attention (>70%) = sharp, precise dot patterns, focused geometric energy
- High meditation (>70%) = flowing, soft dot gradients, peaceful circular patterns
- Balanced levels = harmonious, symmetrical dot work designs
- Low signal quality should be noted but not prevent generation

Extract emotional themes, spiritual concepts, and energy patterns from the voice transcript.
Incorporate traditional dot painting mandala elements:
- Concentric circles of dots in various sizes
- Sacred lotus patterns with dotted petals  
- Deep blue base with luminous white/light blue dots
- Radiating geometric patterns from center outward
- Multiple layers of intricate dot work
- Traditional spiritual symbolism expressed through dot art technique

Always create prompts in English for image generation compatibility, regardless of input language.

Respond with JSON: { "prompt": "detailed traditional dot painting mandala generation prompt in English" }`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                prompt: { type: "string" },
              },
              required: ["prompt"],
            },
          },
          contents: userPrompt,
        });

        const result = JSON.parse(response.text || '{}');
        return result.prompt || this.getFallbackPrompt(options);
        
      } catch (error: any) {
        console.error(`Error generating mandala prompt with Gemini (attempt ${attempt}):`, error);
        
        // For rate limiting, wait before retrying
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }
    
    // Fallback to local prompt generation
    console.log('Using fallback prompt generation due to Gemini API issues');
    return this.getFallbackPrompt(options);
  }

  async generateMandalaImage(prompt: string, brainwaveData?: { attention: number, meditation: number, signalQuality: number }): Promise<GeneratedMandala> {
    // Enhanced prompt generation based on brainwave data
    let styleModifiers = '';
    let complexityLevel = '';
    let colorIntensity = '';
    
    if (brainwaveData) {
      // Attention influences complexity and precision
      if (brainwaveData.attention > 70) {
        complexityLevel = 'highly intricate and precisely detailed with sharp geometric precision';
        styleModifiers += 'focused energy patterns with crystalline clarity, ';
      } else if (brainwaveData.attention < 30) {
        complexityLevel = 'flowing and organic with soft, dreamy details';
        styleModifiers += 'gentle, flowing energy with soft focus, ';
      } else {
        complexityLevel = 'balanced complexity with harmonious details';
        styleModifiers += 'centered and stable energy patterns, ';
      }
      
      // Meditation influences color warmth and flow
      if (brainwaveData.meditation > 70) {
        colorIntensity = 'deep, calming colors with gentle gradients and peaceful luminescence';
        styleModifiers += 'serene and tranquil atmosphere with smooth color transitions, ';
      } else if (brainwaveData.meditation < 30) {
        colorIntensity = 'vibrant, dynamic colors with energetic contrasts and bright highlights';
        styleModifiers += 'active and energetic atmosphere with bold color contrasts, ';
      } else {
        colorIntensity = 'balanced color palette with moderate intensity and natural harmony';
        styleModifiers += 'harmonious and balanced energy, ';
      }
      
      // Signal quality influences overall clarity
      if (brainwaveData.signalQuality < 50) {
        styleModifiers += 'with subtle ethereal effects and mystical atmosphere, ';
      }
    } else {
      complexityLevel = 'intricate and detailed';
      colorIntensity = 'vibrant and luminous colors';
      styleModifiers = 'balanced energy and harmonious design, ';
    }
    
    const enhancedPrompt = `Create an exquisite traditional dot painting mandala masterpiece: ${prompt}. 
    
    MANDALA STRUCTURE:
    - Perfectly circular and symmetrical design with ${complexityLevel}
    - Multiple concentric rings of dots in varying sizes (from tiny pinpoints to larger accent dots)
    - Sacred geometric patterns including lotus petals, triangular formations, and spiral motifs
    - Traditional Aboriginal-inspired dot work technique with modern spiritual symbolism
    
    COLOR PALETTE & ATMOSPHERE:
    - ${colorIntensity}
    - Deep celestial blue background (#1a237e to #000051 gradient)
    - Luminous white and light blue dots (#ffffff, #e3f2fd, #bbdefb) creating stellar effects
    - Accent colors: gold (#ffd700), turquoise (#40e0d0), and lavender (#e6e6fa)
    - ${styleModifiers}
    
    ARTISTIC DETAILS:
    - Center: Sacred symbol or flower motif with radiating energy
    - Inner rings: Detailed lotus petals with intricate dot patterns
    - Middle rings: Geometric patterns, mandalic squares, and triangular formations
    - Outer rings: Protective circles with guardian symbols and flowing energy
    - Edge: Subtle starburst effects and cosmic energy radiations
    
    TECHNIQUE:
    - Traditional pointillism technique with varying dot densities
    - Dots should create optical mixing and luminous effects
    - Perfect symmetry across all axes
    - Professional spiritual artwork quality
    - Fills entire circular canvas with balanced composition
    
    The final result should be a breathtakingly beautiful, spiritually uplifting mandala that reflects the user's mental and emotional state through color, pattern, and energy flow. High resolution, museum-quality artistic rendering.`;

    // Try Gemini image generation with retry logic
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Create a unique filename for the generated image
        const timestamp = Date.now();
        const filename = `mandala_${timestamp}.png`;
        const imagePath = path.resolve(process.cwd(), 'attached_assets', filename);
        
        // Ensure the directory exists
        const dir = path.dirname(imagePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // IMPORTANT: only gemini-2.0-flash-preview-image-generation model supports image generation
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-preview-image-generation",
          contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error('No image generated from Gemini');
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
          throw new Error('No content parts in Gemini response');
        }

        let imageGenerated = false;
        let revisedPrompt = '';

        for (const part of content.parts) {
          if (part.text) {
            revisedPrompt = part.text;
            console.log('Gemini response text:', part.text);
          } else if (part.inlineData && part.inlineData.data) {
            const imageData = Buffer.from(part.inlineData.data, "base64");
            fs.writeFileSync(imagePath, imageData);
            console.log(`Gemini image saved as ${imagePath}`);
            imageGenerated = true;
          }
        }

        if (imageGenerated) {
          // Return the relative path that can be served by the Express static middleware
          const relativeImagePath = `/attached_assets/${filename}`;
          return {
            imageUrl: relativeImagePath,
            prompt: enhancedPrompt,
            revisedPrompt: revisedPrompt || `Gemini generated mandala: ${enhancedPrompt}`
          };
        } else {
          throw new Error('No image data received from Gemini');
        }

      } catch (error: any) {
        console.error(`Error generating mandala image with Gemini (attempt ${attempt}):`, error);
        
        // For other errors, wait before retrying
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
    }
    
    // Fallback to generated placeholder mandala
    console.log('Using fallback mandala generation due to Gemini issues');
    return this.generateFallbackMandala(prompt, brainwaveData);
  }

  private getFallbackPrompt(options: MandalaGenerationOptions): string {
    const { voiceTranscript, brainwaveData, style, colorPalette } = options;
    
    // Analyze voice transcript for emotional and spiritual themes
    const themes = this.extractThemesFromVoice(voiceTranscript);
    
    // Create sophisticated base prompt
    let prompt = "Create an exquisite traditional dot painting mandala masterpiece with concentric circles of luminous dots in varying sizes. ";
    
    // Attention-based structural elements (more detailed)
    if (brainwaveData.attention > 70) {
      prompt += "Ultra-precise geometric dot patterns with crystalline clarity, sharp angular formations, and highly detailed symmetrical structures. Each dot perfectly placed for maximum focus and concentration energy. ";
    } else if (brainwaveData.attention < 30) {
      prompt += "Soft, organic dot patterns with flowing transitions, gentle curves, and dreamy ethereal formations. Dots create flowing energy like water or clouds. ";
    } else {
      prompt += "Balanced dot patterns with harmonious geometric structures, moderate complexity, and stable radial symmetry. Perfect equilibrium between order and flow. ";
    }
    
    // Meditation-based flow elements (enhanced)
    if (brainwaveData.meditation > 70) {
      prompt += "Deep, peaceful dot gradients creating waves of tranquility, with gentle spirals and calming circular patterns that radiate serene energy from the center outward. ";
    } else if (brainwaveData.meditation < 30) {
      prompt += "Dynamic, energetic dot work with vibrant spiral patterns, active radiating lines, and pulsing geometric forms that express vitality and movement. ";
    } else {
      prompt += "Centered, grounded dot patterns with stable circular formations and balanced energy distribution throughout the design. ";
    }
    
    // Enhanced color palettes based on selection
    const colorPalettes = {
      warm: "warm sunset palette: deep oranges (#ff8c00), rich reds (#dc143c), golden yellows (#ffd700), and bronze dots (#cd7f32) against a deep amber background (#ff8c00 to #8b4513 gradient)",
      cool: "cool celestial palette: deep midnight blues (#191970), purples (#663399), teals (#008b8b), and silver-white dots (#f5f5dc) against a cosmic blue background (#000080 to #191970 gradient)",
      vibrant: "vibrant cosmic palette: electric blues (#0066ff), luminous whites (#ffffff), light blues (#87ceeb), turquoise accents (#40e0d0), and gold highlights (#ffd700) against a deep space blue background (#000051 to #1a237e gradient)",
      monochrome: "sophisticated monochrome palette: pure whites (#ffffff), light grays (#d3d3d3), medium grays (#808080), and charcoal (#36454f) against a deep black background (#000000 to #1c1c1c gradient)"
    };
    
    prompt += `Color scheme: ${colorPalettes[colorPalette || 'vibrant']}. `;
    
    // Voice transcript emotional integration (more sophisticated)
    if (voiceTranscript && voiceTranscript.length > 5) {
      const lowerTranscript = voiceTranscript.toLowerCase();
      
      if (themes.peace || lowerTranscript.includes('peace') || lowerTranscript.includes('calm')) {
        prompt += "Incorporate symbols of inner peace: dove motifs, olive branches, and gentle wave patterns flowing through the dot work. ";
      }
      if (themes.love || lowerTranscript.includes('love') || lowerTranscript.includes('heart')) {
        prompt += "Include heart-centered symbolism: lotus flowers blooming from the center, infinity symbols, and radiating rays of compassion. ";
      }
      if (themes.strength || lowerTranscript.includes('strength') || lowerTranscript.includes('power')) {
        prompt += "Add symbols of inner strength: mountain-like triangular patterns, shield formations, and bold radiating lines of empowerment. ";
      }
      if (themes.growth || lowerTranscript.includes('growth') || lowerTranscript.includes('change')) {
        prompt += "Express transformation: spiral patterns, tree-like branching formations, and evolving geometric patterns that grow in complexity. ";
      }
      if (themes.gratitude || lowerTranscript.includes('grateful') || lowerTranscript.includes('thank')) {
        prompt += "Embody gratitude: sun-like radiating patterns, flowering motifs, and warm embracing circles that express appreciation. ";
      }
    }
    
    // Style-based enhancements
    const styleEnhancements = {
      traditional: "with classical mandala elements, traditional Buddhist and Hindu symbolism, and time-honored sacred geometry",
      modern: "with contemporary geometric interpretations, sleek minimalist elements, and innovative pattern combinations",
      abstract: "with experimental dot arrangements, unconventional symmetries, and artistic expression that breaks traditional boundaries",
      spiritual: "with deep sacred symbolism, chakra representations, and mystical elements that connect to universal consciousness"
    };
    
    prompt += `Design aesthetic: ${styleEnhancements[style || 'spiritual']}. `;
    
    // Final quality and composition details
    prompt += "Multiple layers of intricate dot work radiating from a powerful center motif outward through concentric rings of increasing complexity. ";
    prompt += "Perfect circular composition with museum-quality artistic detail, spiritual depth, and breathtaking beauty that inspires meditation and inner reflection. ";
    prompt += "Each dot placed with intention to create optical harmony and luminous effects that seem to glow with inner light.";
    
    return prompt;
  }
  
  // Helper method to extract themes from voice transcript
  private extractThemesFromVoice(voiceTranscript: string): {
    peace: boolean;
    love: boolean;
    strength: boolean;
    growth: boolean;
    gratitude: boolean;
  } {
    if (!voiceTranscript) {
      return { peace: false, love: false, strength: false, growth: false, gratitude: false };
    }
    
    const lower = voiceTranscript.toLowerCase();
    
    return {
      peace: /\b(peace|calm|serene|tranquil|quiet|still|harmony|balance)\b/.test(lower),
      love: /\b(love|heart|compassion|kindness|care|affection|warmth)\b/.test(lower),
      strength: /\b(strength|strong|power|courage|confident|brave|determined)\b/.test(lower),
      growth: /\b(grow|change|transform|evolve|progress|develop|journey|path)\b/.test(lower),
      gratitude: /\b(grateful|thank|appreciation|blessed|fortunate|abundance)\b/.test(lower)
    };
  }

  private generateFallbackMandala(prompt: string, brainwaveData?: { attention: number, meditation: number, signalQuality: number }): GeneratedMandala {
    // Create a data URL for a unique SVG mandala as fallback
    const svgMandala = this.createSVGMandala(prompt, brainwaveData);
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgMandala).toString('base64')}`;
    
    return {
      imageUrl: dataUrl,
      prompt: prompt,
      revisedPrompt: `Fallback mandala generated locally with unique variations: ${prompt}`
    };
  }

  private createSVGMandala(prompt: string, brainwaveData?: { attention: number, meditation: number, signalQuality: number }): string {
    // Create a unique seed based on input to ensure variety
    const seed = this.createSeedFromInput(prompt, brainwaveData);
    const seededRandom = this.createSeededRandom(seed);
    
    // Generate colors based on prompt content with variation
    const colors = this.extractColorsFromPrompt(prompt);
    const mandalaStyle = this.determineMandalaStyle(prompt);
    
    // Add variation to the colors based on seed
    const variantColors = this.addColorVariation(colors, seededRandom);
    
    return `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${this.generateGradients(variantColors, mandalaStyle, seededRandom)}
          ${this.generatePatterns(variantColors, seededRandom)}
          ${this.generateFilters()}
        </defs>
        
        <!-- Enhanced Background -->
        <rect width="512" height="512" fill="url(#bgGradient)"/>
        
        <!-- Multiple sophisticated mandala layers with more complexity -->
        <g transform="translate(256,256)">
          ${this.generateOuterRing(variantColors, mandalaStyle, seededRandom)}
          ${this.generateMiddleRings(variantColors, mandalaStyle, seededRandom)}
          ${this.generateInnerPatterns(variantColors, mandalaStyle, seededRandom)}
          ${this.generateDetailedPetals(variantColors, mandalaStyle, seededRandom)}
          ${this.generateSacredGeometry(variantColors, mandalaStyle, seededRandom)}
          ${this.generateDotPatterns(variantColors, mandalaStyle, seededRandom)}
          ${this.generateCenterMotif(variantColors, mandalaStyle, seededRandom)}
          
          <!-- Additional enhancement layers -->
          <g opacity="0.7">
            ${this.generateOuterRing(variantColors, mandalaStyle, seededRandom)}
          </g>
          <g opacity="0.5" transform="rotate(45)">
            ${this.generateDetailedPetals(variantColors, mandalaStyle, seededRandom)}
          </g>
        </g>
        
        <!-- Luminous overlay effects -->
        <circle cx="256" cy="256" r="250" fill="none" stroke="${variantColors.dots}" stroke-width="1" opacity="0.3"/>
        <circle cx="256" cy="256" r="200" fill="none" stroke="${variantColors.accent}" stroke-width="0.5" opacity="0.5"/>
      </svg>
    `;
  }

  // Helper methods (simplified versions of the OpenAI service methods)
  private createSeedFromInput(prompt: string, brainwaveData?: { attention: number, meditation: number, signalQuality: number }): number {
    let hash = 0;
    const str = prompt + (brainwaveData ? `${brainwaveData.attention}${brainwaveData.meditation}${brainwaveData.signalQuality}` : '');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private createSeededRandom(seed: number): () => number {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  private determineMandalaStyle(prompt: string): 'dotpainting' | 'geometric' | 'floral' | 'sacred' {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('dot') || lowerPrompt.includes('aboriginal')) return 'dotpainting';
    if (lowerPrompt.includes('geometric') || lowerPrompt.includes('sacred')) return 'sacred';
    if (lowerPrompt.includes('flower') || lowerPrompt.includes('petal')) return 'floral';
    
    return 'geometric'; // default
  }

  private extractColorsFromPrompt(prompt: string): { 
    center: string, outer: string, dots: string, accent: string, 
    secondary: string, tertiary: string, gradient: string[] 
  } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Enhanced color palettes
    let colors = {
      center: '#ffffff',
      outer: '#1a237e',
      dots: '#e3f2fd',
      accent: '#3949ab',
      secondary: '#26c6da',
      tertiary: '#42a5f5',
      gradient: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1976d2', '#1565c0']
    };
    
    // Color variations based on prompt
    if (lowerPrompt.includes('vibrant') || lowerPrompt.includes('bright')) {
      colors = {
        center: '#ffffff',
        outer: '#9c27b0',
        dots: '#e91e63',
        accent: '#ff9800',
        secondary: '#4caf50',
        tertiary: '#2196f3',
        gradient: ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800']
      };
    }
    
    return colors;
  }

  private addColorVariation(colors: any, seededRandom: () => number): any {
    // Add slight variations to colors based on seeded random
    return colors; // Simplified for now
  }

  private generateGradients(colors: any, style: string, seededRandom?: () => number): string {
    return `
      <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${colors.center};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.outer};stop-opacity:1" />
      </radialGradient>
    `;
  }

  private generatePatterns(colors: any, seededRandom?: () => number): string {
    return `
      <pattern id="dots" patternUnits="userSpaceOnUse" width="8" height="8">
        <circle cx="4" cy="4" r="1.5" fill="${colors.dots}" opacity="0.7"/>
      </pattern>
    `;
  }

  private generateFilters(): string {
    return `
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `;
  }

  private generateOuterRing(colors: any, style: string, seededRandom?: () => number): string {
    let ring = '';
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      const angle = (360 / petalCount) * i;
      ring += `
        <g transform="rotate(${angle})">
          <circle cx="0" cy="-180" r="8" fill="${colors.accent}" opacity="0.8"/>
          <circle cx="0" cy="-160" r="4" fill="${colors.dots}" opacity="0.9"/>
        </g>
      `;
    }
    return ring;
  }

  private generateMiddleRings(colors: any, style: string, seededRandom?: () => number): string {
    return `
      <circle r="120" fill="none" stroke="${colors.accent}" stroke-width="2" opacity="0.6"/>
      <circle r="80" fill="none" stroke="${colors.secondary}" stroke-width="1" opacity="0.7"/>
    `;
  }

  private generateInnerPatterns(colors: any, style: string, seededRandom?: () => number): string {
    return `
      <circle r="60" fill="none" stroke="${colors.tertiary}" stroke-width="2" opacity="0.8"/>
      <circle r="40" fill="none" stroke="${colors.dots}" stroke-width="1" opacity="0.9"/>
    `;
  }

  private generateDetailedPetals(colors: any, style: string, seededRandom?: () => number): string {
    let petals = '';
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (360 / count) * i;
      petals += `
        <g transform="rotate(${angle})">
          <circle cx="0" cy="-50" r="6" fill="${colors.accent}" opacity="0.7"/>
        </g>
      `;
    }
    return petals;
  }

  private generateSacredGeometry(colors: any, style: string, seededRandom?: () => number): string {
    return `
      <circle r="30" fill="none" stroke="${colors.dots}" stroke-width="1" opacity="0.5"/>
    `;
  }

  private generateDotPatterns(colors: any, style: string, seededRandom?: () => number): string {
    let dots = '';
    const rings = [20, 35, 50];
    
    rings.forEach((radius) => {
      const dotCount = Math.floor(radius / 2);
      for (let i = 0; i < dotCount; i++) {
        const angle = (360 / dotCount) * i;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        
        dots += `<circle cx="${x}" cy="${y}" r="2" fill="${colors.dots}" opacity="0.8"/>`;
      }
    });

    return dots;
  }

  private generateCenterMotif(colors: any, style: string, seededRandom?: () => number): string {
    return `
      <circle r="15" fill="${colors.center}" opacity="0.9"/>
      <circle r="10" fill="${colors.accent}" opacity="0.8"/>
      <circle r="5" fill="${colors.dots}" opacity="1"/>
    `;
  }
}