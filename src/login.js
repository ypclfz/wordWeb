import React from 'react';
import ReactDOM from 'react-dom';
import Login from '@/components/page/Login.jsx';
import { initializeIcons } from '@uifabric/icons';
initializeIcons();
ReactDOM.render(<Login />, document.getElementById('login'))
