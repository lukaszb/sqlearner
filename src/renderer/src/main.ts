import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles.css'
import { sessionEventsPlugin } from './session-events'

createApp(App).use(createPinia().use(sessionEventsPlugin)).mount('#app')
