import { LOOPS_API_KEY, LOOPS_LOGIN_TEMPLATE_ID } from '$env/static/private';

interface SendLoginEmailParams {
	email: string;
	loginUrl: string;
}

export async function sendLoginEmail({ email, loginUrl }: SendLoginEmailParams): Promise<boolean> {
	try {
		const response = await fetch('https://app.loops.so/api/v1/transactional', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LOOPS_API_KEY}`
			},
			body: JSON.stringify({
				email,
				transactionalId: LOOPS_LOGIN_TEMPLATE_ID,
				dataVariables: {
					loginUrl
				}
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Failed to send login email:', errorData);
			return false;
		}

		const result = await response.json();
		return result.success === true;
	} catch (error) {
		console.error('Error sending login email:', error);
		return false;
	}
}
