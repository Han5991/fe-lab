<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../styles/globals.css';

  const { children }: { children: Snippet } = $props();
</script>

{@render children()}
