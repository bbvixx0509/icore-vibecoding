import { summarizeReviews } from '../src/utils/aiSummarizer.js';
import {
  buildMealReportPrompt,
  buildTasteCardPrompt,
  generateLocalTasteCard
} from '../src/utils/geminiShared.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return req.body;
}

async function askGemini(prompt, apiKey) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API 응답 오류 (Status: ${response.status})`);
  }

  const data = await response.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) {
    throw new Error('Gemini API에서 올바른 응답을 받지 못했습니다.');
  }

  return JSON.parse(jsonText);
}

async function createMealReport(reviews, apiKey) {
  const localStats = summarizeReviews(reviews);

  if (!apiKey) {
    return {
      ...localStats,
      moodTitle: '서버 AI 키 설정 대기 중',
      memeLine: localStats.avgRating >= 4.0 ? '오늘 돈까스, 급식판 캐리했다.' : '오히려 좋아, 다음 급식 고(GO)',
      improvements: ['Vercel 환경변수 설정', '배포 재시작 확인'],
      isLocalFallback: true,
      apiError: 'GEMINI_API_KEY is not configured.'
    };
  }

  try {
    const result = await askGemini(buildMealReportPrompt(reviews), apiKey);

    return {
      ...localStats,
      moodTitle: result.moodTitle || '실시간 분석 완료',
      summary: result.summary || localStats.summary,
      memeLine: result.memeLine || '오늘 급식, 꽤 괜찮은데?',
      improvements: result.improvements || ['김치찌개 간 조절', '디저트 양 보강'],
      posKeywords: result.positiveKeywords || localStats.posKeywords,
      negKeywords: result.negativeKeywords || localStats.negKeywords,
      isLocalFallback: false
    };
  } catch (error) {
    console.error('Gemini meal report failed:', error);
    return {
      ...localStats,
      moodTitle: 'AI 분석 연결 대기 중',
      summary: `AI 분석 호출 실패로 로컬 요약을 표시합니다. (사유: ${error.message}) ` + localStats.summary,
      memeLine: '오히려 좋아, 다음 급식도 가보자고!',
      improvements: ['서버 API 키 확인', '네트워크 상태 점검'],
      isLocalFallback: true,
      apiError: error.message
    };
  }
}

async function createTasteCard(review, apiKey) {
  const localCard = generateLocalTasteCard(review);

  if (!apiKey) {
    return {
      ...localCard,
      apiError: 'GEMINI_API_KEY is not configured.'
    };
  }

  try {
    const result = await askGemini(buildTasteCardPrompt(review), apiKey);

    return {
      typeName: result.typeName || localCard.typeName,
      oneLiner: result.oneLiner || localCard.oneLiner,
      tags: result.tags || localCard.tags,
      friendMatch: result.friendMatch || localCard.friendMatch,
      isLocalTaste: false
    };
  } catch (error) {
    console.error('Gemini taste card failed:', error);
    return {
      ...localCard,
      apiError: error.message
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (body.action === 'mealReport') {
      const reviews = Array.isArray(body.reviews) ? body.reviews : [];
      sendJson(res, 200, await createMealReport(reviews, apiKey));
      return;
    }

    if (body.action === 'tasteCard') {
      if (!body.review || typeof body.review !== 'object') {
        sendJson(res, 400, { error: 'review is required' });
        return;
      }

      sendJson(res, 200, await createTasteCard(body.review, apiKey));
      return;
    }

    sendJson(res, 400, { error: 'Unknown action' });
  } catch (error) {
    console.error('Gemini API route failed:', error);
    sendJson(res, 500, { error: error.message || 'AI server error' });
  }
}
