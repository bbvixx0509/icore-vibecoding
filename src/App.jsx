import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Star,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Database,
  Activity,
  Sliders
} from 'lucide-react';
import './App.css';
import { generateAiMealReport, generatePersonalTasteCard } from './utils/geminiApi';
import { summarizeReviews } from './utils/aiSummarizer';

// 오늘의 급식 메뉴 데이터
const TODAY_MENU = [
  { name: "등심돈까스", tags: ["인기예상", "든든함"], tagTypes: ["popular", "healthy"] },
  { name: "얼큰김치찌개", tags: ["매콤함", "든든함"], tagTypes: ["spicy", "healthy"] },
  { name: "양배추샐러드", tags: ["새콤달콤"], tagTypes: ["healthy"] },
  { name: "상큼요구르트", tags: ["디저트"], tagTypes: ["dessert"] }
];

// 디폴트 샘플 리뷰 데이터
const DEFAULT_REVIEWS = [
  {
    id: 'sample-1',
    nickname: '돈까스러버',
    rating: 5,
    comment: '돈까스가 진짜 겉바속촉 역대급 맛있어요!! 소스도 꿀맛이고 요구르트랑 찰떡궁합입니다.',
    bestMenu: '등심돈까스',
    worstMenu: '선택 안 함',
    date: '2026-07-07 12:10'
  },
  {
    id: 'sample-2',
    nickname: '맵찔이3학년',
    rating: 4,
    comment: '돈까스가 느끼할 때쯤 김치찌개 한 입 먹어주면 싹 가셔요. 김치찌개는 매콤해서 좋았어요.',
    bestMenu: '얼큰김치찌개',
    worstMenu: '선택 안 함',
    date: '2026-07-07 12:15'
  },
  {
    id: 'sample-3',
    nickname: '영양부장',
    rating: 3,
    comment: '샐러드가 아주 아삭하고 신선해서 상큼했습니다. 다만 김치찌개가 오늘따라 국물이 좀 짜네요.',
    bestMenu: '양배추샐러드',
    worstMenu: '얼큰김치찌개',
    date: '2026-07-07 12:22'
  },
  {
    id: 'sample-4',
    nickname: '식단평가단',
    rating: 5,
    comment: '오늘 식단 밸런스 대박 든든합니다! 매일매일 돈까스 나왔으면 좋겠어요.',
    bestMenu: '등심돈까스',
    worstMenu: '선택 안 함',
    date: '2026-07-07 12:35'
  },
  {
    id: 'sample-5',
    nickname: '급식실단골',
    rating: 4,
    comment: '돈까스는 언제나 진리입니다. 요구르트가 더 시원하고 컸으면 완벽했을 텐데 그건 아쉽네요!',
    bestMenu: '등심돈까스',
    worstMenu: '상큼요구르트',
    date: '2026-07-07 12:40'
  }
];

function App() {
  // 1. 리뷰 리스트 상태 (localStorage)
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem('meal_reviews');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage reviews', e);
      }
    }
    return DEFAULT_REVIEWS;
  });

  // 2. Gemini AI 설정 안내 모달 상태
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);

  // 3. 개인 급식 취향 타입 카드 상태
  const [personalTaste, setPersonalTaste] = useState(() => {
    const saved = localStorage.getItem('meal_personal_taste');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage taste card', e);
      }
    }
    return null;
  });
  const [isTasteCardLoading, setIsTasteCardLoading] = useState(false);

  // 4. AI 리포트 분석 결과 상태
  const [aiResult, setAiResult] = useState({
    summary: "급식 분석 데이터를 집계하는 중입니다...",
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
    moodTitle: "오늘 급식 분위기 분석 중 ⏳",
    memeLine: "오늘 돈까스, 급식판 캐리했다.",
    improvements: [],
    isLocalFallback: true
  });
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 5. 리뷰 입력 폼 상태
  const [nickname, setNickname] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [bestMenu, setBestMenu] = useState('등심돈까스');
  const [worstMenu, setWorstMenu] = useState('선택 안 함');
  const [formError, setFormError] = useState('');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  // 리뷰 변경 시 localStorage 동기화
  useEffect(() => {
    localStorage.setItem('meal_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // AI 리포트 분석 갱신 함수
  const updateAiReport = async (currentReviews) => {
    const localStats = summarizeReviews(currentReviews);
    setAiResult((prev) => ({
      ...prev,
      ...localStats,
      isLocalFallback: true
    }));

    setIsAiLoading(true);
    try {
      const report = await generateAiMealReport(currentReviews);
      setAiResult(report);
    } catch (e) {
      console.error("AI 리포트 갱신 중 실패:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 마운트 시점 리포트 로드
  useEffect(() => {
    updateAiReport(reviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 오늘 날짜 한글 포맷팅
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const day = dayNames[d.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
  }, []);

  // 리뷰 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setShowSuccessMsg(false);

    // 유효성 검사
    if (!nickname.trim()) {
      setFormError('학번 혹은 닉네임을 적어주세요!');
      return;
    }
    if (!comment.trim()) {
      setFormError('급식 한줄평을 채워주세요!');
      return;
    }
    if (comment.trim().length < 5) {
      setFormError('피드백 분석을 위해 최소 5자 이상 작성이 필수입니다.');
      return;
    }

    // 작성 시점 
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${now.toISOString().split('T')[0]} ${hours}:${minutes}`;

    const newReview = {
      id: `review-${Date.now()}`,
      nickname: nickname.trim(),
      rating,
      comment: comment.trim(),
      bestMenu,
      worstMenu,
      date: timeString
    };

    // 리뷰 배열 상태 업데이트
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);

    // 폼 클리어
    setNickname('');
    setRating(5);
    setComment('');
    setBestMenu(TODAY_MENU[0].name);
    setWorstMenu('선택 안 함');

    setShowSuccessMsg(true);
    setTimeout(() => {
      setShowSuccessMsg(false);
    }, 3000);

    // 1. 개인 취향 타입 카드 즉시 생성
    setIsTasteCardLoading(true);
    try {
      const taste = await generatePersonalTasteCard(newReview);
      setPersonalTaste(taste);
      localStorage.setItem('meal_personal_taste', JSON.stringify(taste));
    } catch (err) {
      console.error("취향 카드 생성 실패", err);
    } finally {
      setIsTasteCardLoading(false);
    }

    // 2. 전체 AI 리포트 자동 갱신
    updateAiReport(updatedReviews);
  };

  // 초기화 복원 처리
  const handleReset = () => {
    if (window.confirm('리뷰 데이터를 초기 샘플 데이터로 복원하시겠습니까?')) {
      setReviews(DEFAULT_REVIEWS);
      updateAiReport(DEFAULT_REVIEWS);
      setShowSuccessMsg(false);
      setFormError('');
      setPersonalTaste(null);
      localStorage.removeItem('meal_personal_taste');
    }
  };

  // 데이터 전체 삭제
  const handleClearAll = () => {
    if (window.confirm('모든 리뷰 데이터를 삭제하시겠습니까? AI 분석의 빈 상태를 확인할 수 있습니다.')) {
      setReviews([]);
      updateAiReport([]);
      setShowSuccessMsg(false);
      setFormError('');
      setPersonalTaste(null);
      localStorage.removeItem('meal_personal_taste');
    }
  };

  // API 설정 안내 모달 제어
  const openSettings = () => {
    setIsApiSettingsOpen(true);
  };

  // 텍스트 중 **강조** 표시를 <strong> 태그로 변환해서 렌더링하는 헬퍼 함수
  const renderFormattedText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // 별표 렌더링 헬퍼 함수
  const renderStarIcons = (count) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < count ? "var(--accent-orange)" : "none"}
        color={i < count ? "var(--accent-orange)" : "#cbd5e1"}
      />
    ));
  };

  // 메뉴별 커스텀 이모지 매핑 헬퍼
  const getMenuEmoji = (name) => {
    if (name.includes('돈까스')) return '🍛';
    if (name.includes('찌개')) return '🍲';
    if (name.includes('샐러드')) return '🥗';
    if (name.includes('요구르트')) return '🥤';
    return '🍱';
  };

  return (
    <div className="app-container">
      {/* 1. 상단 Command Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-container">
            <Cpu size={16} className="logo-ai-icon" />
            <div className="logo-node-dot"></div>
          </div>
          <div className="logo-title-group">
            <h1>MealMood <span style={{ color: 'var(--cyan)' }}>AI</span></h1>
            <p>오늘급식 인사이트</p>
          </div>
        </div>

        {/* 웹쟁이 스타일 필터/칩 네비게이션 */}
        <div className="top-filter-pills" aria-label="화면 섹션 바로보기">
          <span className="top-filter-pill active">AI 리포트</span>
          <span className="top-filter-pill">오늘의 메뉴</span>
          <span className="top-filter-pill">실시간 리뷰</span>
        </div>

        <div className="header-meta">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
            {todayFormatted}
          </span>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>분석 중</span>
          </div>
          <div className="data-count-badge">
            <Database size={13} color="var(--purple)" />
            <span>리뷰 {reviews.length}건</span>
          </div>
          <button className="settings-trigger-btn" onClick={openSettings}>
            <Sliders size={13} />
            <span>AI 설정</span>
          </button>
        </div>
      </header>

      {/* 2. 오늘의 AI 리포트 (Hero Panel) */}
      <section className={`card ai-summary-card ${isAiLoading ? 'loading-pulse' : ''}`}>
        <div className="hero-card-grid">
          {/* Hero Left: Headline, 요약, 코멘트 */}
          <div className="hero-left-col">
            <div className="card-header-with-action" style={{ marginBottom: '0.8rem', borderBottom: 'none' }}>
              <h2 className="card-title" style={{ fontSize: '0.75rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                <Sparkles size={14} style={{ color: 'var(--cyan)' }} />
                오늘의 AI 리포트
              </h2>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', lineHeight: 1.3 }}>
              {aiResult.moodTitle}
            </h3>

            {/* AI 요약 설명 본문 (최대 2문장) */}
            <div style={{ position: 'relative', marginBottom: '1.25rem', paddingLeft: '0.25rem' }}>
              {isAiLoading && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', zIndex: 10, borderRadius: 'var(--radius-sm)' }}>
                  <span className="status-dot"></span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan)' }}>AI 실시간 분석 중...</span>
                </div>
              )}
              {(() => {
                const summaryData = aiResult.summary;
                const sentences = typeof summaryData === 'string'
                  ? summaryData.split(/(?<=[.!?])\s+/).filter(Boolean)
                  : summaryData;

                if (!sentences || sentences.length === 0) {
                  return <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>등록된 피드백이 없습니다.</p>;
                }

                return sentences.slice(0, 2).map((sentence, idx) => (
                  <p 
                    key={idx} 
                    style={{ 
                      fontSize: '0.92rem', 
                      color: 'var(--text-body)', 
                      lineHeight: '1.7', 
                      marginTop: 0,
                      marginBottom: idx === 0 && sentences.length > 1 ? '0.5rem' : '0', 
                      fontWeight: 500,
                      wordBreak: 'keep-all',
                      paddingRight: '1.5rem'
                    }}
                  >
                    {renderFormattedText(sentence)}
                  </p>
                ));
              })()}
            </div>

            {/* AI 한 줄 코멘트 */}
            {aiResult.memeLine && (
              <div className="meme-highlight-box" style={{
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(34, 211, 238, 0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  💬 AI 한 줄 코멘트
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', fontStyle: 'italic' }}>
                  "{aiResult.memeLine}"
                </div>
              </div>
            )}
          </div>

          {/* Hero Right: 핵심 지표 스탯칩, 개선 포인트 */}
          <div className="hero-right-col">
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              실시간 핵심 지표
            </div>
            
            {/* 핵심 스탯 칩 그룹 */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="keyword-chip pos" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 700, backgroundColor: 'rgba(52, 211, 153, 0.1)', color: 'var(--mint)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
                ⭐ 평점 {aiResult.avgRating}점
              </span>
              <span className="keyword-chip pos" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', fontWeight: 700, backgroundColor: 'rgba(34, 211, 238, 0.1)', color: 'var(--cyan)', borderColor: 'rgba(34, 211, 238, 0.2)' }}>
                👍 인기: {aiResult.topBest || '없음'}
              </span>
              <span className="keyword-chip neg" style={{ 
                fontSize: '0.75rem', 
                padding: '0.3rem 0.65rem', 
                fontWeight: 700, 
                backgroundColor: aiResult.topWorst === "특별한 아쉬움 없음" ? 'rgba(255,255,255,0.03)' : 'rgba(251, 113, 133, 0.1)', 
                color: aiResult.topWorst === "특별한 아쉬움 없음" ? 'var(--text-muted)' : 'var(--danger)', 
                borderColor: aiResult.topWorst === "특별한 아쉬움 없음" ? 'var(--border)' : 'rgba(251, 113, 133, 0.2)' 
              }}>
                👎 아쉬움: {aiResult.topWorst}
              </span>
            </div>

            {/* 개선 포인트 (미니 칩/태그 형태) */}
            {aiResult.improvements && aiResult.improvements.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  💡 개선 포인트
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {aiResult.improvements.slice(0, 2).map((imp, idx) => (
                    <span key={idx} className="keyword-chip pos" style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      color: 'var(--text-body)',
                      borderColor: 'var(--border)',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      fontWeight: 700,
                      borderRadius: '3px'
                    }}>
                      🛠️ {imp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 감정 분석 통계 (만족 vs 보통 vs 아쉬움) */}
            <div className="sentiment-section" style={{ margin: 0 }}>
              <div className="stat-label-row">
                <span className="sentiment-label-pos">😊 만족 ({aiResult.positivePercent}%)</span>
                <span className="sentiment-label-neu">😐 보통 ({aiResult.neutralPercent}%)</span>
                <span className="sentiment-label-neg">😔 아쉬움 ({aiResult.negativePercent}%)</span>
              </div>
              <div className="sentiment-bar-track">
                {reviews.length > 0 ? (
                  <>
                    <div className="sentiment-fill-pos" style={{ width: `${aiResult.positivePercent}%` }} title={`만족: ${aiResult.positivePercent}%`}></div>
                    <div className="sentiment-fill-neu" style={{ width: `${aiResult.neutralPercent}%` }} title={`보통: ${aiResult.neutralPercent}%`}></div>
                    <div className="sentiment-fill-neg" style={{ width: `${aiResult.negativePercent}%` }} title={`아쉬움: ${aiResult.negativePercent}%`}></div>
                  </>
                ) : (
                  <div className="sentiment-fill-empty"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 수동 분석 갱신 및 API 종류 표시 */}
        <div className="report-footer">
          {aiResult.isLocalFallback ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
              ⚡ 기본 분석 완료
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
              ⚡ Gemini AI 실시간 리포트
            </span>
          )}
          <button 
            onClick={() => updateAiReport(reviews)} 
            className="log-action-btn" 
            disabled={isAiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
          >
            <Sparkles size={12} />
            요약 갱신
          </button>
        </div>
      </section>

      {/* 3 & 4. Mid Section (2 Columns) */}
      <div className="mid-section-grid">
        
        {/* Left Column: Meal Input Zone */}
        <div className="mid-col-left">
          
          <section className="card operator-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Activity size={15} />
                급식 평가하기
              </h2>
              <span className="panel-status-tag">입력 가능</span>
            </div>

            {/* Today's menu listing */}
            <div className="operator-menu-section">
              <div className="sub-label">오늘의 급식 메뉴</div>
              <div className="operator-menu-grid">
                {TODAY_MENU.map((item, idx) => (
                  <div key={idx} className="operator-menu-item">
                    <span className="op-menu-indicator"></span>
                    <span className="op-menu-name">
                      <span style={{ marginRight: '0.35rem' }}>{getMenuEmoji(item.name)}</span>
                      {item.name}
                    </span>
                    <div className="op-menu-tags">
                      {item.tags.map((tag, tIdx) => (
                        <span key={tIdx} className={`op-tag ${item.tagTypes[tIdx] || ''}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review submit form */}
            <form className="operator-form" onSubmit={handleSubmit}>
              <div className="operator-form-grid">
                {/* 닉네임 입력 */}
                <div className="form-group">
                  <label htmlFor="nickname">학번 / 닉네임</label>
                  <input
                    type="text"
                    id="nickname"
                    className="form-control"
                    placeholder="예) 2학년5반짱, 급식킬러"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={15}
                  />
                </div>

                {/* 좋았던 메뉴 */}
                <div className="form-group">
                  <label>좋았던 메뉴</label>
                  <div className="menu-chip-group">
                    {TODAY_MENU.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`menu-chip ${bestMenu === item.name ? 'active' : ''}`}
                        onClick={() => setBestMenu(item.name)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 아쉬웠던 메뉴 */}
                <div className="form-group">
                  <label>아쉬웠던 메뉴</label>
                  <div className="menu-chip-group">
                    <button
                      type="button"
                      className={`menu-chip none-option ${worstMenu === "선택 안 함" ? 'active-worst' : ''}`}
                      onClick={() => setWorstMenu("선택 안 함")}
                    >
                      선택 안 함
                    </button>
                    {TODAY_MENU.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`menu-chip ${worstMenu === item.name ? 'active-worst' : ''}`}
                        onClick={() => setWorstMenu(item.name)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 별점 선택 */}
                <div className="form-group">
                  <label>오늘의 별점</label>
                  <div className="star-rating-box">
                    <div className="star-rating-container">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const starVal = idx + 1;
                        const isActive = starVal <= (hoverRating || rating);
                        return (
                          <button
                            type="button"
                            key={idx}
                            className={`star-button ${isActive ? 'active' : ''}`}
                            onClick={() => setRating(starVal)}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            aria-label={`별 ${starVal}개`}
                          >
                            <Star size={16} fill={isActive ? "var(--warning)" : "none"} />
                          </button>
                        );
                      })}
                    </div>
                    <span className="rating-text">({rating} / 5)</span>
                  </div>
                </div>
              </div>

              {/* 한줄평 입력 */}
              <div className="form-group">
                <label htmlFor="comment">한줄평</label>
                <textarea
                  id="comment"
                  className="form-control"
                  placeholder="예) 돈까스는 바삭했고, 김치찌개는 조금 짰어요."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={150}
                />
              </div>

              {formError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ⚠️ {formError}
                </div>
              )}

              {showSuccessMsg && (
                <div style={{ color: 'var(--mint)', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <CheckCircle2 size={13} /> 한줄평 제출 완료!
                </div>
              )}

              <button type="submit" className="submit-btn full-width">
                <CheckCircle2 size={16} />
                리뷰 제출 및 취향 분석하기
              </button>
            </form>
          </section>

          {/* 개인 급식 취향 타입 카드 */}
          {isTasteCardLoading && (
            <div className="card taste-card loading" style={{ padding: '1.5rem' }}>
              <div className="status-dot" style={{ margin: '0 auto 0.5rem' }}></div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                급식 MBTI 분석 중...
              </p>
            </div>
          )}

          {!isTasteCardLoading && personalTaste && (
            <section className="card taste-card personal-taste-card animated-fade-in">
              <span className="menu-tag healthy" style={{ position: 'absolute', top: '1rem', right: '1rem', fontWeight: 700, fontSize: '0.65rem', background: 'rgba(192, 132, 252, 0.15)', color: 'var(--purple)', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                {personalTaste.isLocalTaste ? "로컬 분석" : "Gemini AI 분석"}
              </span>

              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--purple)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⭐ 나의 급식 MBTI 카드
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                한줄평 피드백 성향을 즉석 분석한 카드입니다.
              </p>

              <div style={{ margin: '1.25rem 0', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  ✨ {personalTaste.typeName}
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-body)', fontStyle: 'italic', fontWeight: 600, margin: 0 }}>
                  "{personalTaste.oneLiner}"
                </p>
              </div>

              <div className="keyword-chips" style={{ justifyContent: 'center', gap: '0.35rem', margin: '1rem 0' }}>
                {personalTaste.tags.map((tag, idx) => (
                  <span key={idx} className="keyword-chip pos" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(192,132,252,0.1)', color: 'var(--purple)', borderColor: 'rgba(192,132,252,0.2)' }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px dashed var(--border)',
                fontSize: '0.75rem'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🤝 찰떡궁합 친구 타입:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  {personalTaste.friendMatch}
                </span>
              </div>
            </section>
          )}

        </div>

        {/* Right Column: Insight Strip */}
        <div className="mid-col-right">

          {/* 만족도 비율 */}
          <div className="card insight-widget">
            <div className="widget-header">
              <span className="widget-label">만족도 분석</span>
            </div>
            
            <div className="sentiment-section">
              <div className="stat-label-row">
                <span className="sentiment-label-pos">😊 만족 ({aiResult.positivePercent}%)</span>
                <span className="sentiment-label-neu">😐 보통 ({aiResult.neutralPercent}%)</span>
                <span className="sentiment-label-neg">😔 아쉬움 ({aiResult.negativePercent}%)</span>
              </div>
              <div className="sentiment-bar-track">
                {reviews.length > 0 ? (
                  <>
                    <div className="sentiment-fill-pos" style={{ width: `${aiResult.positivePercent}%` }} title={`만족: ${aiResult.positivePercent}%`}></div>
                    <div className="sentiment-fill-neu" style={{ width: `${aiResult.neutralPercent}%` }} title={`보통: ${aiResult.neutralPercent}%`}></div>
                    <div className="sentiment-fill-neg" style={{ width: `${aiResult.negativePercent}%` }} title={`아쉬움: ${aiResult.negativePercent}%`}></div>
                  </>
                ) : (
                  <div className="sentiment-fill-empty"></div>
                )}
              </div>
            </div>
          </div>

          {/* 메뉴 선호도 */}
          <div className="card insight-widget">
            <div className="widget-header">
              <span className="widget-label">메뉴 선호도</span>
            </div>

            {reviews.length > 0 ? (
              <div className="menu-preference-list">
                {TODAY_MENU.map((item, idx) => {
                  const bestVotes = aiResult.bestMenuVotes[item.name] || 0;
                  const worstVotes = aiResult.worstMenuVotes[item.name] || 0;

                  const bestPct = Math.round((bestVotes / reviews.length) * 100);
                  const worstPct = Math.round((worstVotes / reviews.length) * 100);
                  const isTopBest = item.name === aiResult.topBest && bestVotes > 0;
                  const isTopWorst = item.name === aiResult.topWorst && worstVotes > 0 && item.name !== "특별한 아쉬움 없음";

                  return (
                    <div key={idx} className={`preference-row ${isTopBest ? 'highlight-best' : ''} ${isTopWorst ? 'highlight-worst' : ''}`}>
                      <div className="pref-header">
                        <span className="pref-name">{item.name}</span>
                        <div className="pref-stats">
                          <span className="stat-recommend">추천 {bestVotes}표 · {bestPct}%</span>
                          <span className="stat-disappointed">아쉬움 {worstVotes}표 · {worstPct}%</span>
                        </div>
                      </div>
                      <div className="pref-bars">
                        <div className="pref-bar-track recommend-track">
                          <div className="pref-bar-fill recommend-fill" style={{ width: `${bestPct}%` }}></div>
                        </div>
                        <div className="pref-bar-track disappointed-track">
                          <div className="pref-bar-fill disappointed-fill" style={{ width: `${worstPct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="chart-empty">
                아직 리뷰가 없어요.
              </div>
            )}
          </div>

          {/* 반응 키워드 */}
          <div className="card insight-widget">
            <div className="widget-header">
              <span className="widget-label">주요 키워드</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--mint)', minWidth: '80px', flexShrink: 0 }}>🟢 긍정 반응:</span>
                <div className="keyword-chips">
                  {aiResult.posKeywords && aiResult.posKeywords.length > 0 ? (
                    aiResult.posKeywords.map((k, i) => (
                      <span key={i} className="keyword-chip pos">#{k}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>대기 중</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--danger)', minWidth: '80px', flexShrink: 0 }}>🔴 아쉬운 의견:</span>
                <div className="keyword-chips">
                  {aiResult.negKeywords && aiResult.negKeywords.length > 0 ? (
                    aiResult.negKeywords.map((k, i) => (
                      <span key={i} className="keyword-chip neg">#{k}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>대기 중</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. 실시간 리뷰 피드 */}
      <section className="card log-feed-card">
        <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
          <h2 className="panel-title">
            <MessageSquare size={15} />
            실시간 리뷰
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="log-action-btn" onClick={handleReset} title="초기 데이터 복원">
              <RotateCcw size={12} />
              샘플 복원
            </button>
            <button className="log-action-btn delete" onClick={handleClearAll} title="모두 지우기">
              모두 삭제
            </button>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="review-grid">
            {reviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-card-top">
                  <div className="review-author-group">
                    <div className="review-avatar">
                      {r.nickname ? r.nickname.charAt(0).toUpperCase() : '급'}
                    </div>
                    <div>
                      <div className="review-nickname">{r.nickname}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.date}</div>
                    </div>
                  </div>
                  <div className="review-stars">
                    {renderStarIcons(r.rating)}
                  </div>
                </div>

                <p className="review-comment">"{r.comment}"</p>

                <div className="review-menu-tags">
                  <div className="review-menu-tag-item best">
                    <span>👍 추천: <strong>{r.bestMenu}</strong></span>
                  </div>
                  {r.worstMenu && r.worstMenu !== '선택 안 함' && (
                    <div className="review-menu-tag-item worst">
                      <span>👎 아쉬움: <strong>{r.worstMenu}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="chart-empty" style={{ padding: '3rem' }}>
            등록된 리뷰가 없습니다. 첫 한줄평을 남겨보세요!
          </div>
        )}
      </section>

      {/* AI 설정 안내 모달 */}
      {isApiSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsApiSettingsOpen(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              ⚙️ Gemini AI 연결
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '1.25rem', lineHeight: 1.45 }}>
              이 사이트는 Vercel 서버에 저장된 환경변수로 Gemini AI를 자동 호출합니다. 방문자가 API 키를 입력하거나 볼 필요가 없습니다.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.9rem', background: 'rgba(14, 165, 233, 0.06)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: 1.5, margin: 0 }}>
                  Vercel 프로젝트의 Environment Variables에 <strong>GEMINI_API_KEY</strong>가 설정되어 있으면 Gemini AI 리포트가 자동으로 생성됩니다. 설정 전에는 기본 로컬 분석으로 표시됩니다.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="submit-btn"
                onClick={() => setIsApiSettingsOpen(false)}
                style={{ padding: '0.4rem 1.2rem', fontSize: '0.9rem' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="app-footer">
        <p>© 2026 MealMood AI • 오늘급식 인사이트</p>
      </footer>
    </div>
  );
}

export default App;
