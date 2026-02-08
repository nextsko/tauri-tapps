import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/prompt',
    },
    {
      path: '/prompt',
      name: 'Prompt',
      component: () => import('../views/PromptView.vue'),
    },
    {
      path: '/agent-hub',
      name: 'AgentHub',
      component: () => import('../views/AgentHubView.vue'),
    },
    {
      path: '/translate',
      name: 'Translate',
      component: () => import('../views/TranslateView.vue'),
    },
    {
      path: '/llm-demo',
      name: 'LLMDemo',
      component: () => import('../views/LLMDemoView.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue'),
    },
        {
      path: '/emoji',
      name: 'Smoji',
      component: () => import('../views/EmojiView.vue'),
    },
    {
      path: '/web-chat',
      name: 'WebChat',
      component: () => import('../views/WebChatView.vue'),
    },
  ],
});

export default router;
