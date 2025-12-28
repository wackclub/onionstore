class SymmetricEncryption {
	private readonly algorithm = 'AES-GCM';
	private readonly keyLength = 256;
	private readonly ivLength = 12;
	private readonly saltLength = 16;

	private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			{ name: 'PBKDF2' },
			false,
			['deriveBits', 'deriveKey']
		);

		return crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256'
			},
			keyMaterial,
			{ name: this.algorithm, length: this.keyLength },
			false,
			['encrypt', 'decrypt']
		);
	}

	async encrypt(plaintext: string, password: string): Promise<string> {
		if (!plaintext || typeof plaintext !== 'string') {
			throw new Error('Invalid input: plaintext must be a non-empty string');
		}
		if (!password || typeof password !== 'string') {
			throw new Error('Invalid input: password must be a non-empty string');
		}

		const encoder = new TextEncoder();
		const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
		const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
		const key = await this.deriveKey(password, salt);

		const encryptedData = await crypto.subtle.encrypt(
			{ name: this.algorithm, iv },
			key,
			encoder.encode(plaintext)
		);

		const combined = new Uint8Array(this.saltLength + this.ivLength + encryptedData.byteLength);
		combined.set(salt);
		combined.set(iv, this.saltLength);
		combined.set(new Uint8Array(encryptedData), this.saltLength + this.ivLength);

		return btoa(String.fromCharCode(...combined));
	}

	async decrypt(encryptedData: string, password: string): Promise<string> {
		if (!encryptedData || typeof encryptedData !== 'string') {
			throw new Error('Invalid input: encryptedData must be a non-empty string');
		}
		if (!password || typeof password !== 'string') {
			throw new Error('Invalid input: password must be a non-empty string');
		}

		let combined: Uint8Array;
		try {
			const binaryString = atob(encryptedData);
			combined = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				combined[i] = binaryString.charCodeAt(i);
			}
		} catch {
			throw new Error('Invalid encrypted data format: not valid base64');
		}

		const minLength = this.saltLength + this.ivLength + 1;
		if (combined.length < minLength) {
			throw new Error('Invalid encrypted data: data too short');
		}

		const salt = combined.slice(0, this.saltLength);
		const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
		const encrypted = combined.slice(this.saltLength + this.ivLength);
		const key = await this.deriveKey(password, salt);

		try {
			const decryptedData = await crypto.subtle.decrypt(
				{ name: this.algorithm, iv },
				key,
				encrypted
			);
			return new TextDecoder().decode(decryptedData);
		} catch {
			throw new Error('Decryption failed: invalid password or corrupted data');
		}
	}
}

export const symmetric = new SymmetricEncryption();
