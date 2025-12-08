<template>
  <div class="prompt-tool">
    <div class="header">
      <h1>Prompt 管理工具</h1>
      <p>轻松管理你的提示词，让创作更高效。</p>
    </div>

    <div class="main-content">
      <n-card class="prompt-form-card">
        <n-form
          ref="formRef"
          :model="newPrompt"
          :rules="rules"
          label-placement="left"
          label-width="80"
        >
          <n-form-item label="标题" path="title">
            <n-input v-model:value="newPrompt.title" placeholder="请输入标题" />
          </n-form-item>
          <n-form-item label="提示词" path="content">
            <n-input
              v-model:value="newPrompt.content"
              type="textarea"
              placeholder="请输入提示词内容"
              :autosize="{ minRows: 3, maxRows: 10 }"
            />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="handleSavePrompt">
              {{ isEditing ? '保存修改' : '添加提示词' }}
            </n-button>
            <n-button type="primary" @click="handleSavePromptToJSON">
              保存到本地
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <n-card class="prompt-list-card">
        <template #header>
          <div class="card-header-actions">
            <span class="card-title">我的提示词</span>
            <div class="action-buttons">
              <n-button @click="handleExport" size="small">导出</n-button>
              <n-button @click="handleImport" size="small">导入</n-button>
            </div>
          </div>
        </template>

        <div class="prompt-list-container">
          <draggable v-model="prompts" item-key="id" @change="onDragChange">
            <template #item="{ element: prompt }">
              <n-list bordered class="draggable-list">
                <n-list-item @dblclick="copyToClipboard(prompt.content)">
                  <div class="list-item-content">
                    <div class="prompt-info">
                      <n-h3>{{ prompt.title }}</n-h3>
                      <n-p class="prompt-content-text">{{ prompt.content }}</n-p>
                    </div>
                    <div class="actions">
                      <n-button type="info" size="small" @click="handleEdit(prompt)">
                        编辑
                      </n-button>
                      <n-button type="error" size="small" @click="handleDelete(prompt.id)">
                        删除
                      </n-button>
                    </div>
                  </div>
                </n-list-item>
              </n-list>
            </template>
          </draggable>
        </div>
        <div v-if="prompts.length === 0" class="no-data">
          <n-empty description="暂无提示词，快来添加一个吧！" />
        </div>
      </n-card>
    </div>

    <input
      type="file"
      ref="fileInputRef"
      style="display: none"
      @change="onFileSelected"
      accept=".json"
    />
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { v4 as uuidv4 } from 'uuid';
import { onMounted, reactive, ref } from 'vue';
import draggable from 'vuedraggable';
import { saveJSON, loadJSON } from '../utils/storage';

interface Prompt {
  id: string;
  title: string;
  content: string;
}

const message = useMessage();
const formRef = ref<any>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const newPrompt = reactive({
  id: '',
  title: '',
  content: '',
});

const prompts = ref<Prompt[]>([]);
const isEditing = ref(false);

const PROMPTS_FILE = 'prompts.json';

const rules = {
  title: {
    required: true,
    message: '请输入标题',
    trigger: ['blur', 'input'],
  },
  content: {
    required: true,
    message: '请输入提示词内容',
    trigger: ['blur', 'input'],
  },
};

const loadPrompts = async () => {
  try {
    const data = await loadJSON(PROMPTS_FILE);
    if (Array.isArray(data)) {
      prompts.value = data;
    }
  } catch (e) {
    console.log('No saved prompts found, starting with empty list');
    prompts.value = [];
  }
};

const savePrompts = async () => {
  try {
    await saveJSON(PROMPTS_FILE, prompts.value);
  } catch (e) {
    console.error('Failed to save prompts:', e);
    message.error('保存失败');
  }
};

const resetForm = () => {
  newPrompt.id = '';
  newPrompt.title = '';
  newPrompt.content = '';
  isEditing.value = false;
};

const handleSavePrompt = async (e: MouseEvent) => {
  e.preventDefault();
  formRef.value?.validate(async (errors: any) => {
    if (!errors) {
      if (isEditing.value) {
        const index = prompts.value.findIndex((p) => p.id === newPrompt.id);
        if (index !== -1) {
          prompts.value[index] = { ...newPrompt };
          message.success('提示词修改成功！');
        }
      } else {
        const newId = uuidv4();
        prompts.value.push({ ...newPrompt, id: newId });
        message.success('提示词添加成功！');
      }
      await savePrompts();
      resetForm();
    } else {
      message.error('请填写完整信息。');
    }
  });
};

const handleSavePromptToJSON = async (e: MouseEvent) => {
  e.preventDefault();
  try {
    await saveJSON('prompt-export.json', prompts.value);
    message.success('已保存到本地配置目录');
  } catch (error) {
    message.error('保存失败');
  }
};

const handleEdit = (prompt: Prompt) => {
  newPrompt.id = prompt.id;
  newPrompt.title = prompt.title;
  newPrompt.content = prompt.content;
  isEditing.value = true;
};

const handleDelete = async (id: string) => {
  const index = prompts.value.findIndex((p) => p.id === id);
  if (index !== -1) {
    prompts.value.splice(index, 1);
    await savePrompts();
    message.success('提示词已删除！');
    if (newPrompt.id === id) {
      resetForm();
    }
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('复制成功！');
  } catch (err) {
    message.error('复制失败，请手动复制。');
    console.error('Failed to copy: ', err);
  }
};

const handleExport = () => {
  if (prompts.value.length === 0) {
    message.warning('没有提示词可以导出。');
    return;
  }
  const dataStr = JSON.stringify(prompts.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompts_export_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('提示词已成功导出为 JSON 文件！');
};

const handleImport = () => {
  fileInputRef.value?.click();
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedData = JSON.parse(e.target?.result as string);
      if (Array.isArray(importedData)) {
        prompts.value = importedData;
        await savePrompts();
        message.success('提示词已成功导入！');
      } else {
        message.error('导入文件格式不正确，请选择有效的 JSON 文件。');
      }
    } catch (error) {
      message.error('导入失败，文件内容有误。');
      console.error('Import failed:', error);
    }
  };
  reader.readAsText(file);
  target.value = '';
};

const onDragChange = async () => {
  await savePrompts();
};

onMounted(async () => {
  await loadPrompts();
});
</script>

<style scoped>
.prompt-tool {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin: 0;
}

.header p {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin-top: 8px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  width: 100%;
  max-width: 900px;
}

@media (min-width: 768px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }
}

.prompt-form-card,
.prompt-list-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.n-card {
  background-color: #ffffff;
}

.prompt-list-card {
  display: flex;
  flex-direction: column;
}

.card-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.card-title {
  font-size: 1rem;
  font-weight: 500;
  color: #2c3e50;
}

.prompt-list-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;
}

.draggable-list {
  margin-bottom: 10px;
  cursor: grab;
  border-radius: 8px;
}

.draggable-list:active {
  cursor: grabbing;
}

.draggable-list:last-child {
  margin-bottom: 0;
}

.list-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.prompt-info {
  flex-grow: 1;
  padding-right: 20px;
}

.prompt-content-text {
  color: #555;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.actions {
  display: flex;
  gap: 10px;
}

.n-button {
  border-radius: 8px;
}

.no-data {
  padding: 20px;
  text-align: center;
}
</style>
