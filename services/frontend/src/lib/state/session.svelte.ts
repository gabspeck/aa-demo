import type { WebAuthnP256SimpleAccountImplementation } from '$lib/account';
import { browser } from '$app/environment';

export type Session = {
	account: WebAuthnP256SimpleAccountImplementation;
};

let session: Session | null = $state(null);

export function setSession(s: Session | null) {
	if (browser) {
		if (s) {
			window.localStorage.setItem('session', JSON.stringify(s));
		} else {
			window.localStorage.removeItem('session');
		}
	}
	session = s;
}

export function getSession(): Session | null {
	if (browser && !session) {
		const cachedSession = window.localStorage.getItem('session')
		session =  cachedSession ? JSON.parse(cachedSession) : null;
	}
	return session;
}
