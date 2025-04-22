export type Session = {
	signedIn: boolean
	credentialId: string;
};

export const sessionState: Session = $state({signedIn: false, credentialId: ''});
