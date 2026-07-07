import { summarizeReviews } from './aiSummarizer';
import { generateLocalTasteCard } from './geminiShared';

export {
  buildMealReportPrompt,
  buildTasteCardPrompt,
  generateLocalTasteCard
} from './geminiShared';

async function callGeminiProxy(action, payload) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `AI 서버 응답 오류 (Status: ${response.status})`);
  }

  return data;
}

/**
 * Vercel 서버 함수에 숨겨진 Gemini API 키로 전체 학생 리뷰 리포트를 생성합니다.
 * 서버 환경변수가 없거나 호출에 실패하면 로컬 분석 결과로 자동 대체합니다.
 * @param {Array} reviews - 전체 리뷰 배열
 * @returns {Promise<Object>} 분석 완료 리포트 및 통계 데이터
 */
export async function generateAiMealReport(reviews) {
  const localStats = summarizeReviews(reviews);

  try {
    return await callGeminiProxy('mealReport', { reviews });
  } catch (error) {
    console.error('Gemini 서버 분석 실패, 로컬 결과로 백업합니다:', error);
    return {
      ...localStats,
      moodTitle: 'AI 분석 연결 대기 중',
      summary: `AI 분석 호출 실패로 로컬 요약을 표시합니다. (사유: ${error.message}) ` + localStats.summary,
      memeLine: '오히려 좋아, 다음 급식도 가보자고!',
      improvements: ['서버 API 키 설정 확인', 'Vercel 재배포 확인'],
      isLocalFallback: true,
      apiError: error.message
    };
  }
}

/**
 * Vercel 서버 함수에 숨겨진 Gemini API 키로 학생 개별 급식 취향 카드를 생성합니다.
 * 서버 환경변수가 없거나 호출에 실패하면 로컬 카드로 자동 대체합니다.
 * @param {Object} review - 학생 리뷰 객체
 * @returns {Promise<Object>} 개인 취향 분석 카드 데이터
 */
export async function generatePersonalTasteCard(review) {
  const localCard = generateLocalTasteCard(review);

  try {
    return await callGeminiProxy('tasteCard', { review });
  } catch (error) {
    console.error('Gemini 서버 개인 취향 생성 실패, 로컬 결과로 대체합니다:', error);
    return {
      ...localCard,
      apiError: error.message
    };
  }
}
