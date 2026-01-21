import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import da from 'element-plus/es/locale/lang/da'
import App from './App.vue'
import router from './router'
import './assets/scss/main.scss'
import 'overlayscrollbars/overlayscrollbars.css'

const app = createApp(App)

app.use(ElementPlus, { locale: da })
app.use(router)
app.mount('#app')
