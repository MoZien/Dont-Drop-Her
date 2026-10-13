import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',timeout:180_000,expect:{timeout:12_000},workers:1,
  use:{baseURL:process.env.GAME_URL||'http://127.0.0.1:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
  reporter:[['list'],['html',{open:'never'}]],
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:'chromium',launchOptions:{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}}},
    {name:'mobile-webkit',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}}],
  webServer:process.env.GAME_URL?undefined:{command:'npm start',url:'http://127.0.0.1:3000/health',reuseExistingServer:!process.env.CI,timeout:30000},
});
