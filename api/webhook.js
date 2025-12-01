export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const update = req.body;
    
    // Extract token from query parameter
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required in query' });
    }
    
    console.log('Webhook received:', JSON.stringify(update, null, 2));
    
    // Handle message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text;
      const userId = msg.from.id;
      const userName = msg.from.first_name || msg.from.username || 'User';
      
      // Log the message
      console.log(`New message from ${userName} (${userId}): ${text}`);
      
      // You can store this in your database here
      // For demo, just log it
      
      // Auto-reply example
      if (text && (text.toLowerCase().includes('hi') || text.toLowerCase().includes('hello'))) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Hello ${userName}! 👋\nI received your message.`
          })
        });
      }
    }
    
    return res.json({ ok: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
