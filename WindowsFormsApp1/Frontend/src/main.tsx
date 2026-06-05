import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/spatialHome.css'
import './styles/fusionSettings.css'
import './styles/bootSequence.css'
import './styles/fusionLogin.css'
import './styles/fusionApps.css'
import './styles/fusionCircuit.css'
import { SettingsProvider } from './state/SettingsContext'
import { I18nProvider } from './i18n/I18nContext'
import { AccountProvider } from './account/AccountContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <AccountProvider>
          <App />
        </AccountProvider>
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
