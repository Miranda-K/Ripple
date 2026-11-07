import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Card } from './components/ui/Card';
import { EmptyState } from './components/ui/misc';
import { Button } from './components/ui/Button';
import { useRippleStore } from './store/useRippleStore';
import { DEMO_MODE } from './lib/config';
import Overview from './pages/Overview';
import Residents from './pages/Residents';
import ResidentProfile from './pages/ResidentProfile';
import PatternExplorer from './pages/PatternExplorer';
import Assessments from './pages/Assessments';
import AssessmentDetail from './pages/AssessmentDetail';
import CareNotes from './pages/CareNotes';
import Alerts from './pages/Alerts';
import DemoControls from './pages/DemoControls';
import NotFound from './pages/NotFound';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Ripple UI error', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl p-8">
        <Card>
          <EmptyState
            title="Something went wrong on this screen"
            body="Your demo data is stored locally. Resetting the synthetic dataset usually fixes this."
            action={
              <Button
                onClick={() => {
                  useRippleStore.getState().reset();
                  this.setState({ error: null });
                  window.location.assign('/');
                }}
              >
                Reset demo data
              </Button>
            }
          />
        </Card>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="residents" element={<Residents />} />
          <Route path="residents/:id" element={<ResidentProfile />} />
          <Route path="patterns" element={<PatternExplorer />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="assessments/:id" element={<AssessmentDetail />} />
          <Route path="notes" element={<CareNotes />} />
          <Route path="alerts" element={<Alerts />} />
          {DEMO_MODE && <Route path="demo" element={<DemoControls />} />}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
