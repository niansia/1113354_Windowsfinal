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
import './styles/fusionAssistant.css'
import './styles/fusionStyleStudio.css'
import './styles/engineeringMath.css'
import './styles/fusionDevelopmentLab.css'
import './styles/fusionSportsCenter.css'
import './styles/fusionPoetryCloud.css'
import './styles/fusionMedicalHub.css'
import './styles/fusionSignalForge.css'
import './styles/fusionNeuroFlow.css'
import './styles/fusionNotebook.css'
import './styles/fusionLegalNavigator.css'
import { SettingsProvider } from './state/SettingsContext'
import { I18nProvider } from './i18n/I18nContext'
import { AccountProvider } from './account/AccountContext'
import { AgendaProvider } from './state/AgendaContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <AccountProvider>
          <AgendaProvider>
            <App />
          </AgendaProvider>
        </AccountProvider>
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
