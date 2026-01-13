import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.js.dev/config/
export default defineConfig({
  // 关键：添加这一行，确保打包后的资源路径指向你的仓库名
  base: '/AgGaS2-Lab/', 
  plugins: [react()],
})