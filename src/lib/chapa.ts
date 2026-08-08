const CHAPA_BASE = 'https://api.chapa.co/v1';

export async function testCredentials(secretKey: string): Promise<boolean> {
  const res = await fetch(`${CHAPA_BASE}/banks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
  });
  return res.status === 200;
}

export async function initializePayment(secretKey: string, payload: {
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  tx_ref: string;
  callback_url: string;
  return_url: string;
  customization: { title: string; description: string };
}): Promise<{ checkout_url: string }> {
  const res = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as any;

  if (res.status !== 200) {
    throw new Error(`Chapa initialize payment failed: ${data?.message || res.statusText}`);
  }

  return { checkout_url: data.data.checkout_url };
}

export async function verifyPayment(
  secretKey: string,
  txRef: string
): Promise<{ status: string; amount: number; currency: string }> {
  const res = await fetch(`${CHAPA_BASE}/transaction/verify/${txRef}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
  });

  const data = await res.json() as any;

  if (res.status !== 200) {
    throw new Error(`Chapa verify payment failed: ${data?.message || res.statusText}`);
  }

  return data.data;
}