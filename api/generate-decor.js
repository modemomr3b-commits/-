const { GoogleGenAI } = require('@google/genai');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const headerKey = req.headers['x-gemini-api-key'];
    const bodyKey = req.body?.customApiKey;
    const apiKey = (headerKey || bodyKey || process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'مفتاح GEMINI_API_KEY غير متوفر. إذا كان لديك حساب Gemini Pro، يرجى كتابة مفتاح API في الخيار المخصص داخل الاستوديو.' 
      });
    }

    const { imageBase64, prompt } = req.body || {};
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    let base64Data = '';
    if (imageBase64) {
      if (typeof imageBase64 === 'string' && (imageBase64.startsWith('http://') || imageBase64.startsWith('https://'))) {
        try {
          const imgRes = await fetch(imageBase64);
          const arrayBuffer = await imgRes.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
        } catch (e) {
          console.error('Failed to download image URL:', e);
        }
      } else if (typeof imageBase64 === 'string') {
        base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      }
    }

    let shoeDescription = '';
    if (base64Data) {
      try {
        const visionPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            { text: "Analyze this footwear item in detail. Describe its exact design, colors, patterns, sole type, strap/lace style, and material in 2 concise English sentences for product reproduction." }
          ]
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Vision timeout')), 4000)
        );

        const visionRes = await Promise.race([visionPromise, timeoutPromise]);
        shoeDescription = visionRes?.text || '';
      } catch (visionErr) {
        console.warn('Vision analysis skipped or timed out:', visionErr);
      }
    }

    const combinedPrompt = `Professional commercial footwear product advertisement photograph. ${shoeDescription ? `Product feature details: ${shoeDescription}.` : ''} ${prompt || 'High-end footwear display photograph.'} Maintain strict consistency with the shoe colors, design, and structure. Photorealistic studio shot, 8k resolution, crisp focus, cinematic lighting.`;

    let generatedImageUrl = '';

    // Attempt 1: Imagen 3.0 Generate 002
    try {
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: combinedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        }
      });

      if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
        generatedImageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
      }
    } catch (genImgErr) {
      console.warn('imagen-3.0-generate-002 failed:', genImgErr?.message || genImgErr);
    }

    // Attempt 2: Imagen 3.0 Generate 001
    if (!generatedImageUrl) {
      try {
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-3.0-generate-001',
          prompt: combinedPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1'
          }
        });

        if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
          generatedImageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
        }
      } catch (genImgErr2) {
        console.warn('imagen-3.0-generate-001 failed:', genImgErr2?.message || genImgErr2);
      }
    }

    // Attempt 3: Gemini 2.5 Flash Multimodal Fallback
    if (!generatedImageUrl) {
      try {
        const parts = [];
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          });
        }
        parts.push({ text: `Generate a photorealistic footwear advertisement image based on this product and prompt: ${combinedPrompt}` });

        const contentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts }
        });

        if (contentResponse.candidates && contentResponse.candidates[0]?.content?.parts) {
          for (const part of contentResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (genContentErr) {
        console.warn('Gemini 2.5 flash content generation failed:', genContentErr?.message || genContentErr);
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ 
        error: 'تعذر توليد الصورة من نماذج الذكاء الاصطناعي. إذا كنت تستخدم مفتاح API خاص بك، يرجى التأكد من تفعيل خدمة Imagen عليه.' 
      });
    }

    return res.json({ imageUrl: generatedImageUrl });
  } catch (error) {
    console.error('Error in generate-decor:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء توليد الصورة بالذكاء الاصطناعي' });
  }
};
