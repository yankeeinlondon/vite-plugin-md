<script setup lang="ts">
const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <button class="flex btn py-0.5 text-xs" @click="toggleDark()">
    <i class="inline-block align-middle" i="dark:carbon-moon carbon-sun" />

    <span class="ml-1">{{ isDark ? 'Dark' : 'Light' }}</span>
  </button>
</template>
