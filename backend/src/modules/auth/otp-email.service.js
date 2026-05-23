const maskReceiver = (receiver = '') => {
  const value = String(receiver);

  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

const sendVerificationCode = async ({ channel, receiver, code }) => {
  // Mock integration point for SMS/email providers. The code is logged in development for demo/testing.
  console.info(`[OTP/${channel}] Send ${code} to ${maskReceiver(receiver)}`);

  return {
    provider: 'MOCK_OTP_EMAIL',
    sent: true
  };
};

module.exports = {
  sendVerificationCode,
  maskReceiver
};
