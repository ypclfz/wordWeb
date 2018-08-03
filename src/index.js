import React from 'react';
import ReactDOM from 'react-dom';
import App from '@/App.jsx';
import { initializeIcons } from '@uifabric/icons';

let isOfficeInitialized = false;
initializeIcons();

const title = 'intelligent-retrieval';

const render = (Component) => {
  ReactDOM.render(
    <Component isOfficeInitialized={isOfficeInitialized} />,
    document.getElementById('app')
  );
};

// Render application after Office initializes
Office.initialize = () => {
    isOfficeInitialized = true;
    render(App);
};

/* Initial render showing a progress bar */
render(App);

// if ((module as any).hot) {
//     (module as any).hot.accept('./App', () => {
//         const NextApp = require('./App').default;
//         render(NextApp);
//     });
// }
