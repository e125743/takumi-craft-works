import './App.css';
import {BrowserRouter, Route, Routes, Link} from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Home } from './pages/index';
import { Header } from './components';
import Loading from './components/Loading';

// ShowMaciene は firebase / pica / jszip / file-saver を取り込む重い画面。
// 着地ページ (Home) のバンドルから切り離すため遅延読込にする（default export を利用）。
const ShowMaciene = lazy(() => import('./pages/ShowMaciene'));

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={<Loading width={'300'} />}>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/showmaciene" element={<ShowMaciene/>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
