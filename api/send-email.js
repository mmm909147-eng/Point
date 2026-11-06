export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_9g1tr6p',
          template_id: 'template_7z54i09',
          user_id: process.env.PUBLIC_KEY,
          template_params: req.body
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
