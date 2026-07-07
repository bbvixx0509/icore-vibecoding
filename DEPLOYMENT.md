# 무료 배포 안내

이 프로젝트는 Vite + React 정적 웹앱입니다. 서버나 데이터베이스 없이 브라우저의 `localStorage`를 사용하므로 Vercel, Netlify, GitHub Pages 같은 무료 정적 호스팅에 올려서 링크로 공유할 수 있습니다.

## 추천: Vercel

1. GitHub에 이 폴더를 새 저장소로 올립니다.
2. Vercel에서 `Add New > Project`를 누르고 GitHub 저장소를 선택합니다.
3. Framework Preset은 `Vite`로 두면 됩니다.
4. 설정값은 이 저장소의 `vercel.json`이 지정합니다.
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. `Deploy`를 누르면 공개 URL이 생성됩니다.

## 대안: Netlify

1. GitHub에 이 폴더를 새 저장소로 올립니다.
2. Netlify에서 `Add new project`를 누르고 GitHub 저장소를 선택합니다.
3. 설정값은 이 저장소의 `netlify.toml`이 지정합니다.
   - Build command: `npm run build`
   - Publish directory: `dist`
4. 배포가 끝나면 공개 URL이 생성됩니다.

## 주의할 점

- Gemini API Key는 코드에 넣지 말고 Vercel 프로젝트의 환경변수에 저장하세요.
  - Name: `GEMINI_API_KEY`
  - Value: 본인의 Google Gemini API Key
  - Environments: Production, Preview, Development 모두 선택
- 환경변수를 추가하거나 바꾼 뒤에는 Vercel에서 `Redeploy`를 눌러야 새 배포에 적용됩니다.
- 지금 앱 데이터는 각 사용자의 브라우저에 따로 저장됩니다. 여러 사람이 같은 리뷰 데이터를 함께 보게 하려면 나중에 Firebase/Supabase 같은 외부 데이터베이스가 필요합니다.
- 로컬 Windows의 한글/공백 경로에서는 Vite 8 빌드가 실패할 수 있습니다. 실제 배포 서버와 ASCII 경로 테스트에서는 빌드가 정상 통과했습니다.
