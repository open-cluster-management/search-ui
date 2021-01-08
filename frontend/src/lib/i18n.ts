/* istanbul ignore file */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpApi from 'i18next-http-backend'

// Note: language gets cached in localstorage - can remove in dev tools Application-> localStorage-> delete i18nextLng

i18n.use(initReactI18next)
    .use(LanguageDetector)
    .use(HttpApi)
    .init({
        backend: {
            loadPath: '/search/locales/{{lng}}/{{ns}}.json',
        },

        keySeparator: false, // this repo will use single level json

        interpolation: {
            escapeValue: false, // react handles this already
        },

        defaultNS: 'search', // the default file for strings when using useTranslation, etc

        supportedLngs: ['en', 'fr'], // only languages from this array will attempt to be loaded
        nonExplicitSupportedLngs: false, // allows for example en-US/en-UK to be supported when en is supported
        fallbackLng: ['en'], // if language is not supported or string is missing, fallback to English
    })

export default i18n
