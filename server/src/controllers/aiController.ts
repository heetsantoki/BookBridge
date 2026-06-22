import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Resource from '../models/Resource';
import { AuthRequest } from '../middleware/auth';

// Helper to check if API key is set
const getGeminiClient = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return null;
};

export const generateDescription = async (req: AuthRequest, res: Response) => {
  try {
    const { title, author, resourceType, department, courseCode, condition } = req.body;

    if (!title || !resourceType) {
      return res.status(400).json({ success: false, message: 'Title and Resource Type are required to generate description' });
    }

    const aiClient = getGeminiClient();

    if (aiClient) {
      try {
        const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Act as an academic cataloger for BookBridge, a student-to-student peer resource exchange platform.
Generate a structured, engaging, and professional 3-sentence description for the following resource:
- Title: ${title}
- Author: ${author || 'Unknown'}
- Resource Type: ${resourceType}
- Department: ${department || 'General'}
- Course Code: ${courseCode || 'N/A'}
- Condition: ${condition || 'Good'}

Emphasize what syllabus content this resource generally covers, how it benefits students prepping for exams or lab works, and its value for the ${courseCode || department} course. Keep it concise, natural, and helpful.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return res.status(200).json({ success: true, description: text.trim() });
      } catch (geminiError) {
        console.error('Gemini API Error, falling back to local NLP generator:', geminiError);
      }
    }

    // Local smart NLP template fallback
    const fallbackTemplates = [
      `This "${title}" ${resourceType.toLowerCase()} is an essential resource for students in the ${department || 'academic'} department${courseCode ? ` studying course code ${courseCode}` : ''}. It is in ${condition.toLowerCase()} condition, covering core concepts, curriculum topics, and practice questions. Ideal for lectures, exam preparation, and reference studies.`,
      `A highly recommended ${resourceType.toLowerCase()} for the ${courseCode || department} class. Detailed and well-structured, this copy of "${title}" by ${author || 'various contributors'} helps students master foundational topics, complete course projects, and review past exam questions. In ${condition.toLowerCase()} condition.`,
      `Get ahead in your courses with this "${title}" ${resourceType.toLowerCase()}. Predefined specifically for the ${department} department curriculum, it serves as an excellent companion reference for coursework, homework solving, and test preparation. Handed down in ${condition.toLowerCase()} condition by a previous batch student.`
    ];

    const randomTemplate = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];
    return res.status(200).json({ success: true, description: randomTemplate });
  } catch (error: any) {
    console.error('AI Description Generation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAIRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userDept = req.user?.department;
    const userSemester = req.user?.semester;

    if (!userDept || !userSemester) {
      // Return latest resources if user details aren't filled
      const fallbackResources = await Resource.find({ status: 'Available' })
        .populate('owner', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(4);
      return res.status(200).json({
        success: true,
        recommendations: fallbackResources.map(r => ({
          resource: r,
          reason: 'Recommended based on overall popular resource requests'
        }))
      });
    }

    // Find resources from the same department and semester +/- 1 semester
    const targetResources = await Resource.find({
      department: userDept,
      semester: { $gte: Math.max(1, userSemester - 1), $lte: Math.min(8, userSemester + 1) },
      owner: { $ne: req.user!._id },
      status: 'Available'
    }).populate('owner', 'name avatar');

    const aiClient = getGeminiClient();

    if (aiClient && targetResources.length > 0) {
      try {
        const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const resourceListStr = targetResources.map((r, i) => 
          `Index ${i}: Title: "${r.title}", Type: "${r.resourceType}", Semester: ${r.semester}, Code: "${r.courseCode}"`
        ).join('\n');

        const prompt = `You are an AI academic advisor for a student in Department: "${userDept}", Semester: ${userSemester}.
Review these available peer listings:
${resourceListStr}

Select up to 4 resources that are most relevant to their academic semester or upcoming courses.
For each selection, write a very short, friendly 1-sentence personalized recommendation reason (e.g. "Critical study prep for your current math courses").
Return a JSON array ONLY in this format:
[
  { "index": <number>, "reason": "<string>" }
]`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // Remove markdown tags if any
        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }

        const recommendationsData = JSON.parse(text);

        const recommendations = recommendationsData.map((item: any) => {
          const resObj = targetResources[item.index];
          if (resObj) {
            return {
              resource: resObj,
              reason: item.reason
            };
          }
          return null;
        }).filter(Boolean);

        return res.status(200).json({ success: true, recommendations });
      } catch (geminiError) {
        console.error('Gemini Recommendation Error, falling back to rule-based recommendation logic:', geminiError);
      }
    }

    // Rules-based recommendation logic fallback
    const recommendations = targetResources.map(r => {
      let reason = `Matches your department (${userDept})`;
      if (r.semester === userSemester) {
        reason = `Perfect match for your current semester ${userSemester} courses!`;
      } else if (r.semester > userSemester) {
        reason = `Get a head start on next semester's (${r.semester}) curriculum!`;
      } else {
        reason = `Useful review resource from your previous semester (${r.semester}).`;
      }

      return {
        resource: r,
        reason
      };
    }).slice(0, 4);

    res.status(200).json({ success: true, recommendations });
  } catch (error: any) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
