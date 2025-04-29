import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'node:fs';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		https: {
			key: fs.readFileSync(`${__dirname}/cert/localhost.key`),
			cert: fs.readFileSync(`${__dirname}/cert/localhost.crt`)
		}
	}
});
