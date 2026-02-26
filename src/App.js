import logo from './logo.svg';
import './App.css';
import {BrowserRouter, Route, Routes, Link} from 'react-router-dom';
import { ShowMaciene, Home } from './pages/index';
import { Header } from './components';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/showmaciene" element={<ShowMaciene/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
