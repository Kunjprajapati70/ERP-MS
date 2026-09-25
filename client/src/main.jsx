import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import AuthBootstrap from './components/AuthBootstrap';
import { store } from './redux/store';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <CssBaseline />
        <BrowserRouter>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="colored"
          />
        </BrowserRouter>
      </ThemeModeProvider>
    </Provider>
  </React.StrictMode>
);
