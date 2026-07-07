/**
 * 학생들의 리뷰와 별점을 기반으로 AI 분석 결과를 시뮬레이션합니다.
 * 나중에 실제 AI API(예: Gemini API)로 변경하기 쉽도록 함수로 완전히 분리해두었습니다.
 * 
 * @param {Array} reviews - 리뷰 객체 배열 [{ id, nickname, rating, comment, bestMenu, worstMenu }]
 * @returns {Object} AI 분석 결과 객체
 */
export function summarizeReviews(reviews) {
  const total = reviews.length;
  
  if (total === 0) {
    return {
      summary: "아직 등록된 리뷰가 없습니다. 리뷰를 등록하면 실시간 AI 분석이 시작됩니다! ✍️",
      avgRating: 0,
      positivePercent: 0,
      neutralPercent: 0,
      negativePercent: 0,
      bestMenuVotes: {},
      worstMenuVotes: {},
      topBest: "없음",
      topWorst: "특별한 아쉬움 없음",
      posKeywords: [],
      negKeywords: [],
      feedbackCount: 0,
      moodTitle: "첫 리뷰를 기다리는 중",
      memeLine: "한줄평이 들어오면 급식 분위기를 바로 잡아낼게요.",
      improvements: ["첫 리뷰 등록", "메뉴 반응 수집"]
    };
  }

  // 1. 평균 별점 계산
  const sumRating = reviews.reduce((acc, r) => acc + Number(r.rating), 0);
  const avgRating = Number((sumRating / total).toFixed(1));

  // 2. 긍정/부정 감정 개수 계산 (별점 4-5점: 긍정, 3점: 중립, 1-2점: 아쉬움)
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  reviews.forEach(r => {
    const rate = Number(r.rating);
    if (rate >= 4) positiveCount++;
    else if (rate <= 2) negativeCount++;
    else neutralCount++;
  });

  // 비율 계산 (백분율)
  const positivePercent = Math.round((positiveCount / total) * 100);
  const neutralPercent = Math.round((neutralCount / total) * 100);
  const negativePercent = Math.round((negativeCount / total) * 100);

  // 3. 메뉴별 투표수 집계
  const bestMenuVotes = {};
  const worstMenuVotes = {};

  reviews.forEach(r => {
    if (r.bestMenu && r.bestMenu !== "선택 안 함" && r.bestMenu !== "없음") {
      bestMenuVotes[r.bestMenu] = (bestMenuVotes[r.bestMenu] || 0) + 1;
    }
    if (r.worstMenu && r.worstMenu !== "선택 안 함" && r.worstMenu !== "없음") {
      worstMenuVotes[r.worstMenu] = (worstMenuVotes[r.worstMenu] || 0) + 1;
    }
  });

  // 가장 득표가 많은 베스트/워스트 메뉴 추출 및 중복/오류 방지 로직 적용
  const sortedBest = Object.entries(bestMenuVotes).sort((a, b) => b[1] - a[1]);
  const topBest = sortedBest.length > 0 && sortedBest[0][1] > 0 ? sortedBest[0][0] : "없음";

  const sortedWorst = Object.entries(worstMenuVotes).sort((a, b) => b[1] - a[1]);
  let topWorst = "특별한 아쉬움 없음";

  if (sortedWorst.length > 0 && sortedWorst[0][1] > 0) {
    const initialTopWorst = sortedWorst[0][0];
    
    // 만약 인기 메뉴와 아쉬운 메뉴가 겹치는 경우
    if (initialTopWorst === topBest) {
      // 겹치지 않는 차순위 아쉬운 메뉴 후보를 탐색
      const alternative = sortedWorst.find(([menu, votes]) => menu !== topBest && votes > 0);
      if (alternative) {
        topWorst = alternative[0];
      } else {
        topWorst = "특별한 아쉬움 없음";
      }
    } else {
      topWorst = initialTopWorst;
    }
  } else {
    topWorst = "특별한 아쉬움 없음";
  }

  // 4. 키워드 분석 시뮬레이션
  const posKeywordsMap = {
    '맛있다': 0, '바삭하다': 0, '든든하다': 0, '좋다': 0, '최고': 0, 
    '꿀맛': 0, '부드럽다': 0, '상큼하다': 0, '달콤하다': 0, '대박': 0
  };
  
  const negKeywordsMap = {
    '짜다': 0, '싱겁다': 0, '아쉽다': 0, '차갑다': 0, '별로': 0, 
    '눅눅하다': 0, '질기다': 0, '적다': 0, '느끼하다': 0, '딱딱하다': 0
  };

  reviews.forEach(r => {
    const comment = r.comment || '';
    
    // 키워드 매칭
    Object.keys(posKeywordsMap).forEach(k => {
      if (comment.includes(k)) {
        posKeywordsMap[k] += 1;
      }
    });
    Object.keys(negKeywordsMap).forEach(k => {
      if (comment.includes(k)) {
        negKeywordsMap[k] += 1;
      }
    });
  });

  // 실제 카운트가 1 이상인 빈도순 정렬 키워드 추출
  const posKeywords = Object.entries(posKeywordsMap)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  const negKeywords = Object.entries(negKeywordsMap)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  // 5. AI 요약 문장 동적 조합
  let intro = `오늘 급식은 평균 별점 **${avgRating}점**으로, `;
  if (avgRating >= 4.3) {
    intro += "학생들 사이에서 매우 폭발적인 호응을 얻었습니다! 🎉 ";
  } else if (avgRating >= 3.8) {
    intro += "전반적으로 꽤 든든하고 만족도가 높은 편이었습니다. 👍 ";
  } else if (avgRating >= 3.0) {
    intro += "대체로 평이하고 무난한 반응을 보였습니다. 🙂 ";
  } else {
    intro += "오늘은 조리 상태나 메뉴 조합에 대한 아쉬운 피드백이 더 많았습니다. 😢 ";
  }

  let bestPart = "";
  if (topBest && topBest !== "없음") {
    bestPart = `오늘의 최고 인기 메뉴는 단연 **${topBest}**였으며, `;
    const keywordsUsed = posKeywords.slice(0, 2);
    if (keywordsUsed.length > 0) {
      bestPart += `학생들은 특히 리뷰에서 **"${keywordsUsed.join('", "')}"** 등의 표현을 사용해 높은 점수를 주었습니다. `;
    } else {
      bestPart += "많은 학생들이 맛있었다는 한줄평과 함께 적극 추천했습니다. ";
    }
  } else {
    bestPart = "특별히 한 가지 메뉴에 치우치지 않고 무난한 평점을 기록했습니다. ";
  }

  let worstPart = "";
  if (topWorst && topWorst !== "특별한 아쉬움 없음") {
    worstPart = `반면 아쉬운 메뉴로는 **${topWorst}**에 대한 표가 많았습니다. `;
    const keywordsUsed = negKeywords.slice(0, 2);
    if (keywordsUsed.length > 0) {
      worstPart += `주로 **"${keywordsUsed.join('", "')}"**와 같은 평가가 피드백으로 감지되어, 조리 수준이나 간의 조절에 주의가 필요해 보입니다. `;
    } else {
      worstPart += "식감이나 맛 조절 부분에서 개선이 필요하다는 지적이 일부 관찰되었습니다. ";
    }
  } else {
    worstPart = "오늘 급식에서는 딱히 불만을 제기하거나 아쉬워한 특정 메뉴가 나타나지 않았습니다. ";
  }

  let conclusion = "";
  if (avgRating >= 4.2) {
    conclusion = "전체적으로 학생들의 만족도가 매우 높았던 '특식 급식'급 완성도로 분석됩니다.";
  } else if (avgRating >= 3.5) {
    conclusion = "영양과 기호를 골고루 갖춘 식단이었으며, 가벼운 피드백을 반영한다면 더욱 훌륭한 급식이 될 것입니다.";
  } else {
    conclusion = "다음 식단 구성에서는 아쉬운 의견이 많았던 점을 적극 반영하여 레시피나 온도 관리를 보강할 필요가 있어 보입니다.";
  }

  const summary = `${intro}${bestPart}${worstPart}${conclusion}`;
  const moodTitle = avgRating >= 4.2
    ? "급식 만족 대축제 🎉"
    : avgRating >= 3.5
      ? "든든함은 합격, 디테일은 체크"
      : "다음 급식을 위한 피드백 수집 중";
  const memeLine = topBest && topBest !== "없음"
    ? `오늘 ${topBest}, 급식판 캐리했다.`
    : "오늘 급식, 꽤 괜찮은데?";
  const improvements = [
    topWorst !== "특별한 아쉬움 없음" ? `${topWorst} 반응 점검` : "오늘 만족도 유지",
    avgRating < 4 ? "간과 온도 체크" : "인기 메뉴 품질 유지"
  ];

  return {
    summary,
    avgRating,
    positivePercent,
    neutralPercent,
    negativePercent,
    bestMenuVotes,
    worstMenuVotes,
    topBest,
    topWorst,
    posKeywords: posKeywords.slice(0, 5), // 상위 5개 키워드만 반환
    negKeywords: negKeywords.slice(0, 5),
    feedbackCount: total,
    moodTitle,
    memeLine,
    improvements
  };
}
