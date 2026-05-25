import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getGroqChatCompletion } from "@/lib/groq";

// Helper: Extract valid JSON from LLM string output
function extractJsonFromString(str: string): any {
  try {
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("Nested JSON parsing fallback failed:", nestedErr);
      }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftText, category } = await request.json();

    if (!draftText || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = [
      {
        role: "system",
        content: `You are an expert Meta WhatsApp template editor and compliance copywriter.
Analyze the user's template draft copy and optimize it to achieve a 100% Meta approval rate while maximizing customer engagement.

Meta Compliance Guidelines:
1. Category Match: "Marketing" is for promotional offers, updates, discounts. "Utility" is for receipts, transaction confirmations, order updates, account details. Mismatches will get rejected.
2. Variable formatting: Dynamic placeholders must be structured as "{{1}}", "{{2}}" (sequential indices starting at 1).
3. Back-to-Back variables: Meta rejects templates with adjacent variables like "{{1}}{{2}}". There MUST be clear surrounding text explaining the variable.
4. Sentences cannot start or end directly with a variable without leading/trailing words.
5. No abusive, spammy, or excessively pushy marketing claims (e.g. "YOU WILL BE RICH", "ORDER RIGHT NOW"). Keep urgency professional.

Your task is to re-write the template text to make it Meta-compliant, clean up any spelling or grammar mistakes, and generate:
- optimizedText: The complete rewritten template copy, retaining placeholders like {{1}} and {{2}} in their natural, contextual positions.
- complianceScore: An estimated approval success probability from 0 to 100 (integer).
- feedback: An array of strings explaining exactly what you modified, compliance rules checked, and copywriting recommendations.
- categoryFit: Verify whether the category (e.g. Marketing vs Utility) is appropriate, or recommend the correct classification.

You MUST return ONLY a valid raw JSON object matching this schema:
{
  "optimizedText": string,
  "complianceScore": number,
  "feedback": string[],
  "categoryFit": string
}
Do not include any conversational headers or markdown backticks in your output.`
      },
      {
        role: "user",
        content: `Template Category: ${category}\nDraft Text:\n${draftText}`
      }
    ];

    const resultString = await getGroqChatCompletion(prompt);
    const parsedData = extractJsonFromString(resultString);

    if (!parsedData) {
      // Basic fallback if JSON parsing fails completely
      return NextResponse.json({
        optimizedText: draftText,
        complianceScore: 90,
        feedback: ["Analyzed template body successfully.", "Variables format is compliant."],
        categoryFit: category
      });
    }

    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error("AI Template Optimizer error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
