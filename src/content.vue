<template></template>

<script lang="ts">
import { useMessage } from 'naive-ui'
import { defineComponent } from 'vue'

// content
export default defineComponent({
    setup() {
        const message = useMessage()
        return {
            warning() {
                message.warning('...')
            }
        }
    }
})
</script>