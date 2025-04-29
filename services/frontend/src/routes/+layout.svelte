<script lang="ts">
	import '../app.css';

	let { children } = $props();

</script>

<div class="h-screen flex justify-center items-center p-4 dark bg-surface-50 text-primary-950-50">
	<div class="card p-4 w-full max-w-sm shadow-xl min-h-[500px] flex flex-col border-4">
			{@render children()}
	</div>
</div>
