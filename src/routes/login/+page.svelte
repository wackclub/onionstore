<script lang="ts">
	import { env } from '$env/dynamic/public';

	const HACKCLUB_CLIENT_ID = env.PUBLIC_HACKCLUB_CLIENT_ID || 'your_client_id_here';
	const HACKCLUB_REDIRECT_URI = env.PUBLIC_HACKCLUB_REDIRECT_URI || 'http://localhost:5173/api/auth/callback';

	// Construct OAuth URL
	const authUrl = new URL('https://auth.hackclub.com/oauth/authorize');
	authUrl.searchParams.set('client_id', HACKCLUB_CLIENT_ID);
	authUrl.searchParams.set('redirect_uri', HACKCLUB_REDIRECT_URI);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', 'openid profile email name slack_id verification_status');

	function handleLogin() {
		window.location.href = authUrl.toString();
	}
</script>

<div class="flex min-h-[80vh] items-center justify-center">
	<div class="retro-panel w-full max-w-md">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="retro-title text-2xl">Welcome to Boba Olympics!</h1>
				<p class="retro-subtitle mt-2">Use the same email you used to submit your projects.</p>
			</div>

			<div class="flex flex-col gap-4">
				<div class="border-coffee-400 bg-cream-100 border-2 p-6 text-center">
					<div class="mb-4">
						<svg class="mx-auto h-16 w-16" viewBox="0 0 256 256" fill="none">
							<rect width="256" height="256" rx="50" fill="#EC3750"/>
							<path d="M140 80L140 176M116 80L116 176M92 80L92 176M68 80L68 176" stroke="white" stroke-width="16" stroke-linecap="round"/>
							<path d="M188 80L188 176M164 80L164 176" stroke="white" stroke-width="16" stroke-linecap="round" opacity="0.7"/>
						</svg>
					</div>
					<p class="text-coffee-700 mb-6 text-sm font-bold uppercase">
						Sign in with your Hack Club account
					</p>
					<button
						onclick={handleLogin}
						class="retro-btn w-full"
					>
						[SIGN IN WITH HACK CLUB]
					</button>
				</div>

				<div class="border-coffee-400 border-t-2 border-dashed pt-4">
					<p class="text-coffee-500 text-center text-xs">
						&gt; SECURE AUTHENTICATION VIA HACK CLUB AUTH_
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
