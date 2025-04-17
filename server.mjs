import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import 'dotenv/config'; 

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint for generating course overview and lesson content
app.post("/api/generate-course", async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    const { title, description, category } = req.body;
    
    const systemPrompt = `You are an expert course creator specializing in creating structured educational content. 
Your task is to create a complete course structure with lessons containing actual educational content.`;

    const userPrompt = `Create a course outline for a course titled "${title}" with the description: "${description}".
The course should be in the category: "${category || 'General'}".

Please provide:
1. A brief course overview (2-3 sentences)
2. 4-5 lessons with clear titles (e.g., "Lesson 1: Introduction to [Topic]")
3. For EACH lesson, create detailed educational content (3-5 paragraphs) that teaches the actual material, not just descriptions of what will be covered.

Format the response as follows:
# ${title}
**Category:** ${category}
## Course Overview
[Course overview content here]

## Lesson 1: [Lesson Title]
[Detailed lesson content here - 3-5 paragraphs of actual educational material]

## Lesson 2: [Lesson Title]
[Detailed lesson content here - 3-5 paragraphs of actual educational material]

And so on for each lesson.`;

    const payload = {
      model: "claude-3-opus-20240229",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.7,
    };
    
    console.log("Sending payload to Anthropic API");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("Anthropic raw error response:", errData);
      throw new Error(`Anthropic API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Received response from Anthropic API");
    
    // Extract outline
    const outline = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text.trim()
      : "No outline generated.";
    
    // Parse outline into simplified strucuture
    const parsedOutline = parseSimplifiedOutline(outline);
    
    res.json({ 
      outline,
      parsedOutline
    });
  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({ 
      error: "Failed to generate course outline.", 
      details: error.message 
    });
  }
});

function parseSimplifiedOutline(outlineText) {
  try {
    const structure = {
      overview: "",
      lessons: []
    };
    
    const lines = outlineText.split('\n').filter(line => line.trim() !== '');
    
    let currentLesson = null;
    let inOverview = false;
    let overviewLines = [];
    let lessonContentLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^##\s*Course\s+Overview/i)) {
        inOverview = true;
        continue;
      }
      
      if (trimmedLine.match(/^##\s*Lesson\s+\d+:/i)) {
        inOverview = false;
        
        if (overviewLines.length > 0 && !structure.overview) {
          structure.overview = overviewLines.join('\n');
          overviewLines = [];
        }
        
        if (currentLesson && lessonContentLines.length > 0) {
          currentLesson.content = lessonContentLines.join('\n');
          lessonContentLines = [];
        }
        
        // Create a new lesson
        currentLesson = {
          title: trimmedLine.replace(/^##\s*/, ''),
          content: ""
        };
        structure.lessons.push(currentLesson);
      }
      else if (inOverview) {
        overviewLines.push(trimmedLine);
      }
      else if (currentLesson) {
        lessonContentLines.push(trimmedLine);
      }
      else if (trimmedLine.match(/^#\s/) || trimmedLine.match(/^\*\*Category:/)) {
        continue;
      }
      else {
        overviewLines.push(trimmedLine);
      }
    }
    
    if (overviewLines.length > 0 && !structure.overview) {
      structure.overview = overviewLines.join('\n');
    }
    
    if (currentLesson && lessonContentLines.length > 0) {
      currentLesson.content = lessonContentLines.join('\n');
    }
    
    // If we didn't find any lessons, create a default structure
    if (structure.lessons.length === 0) {
      structure.lessons.push({
        title: "Lesson 1: Introduction",
        content: "This lesson introduces the key concepts of this course."
      });
    }
    
    return structure;
  } catch (error) {
    console.error("Error parsing outline:", error);
    // Return a basic structure with the original text
    return {
      overview: outlineText,
      lessons: [{
        title: "Lesson 1: Introduction",
        content: "This lesson introduces the key concepts of this course."
      }]
    };
  }
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
