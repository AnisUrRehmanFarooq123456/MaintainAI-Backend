import AssetModel from "../model/asset-model.js";
import IssueModel from "../model/issue-model.js";
import MaintenanceModel from "../model/maintenance-model.js";

const TriageIssue = async (req, res) => {
    try {
        const { assetType, assetCondition, assetLocation, recentHistory, complaint } = req.body;

        if (!complaint || complaint.trim().length < 5) {
            return res.status(400).send({
                status: false,
                message: "A meaningful complaint description is required"
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("[TriageIssue] GEMINI_API_KEY is missing from process.env — check your .env file and restart the server.");
            return res.status(200).send({
                status: true,
                message: "AI suggestion unavailable, please fill in the details manually",
                aiAvailable: false,
                data: {
                    title: "",
                    category: "",
                    priority: "Medium",
                    possibleCauses: [],
                    initialChecks: []
                }
            });
        }

        const prompt = `You are an AI maintenance triage assistant. Given the asset context and complaint below, respond ONLY with a valid JSON object, no extra text, no markdown fences, in this exact shape:
{
  "title": "short professional issue title",
  "category": "short category",
  "priority": "Low|Medium|High|Critical",
  "possibleCauses": ["cause1", "cause2"],
  "initialChecks": ["safe check1", "safe check2"]
}
Never suggest unsafe electrical, mechanical, fire, or industrial actions — recommend a qualified technician instead for anything hazardous.

Asset type: ${assetType || "unknown"}
Asset condition: ${assetCondition || "unknown"}
Asset location: ${assetLocation || "unknown"}
Recent history: ${recentHistory || "none"}
Complaint: ${complaint}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let aiResponse;
        try {
            const model = "gemini-2.0-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) {
                // Log the ACTUAL reason Gemini rejected the request —
                // this is almost always an invalid/missing API key, a
                // disabled API, or a quota/billing issue. The old code
                // swallowed this completely.
                const errorBody = await response.text();
                console.error(`[TriageIssue] Gemini API error — status ${response.status}:`, errorBody);
                throw new Error(`AI service returned status ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (!rawText) {
                console.error("[TriageIssue] Gemini responded but with no candidate text:", JSON.stringify(data));
                throw new Error("AI service returned an empty response");
            }

            const cleaned = rawText.replace(/```json|```/g, "").trim();

            try {
                aiResponse = JSON.parse(cleaned);
            } catch (parseErr) {
                console.error("[TriageIssue] Failed to parse AI response as JSON. Raw text was:", rawText);
                throw new Error("AI service returned malformed JSON");
            }
        } catch (aiError) {
            clearTimeout(timeout);
            console.error("[TriageIssue] AI Triage Error/Timeout:", aiError.message);
            return res.status(200).send({
                status: true,
                message: "AI suggestion unavailable, please fill in the details manually",
                aiAvailable: false,
                data: {
                    title: "",
                    category: "",
                    priority: "Medium",
                    possibleCauses: [],
                    initialChecks: []
                }
            });
        }

        return res.status(200).send({
            status: true,
            message: "AI triage generated successfully",
            aiAvailable: true,
            data: aiResponse
        });
    } catch (error) {
        console.error("[TriageIssue] Unhandled error:", error);
        return res.status(500).send({
            status: false,
            message: "Error While Running AI Triage"
        });
    }
};

const GetPreventiveRecommendation = async (req, res) => {
    try {
        const { assetId } = req.params;

        const asset = await AssetModel.findById(assetId);
        if (!asset) {
            return res.status(404).send({ status: false, message: "Asset not found" });
        }

        const recentIssues = await IssueModel.find({ asset: assetId }).sort({ createdAt: -1 }).limit(10).select("title category priority createdAt");
        const recentMaintenance = await MaintenanceModel.find({ asset: assetId }).sort({ completedAt: -1 }).limit(10).select("workPerformed totalCost completedAt finalCondition");

        if (recentIssues.length === 0) {
            return res.status(200).send({
                status: true,
                data: { recommendation: "Not enough history yet to generate a preventive recommendation. This asset has no reported issues on record." }
            });
        }

        const historyText = recentIssues.map((i) => `- ${i.title} (${i.category || "uncategorized"}, ${i.priority}) on ${i.createdAt.toDateString()}`).join("\n");
        const maintenanceText = recentMaintenance.map((m) => `- ${m.workPerformed} (Rs. ${m.totalCost}) on ${m.completedAt?.toDateString()}`).join("\n");

        const prompt = `You are an asset maintenance analyst. Based on this asset's issue and maintenance history, identify any recurring failure patterns and give a short, actionable preventive maintenance recommendation (2-4 sentences). Respond ONLY with a valid JSON object, no markdown fences, in this shape:
{
  "hasPattern": true or false,
  "recommendation": "short actionable text"
}

Asset: ${asset.name} (${asset.category || "uncategorized"})
Recent Issues:
${historyText}

Recent Maintenance:
${maintenanceText || "None recorded"}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const model = "gemini-2.0-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 300 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[GetPreventiveRecommendation] Gemini API error — status ${response.status}:`, errorBody);
                throw new Error("AI service error");
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleaned = rawText.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);

            return res.status(200).send({ status: true, data: parsed });
        } catch (aiError) {
            clearTimeout(timeout);
            console.error("[GetPreventiveRecommendation] AI error:", aiError.message);
            return res.status(200).send({
                status: true,
                data: { hasPattern: false, recommendation: "AI recommendation temporarily unavailable. Please review the issue history manually." }
            });
        }
    } catch (error) {
        console.error("[GetPreventiveRecommendation] Unhandled error:", error);
        return res.status(500).send({ status: false, message: "Error While Generating Preventive Recommendation" });
    }
};

export { TriageIssue, GetPreventiveRecommendation };