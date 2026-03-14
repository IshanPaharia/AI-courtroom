import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/react';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import NewCasePage from './pages/NewCasePage';
import CourtroomPage from './pages/CourtroomPage';
import VerdictPage from './pages/VerdictPage';
import JoinCasePage from './pages/JoinCasePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

function SignInPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignIn routing="path" path="/sign-in" forceRedirectUrl={redirectUrl} />
    </div>
  );
}

function SignUpPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignUp routing="path" path="/sign-up" forceRedirectUrl={redirectUrl} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/new-case" element={<NewCasePage />} />
            <Route path="/case/:caseId" element={<CourtroomPage />} />
            <Route path="/case/:caseId/verdict" element={<VerdictPage />} />
            <Route path="/join/:inviteCode" element={<JoinCasePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
