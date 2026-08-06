import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT,
    allowedHosts: [
      'clayforge-jar-project.onrender.com'
    ]
  }
});